const { Resend } = require('resend');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const resendApiKey = process.env.RESEND_API_KEY;
let resend = null;

if (resendApiKey) {
  console.log(`[Email Service Startup] RESEND_API_KEY is loaded. Initializing Resend client...`);
  resend = new Resend(resendApiKey);
} else {
  console.error('[Email Service Startup] ERROR: RESEND_API_KEY is not set in environment. Production emails will fail.');
}

/**
 * Common helper to dispatch email via Resend API
 * @param {Object} options - Email options (from, to, subject, html, text)
 * @returns {Promise<Object>} - Resend send result
 */
async function sendMailViaResend({ from, to, subject, html, text }) {
  if (!resend) {
    throw new Error('Resend API key is not configured. Email transmission failed.');
  }

  console.log(`Resend: Dispatching email to: ${Array.isArray(to) ? to.join(', ') : to} from: ${from}`);
  
  // Resend API expects to to be an array of strings or a single string
  const toList = Array.isArray(to) ? to : [to];

  const { data, error } = await resend.emails.send({
    from,
    to: toList,
    subject,
    html,
    text
  });

  if (error) {
    console.error('❌ Resend API Error:', error);
    throw new Error(error.message || 'Unknown Resend API error');
  }

  console.log('✅ Resend API send successful:', data);
  return data;
}

/**
 * Sends alert notification email to Client and Admin
 * @param {Object} device - Device DB record details
 * @param {Object} alert - Alert details (message, severity, metric_name, metric_value, threshold_value)
 * @returns {Promise<boolean>} - True if email sent successfully, false otherwise
 */
async function sendAlertEmail(device, alert) {
  try {
    let sendAdmin = true;
    let sendClient = true;
    let adminEmail = process.env.ADMIN_EMAIL;

    try {
      const { pool } = require('../db');
      const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
      if (rows.length > 0) {
        const config = {};
        rows.forEach(row => {
          config[row.setting_key] = row.setting_value;
        });
        if (config.send_admin_emails !== undefined) sendAdmin = config.send_admin_emails === 'true';
        if (config.send_client_emails !== undefined) sendClient = config.send_client_emails === 'true';
        if (config.admin_email !== undefined) adminEmail = config.admin_email;
      }
    } catch (dbErr) {
      console.warn('EmailService: Failed to query settings from DB, falling back to ENV/Defaults:', dbErr.message);
    }

    const severityColorMap = {
      'Critical': '#ef4444',
      'High': '#f97316',
      'Medium': '#eab308',
      'Low': '#3b82f6'
    };
    const severityColor = severityColorMap[alert.severity] || '#6b7280';
    const severityLabel = alert.severity ? alert.severity.toUpperCase() : 'WARNING';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>IoT Device Alert</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; }
          .container { max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; margin: 0 auto; }
          .header { background-color: ${severityColor}; color: #ffffff; padding: 20px; text-align: center; }
          .header h2 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 25px; }
          .alert-box { background-color: #fffaf0; border-left: 4px solid ${severityColor}; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
          .alert-box p { margin: 0; font-size: 15px; font-weight: bold; color: #2d3748; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          td { padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; }
          .label { font-weight: bold; color: #4a5568; width: 40%; }
          .value { color: #2d3748; }
          .footer { background-color: #edf2f7; color: #718096; text-align: center; padding: 15px; font-size: 13px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚨 IoT Device Alert - ${severityLabel}</h2>
          </div>
          <div class="content">
            <div class="alert-box">
              <p>${alert.message}</p>
            </div>
            <table>
              <tr><td class="label">Client Name</td><td class="value">${device.client_name || 'N/A'}</td></tr>
              <tr><td class="label">Project Name</td><td class="value">${device.project_name || 'N/A'}</td></tr>
              <tr><td class="label">Device Name</td><td class="value">${device.device_name}</td></tr>
              <tr><td class="label">Device ID</td><td class="value">${device.device_code}</td></tr>
              <tr><td class="label">Sensor Category</td><td class="value">${device.sensor_type || 'N/A'}</td></tr>
              <tr><td class="label">Metric Name</td><td class="value">${alert.metric_name}</td></tr>
              <tr><td class="label">Current Value</td><td class="value" style="color: ${severityColor}; font-weight: bold;">${alert.metric_value}</td></tr>
              <tr><td class="label">Threshold Value</td><td class="value">${alert.threshold_value}</td></tr>
              <tr><td class="label">Severity</td><td class="value" style="color: ${severityColor}; font-weight: bold;">${alert.severity}</td></tr>
              <tr><td class="label">Timestamp</td><td class="value">${new Date().toLocaleString()}</td></tr>
            </table>
          </div>
          <div class="footer">IoT Monitoring System</div>
        </div>
      </body>
      </html>
    `;

    // Resend free tier sandbox must use 'onboarding@resend.dev'
    const fromAddress = 'IoT Monitoring System <onboarding@resend.dev>';
    let atLeastOneSent = false;
    let errors = [];

    // Send to Admin (always required for all alerts)
    const adminEmailTarget = adminEmail || process.env.ADMIN_EMAIL || 'mdkaisarmdkaisar933@gmail.com';
    try {
      console.log(`EmailService: Dispatching admin alert email to: ${adminEmailTarget}`);
      await sendMailViaResend({
        from: fromAddress,
        to: adminEmailTarget,
        subject: `🚨 IoT Device Alert - ${device.device_name}`,
        html: htmlContent
      });
      atLeastOneSent = true;
    } catch (err) {
      console.error(`EmailService: Failed to send alert email to admin (${adminEmailTarget}):`, err.message);
      errors.push(`Admin email error: ${err.message}`);
    }

    // Send to Client if enabled
    if (sendClient && device.alert_enabled && device.client_email) {
      try {
        console.log(`EmailService: Dispatching client alert email to: ${device.client_email}`);
        await sendMailViaResend({
          from: fromAddress,
          to: device.client_email,
          subject: `🚨 IoT Device Alert - ${device.device_name}`,
          html: htmlContent
        });
        atLeastOneSent = true;
      } catch (err) {
        console.error(`EmailService: Failed to send alert email to client (${device.client_email}):`, err.message);
        errors.push(`Client email error: ${err.message}`);
      }
    }

    if (errors.length > 0 && !atLeastOneSent) {
      throw new Error(`Failed to send alert emails: ${errors.join('; ')}`);
    }

    return atLeastOneSent;
  } catch (err) {
    console.error('EmailService sendAlertEmail error:', err.message);
    return false;
  }
}

/**
 * Sends a test email to verify SMTP configuration
 * @param {string} [targetEmail] - Optional target email address, otherwise reads from settings
 * @returns {Promise<Object>}
 */
async function sendTestEmail(targetEmail) {
  let adminEmail = targetEmail;
  if (!adminEmail) {
    try {
      const { pool } = require('../db');
      const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = "admin_email"');
      if (rows.length > 0) {
        adminEmail = rows[0].setting_value;
      }
    } catch (err) {}
  }
  if (!adminEmail) {
    adminEmail = process.env.ADMIN_EMAIL || 'mohammadkaisar933@gmail.com';
  }

  const fromAddress = 'IoT Monitoring System - Test <onboarding@resend.dev>';
  
  console.log(`EmailService: Dispatching Resend test email to: ${adminEmail}`);
  const info = await sendMailViaResend({
    from: fromAddress,
    to: adminEmail,
    subject: '🧪 IoT Monitoring System - Resend API Test Email',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6; border-bottom: 1px solid #edf2f7; padding-bottom: 10px;">🧪 Resend API Test Successful</h2>
        <p>This test email confirms that the Resend API email integration is successfully configured and authenticated.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #4a5568;">Recipient:</td>
            <td style="padding: 6px 0; color: #2d3748;">${adminEmail}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #4a5568;">Service Method:</td>
            <td style="padding: 6px 0; color: #2d3748;">Resend HTTPS API (Port 443)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #4a5568;">Timestamp:</td>
            <td style="padding: 6px 0; color: #2d3748;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
    `
  });

  return {
    accepted: [adminEmail],
    rejected: [],
    response: '250 OK (Resend Success)',
    messageId: info.id || info.messageId || 'resend-id'
  };
}

/**
 * Checks connection status of the Resend client
 * @returns {Promise<Object>} - { success: boolean, error: string }
 */
async function verifyConnection() {
  if (!resend) {
    return { success: false, error: 'Resend API key is not configured' };
  }

  try {
    const { data, error } = await resend.domains.list();
    if (error) {
      // If the API key is valid but restricted to send-only, Resend returns this specific error
      if (error.message && error.message.includes('restricted to only send emails')) {
        return { success: true, details: 'Resend API client verified (Send-Only Permission Key)' };
      }
      console.error('❌ Resend connection verification failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true, details: 'Resend API client verified' };
  } catch (err) {
    console.error('❌ Resend connection verification failed with exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a demonstration test email alert
 */
async function sendDemoTestAlertEmail(device, alert, recipientEmail) {
  try {
    const timestampStr = new Date().toLocaleString();
    const textContent = `This is a demonstration alert generated from Force Test Mode.
Device Name: ${device.device_name}
Device ID: ${device.device_code || device.id}
Sensor Type: ${device.sensor_type || 'Unknown'}
Metric: ${alert.metric_name}
Current Value: ${alert.metric_value}
Threshold: ${alert.threshold_value}
Severity: ${alert.severity}
Timestamp: ${timestampStr}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>🚨 CRITICAL IOT ALERT - DEMO TEST</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; }
          .container { max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; margin: 0 auto; }
          .header { background-color: #ef4444; color: #ffffff; padding: 20px; text-align: center; }
          .header h2 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 25px; }
          .alert-box { background-color: #fffaf0; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
          .alert-box p { margin: 0; font-size: 15px; font-weight: bold; color: #2d3748; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          td { padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; }
          .label { font-weight: bold; color: #4a5568; width: 40%; }
          .value { color: #2d3748; }
          .footer { background-color: #edf2f7; color: #718096; text-align: center; padding: 15px; font-size: 13px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h2>🚨 CRITICAL IOT ALERT - DEMO TEST</h2></div>
          <div class="content">
            <div class="alert-box"><p>This is a demonstration alert generated from Force Test Mode.</p></div>
            <table>
              <tr><td class="label">Device Name</td><td class="value">${device.device_name}</td></tr>
              <tr><td class="label">Device ID</td><td class="value">${device.device_code || device.id}</td></tr>
              <tr><td class="label">Sensor Type</td><td class="value">${device.sensor_type || 'Unknown'}</td></tr>
              <tr><td class="label">Metric</td><td class="value">${alert.metric_name}</td></tr>
              <tr><td class="label">Current Value</td><td class="value" style="color: #ef4444; font-weight: bold;">${alert.metric_value}</td></tr>
              <tr><td class="label">Threshold</td><td class="value">${alert.threshold_value}</td></tr>
              <tr><td class="label">Severity</td><td class="value" style="color: #ef4444; font-weight: bold;">${alert.severity}</td></tr>
              <tr><td class="label">Timestamp</td><td class="value">${timestampStr}</td></tr>
            </table>
          </div>
          <div class="footer">IoT Monitoring System</div>
        </div>
      </body>
      </html>
    `;

    console.log(`EmailService: Sending Resend Demo Test alert email to ${recipientEmail}...`);
    const info = await sendMailViaResend({
      from: 'IoT Monitoring System <onboarding@resend.dev>',
      to: recipientEmail,
      subject: `🚨 CRITICAL IOT ALERT - DEMO TEST`,
      html: htmlContent,
      text: textContent
    });

    return { success: true, info: { id: info.id || info.messageId } };
  } catch (err) {
    console.error(`EmailService: Resend Error sending test alert email to ${recipientEmail}:`, err.message);
    throw err;
  }
}

module.exports = {
  sendAlertEmail,
  sendTestEmail,
  verifyConnection,
  sendDemoTestAlertEmail
};
