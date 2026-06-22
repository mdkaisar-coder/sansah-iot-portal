const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const adminEmail = process.env.ADMIN_EMAIL;

  console.log(`[Email Service Startup] EMAIL_USER is loaded: ${user ? 'YES (' + user + ')' : 'NO'}`);
  console.log(`[Email Service Startup] ADMIN_EMAIL is loaded: ${adminEmail ? 'YES (' + adminEmail + ')' : 'NO'}`);
  console.log(`[Email Service Startup] EMAIL_PASS is loaded: ${pass ? 'YES (Confidential)' : 'NO'}`);

  if (user && pass) {
    console.log(`EmailService: Initializing Gmail SMTP transport with user: ${user}`);
    transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL/TLS
      auth: {
        user,
        pass
      }
    });

    console.log('EmailService: Initiating transporter connection verification...');
    transporter.verify((err, success) => {
      if (err) {
        console.error('❌ EmailService Transporter Verification FAILED:', err.message);
      } else {
        console.log('✅ EmailService Transporter Verification SUCCESSFUL');
      }
    });

    return transporter;
  } else {
    console.warn('EmailService: EMAIL_USER or EMAIL_PASS not set in environment. Falling back to Console Logger.');
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('\n--- EMAIL TRANSMISSION FALLBACK ---');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log('Body (HTML Preview):');
        console.log(mailOptions.html.replace(/<[^>]*>/g, ' ').substring(0, 500) + '...');
        console.log('-----------------------------------\n');
        return { messageId: 'console-logger-' + Date.now(), accepted: [mailOptions.to], rejected: [], response: '250 OK' };
      }
    };
    return transporter;
  }
}

/**
 * Sends alert notification email to Client and Admin
 * @param {Object} device - Device DB record details
 * @param {Object} alert - Alert details (message, severity, metric_name, metric_value, threshold_value)
 * @returns {Promise<boolean>} - True if email sent successfully, false otherwise
 */
async function sendAlertEmail(device, alert) {
  try {
    const activeTransporter = getTransporter();
    
    // Fetch email configurations dynamically from database settings
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

    console.log(`EmailService: Building recipient list for device ${device.device_code}...`);
    console.log(`EmailService: - Device alert_enabled: ${device.alert_enabled}`);
    console.log(`EmailService: - Send Client Emails setting: ${sendClient}`);
    console.log(`EmailService: - Client Email: ${device.client_email}`);
    console.log(`EmailService: - Send Admin Emails setting: ${sendAdmin}`);
    console.log(`EmailService: - Admin Email: ${adminEmail}`);
    
    // Build email recipient list
    const recipients = [];
    
    // Client email: check if alert_enabled is true and sendClient setting is true
    if (sendClient && device.alert_enabled && device.client_email) {
      recipients.push(device.client_email);
    }
    
    // Admin email: check if sendAdmin setting is true and adminEmail exists
    if (sendAdmin && adminEmail) {
      recipients.push(adminEmail);
    }

    console.log(`EmailService: Final recipients list: ${recipients.join(', ')}`);

    if (recipients.length === 0) {
      console.log(`EmailService: No recipients configured or email triggers are muted for device ${device.device_code}. Email skipped.`);
      return false;
    }

    const severityColorMap = {
      'Critical': '#ef4444', // red
      'High': '#f97316',     // orange
      'Medium': '#eab308',   // yellow
      'Low': '#3b82f6'       // blue
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
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f5f7;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
            border: 1px solid #e2e8f0;
            margin: 0 auto;
          }
          .header {
            background-color: ${severityColor};
            color: #ffffff;
            padding: 20px;
            text-align: center;
          }
          .header h2 {
            margin: 0;
            font-size: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .content {
            padding: 25px;
          }
          .alert-box {
            background-color: #fffaf0;
            border-left: 4px solid ${severityColor};
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
          }
          .alert-box p {
            margin: 0;
            font-size: 15px;
            font-weight: bold;
            color: #2d3748;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #edf2f7;
            font-size: 14px;
          }
          .label {
            font-weight: bold;
            color: #4a5568;
            width: 40%;
          }
          .value {
            color: #2d3748;
          }
          .footer {
            background-color: #edf2f7;
            color: #718096;
            text-align: center;
            padding: 15px;
            font-size: 13px;
            font-weight: bold;
          }
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
              <tr>
                <td class="label">Client Name</td>
                <td class="value">${device.client_name || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Project Name</td>
                <td class="value">${device.project_name || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Device Name</td>
                <td class="value">${device.device_name}</td>
              </tr>
              <tr>
                <td class="label">Device ID</td>
                <td class="value">${device.device_code}</td>
              </tr>
              <tr>
                <td class="label">Sensor Category</td>
                <td class="value">${device.sensor_type || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Metric Name</td>
                <td class="value">${alert.metric_name}</td>
              </tr>
              <tr>
                <td class="label">Current Value</td>
                <td class="value" style="color: ${severityColor}; font-weight: bold;">${alert.metric_value}</td>
              </tr>
              <tr>
                <td class="label">Threshold Value</td>
                <td class="value">${alert.threshold_value}</td>
              </tr>
              <tr>
                <td class="label">Severity</td>
                <td class="value" style="color: ${severityColor}; font-weight: bold;">${alert.severity}</td>
              </tr>
              <tr>
                <td class="label">Timestamp</td>
                <td class="value">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          <div class="footer">
            IoT Monitoring System
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"IoT Monitoring System" <${process.env.EMAIL_USER || 'no-reply@iot.com'}>`,
      to: recipients.join(', '),
      subject: `🚨 IoT Device Alert - ${device.device_name}`,
      html: htmlContent
    };

    console.log(`EmailService: Calling activeTransporter.sendMail()...`);
    const info = await activeTransporter.sendMail(mailOptions);
    console.log(`EmailService: transporter.sendMail() execution completed successfully.`);
    console.log(`EmailService: Nodemailer response:`, JSON.stringify({
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      messageId: info.messageId
    }, null, 2));
    return true;
  } catch (err) {
    console.error('EmailService error: Failed to send email alert:', err.message);
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
    adminEmail = process.env.ADMIN_EMAIL;
  }

  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL is not configured in settings or environment.');
  }

  const activeTransporter = getTransporter();
  const mailOptions = {
    from: `"IoT Monitoring System - Test" <${process.env.EMAIL_USER || 'no-reply@iot.com'}>`,
    to: adminEmail,
    subject: '🧪 IoT Monitoring System - SMTP Test Email',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6; border-bottom: 1px solid #edf2f7; padding-bottom: 10px;">🧪 SMTP Connection Test Successful</h2>
        <p>This test email confirms that the Nodemailer transporter is successfully configured and authenticated via Gmail SMTP.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #4a5568;">SMTP User:</td>
            <td style="padding: 6px 0; color: #2d3748;">${process.env.EMAIL_USER || 'Fallback console'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #4a5568;">Recipient:</td>
            <td style="padding: 6px 0; color: #2d3748;">${adminEmail}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #4a5568;">Timestamp:</td>
            <td style="padding: 6px 0; color: #2d3748;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
    `
  };

  console.log(`EmailService: Dispatching SMTP test email to: ${adminEmail}`);
  const info = await activeTransporter.sendMail(mailOptions);
  console.log(`EmailService: SMTP test email sent. Message ID: ${info.messageId}`);
  return info;
}

/**
 * Checks connection status of the SMTP transporter
 * @returns {Promise<Object>} - { success: boolean, error: string }
 */
async function verifyConnection() {
  try {
    const activeTransporter = getTransporter();
    
    // Check if fallback console transporter is used
    if (activeTransporter.sendMail && !activeTransporter.verify) {
      return { success: true, details: 'Console logger active (fallback mode)' };
    }

    // Add a 3-second timeout to prevent server hanging if port is blocked by hosting provider
    await Promise.race([
      new Promise((resolve, reject) => {
        activeTransporter.verify((err, success) => {
          if (err) reject(err);
          else resolve(success);
        });
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP connection verification timed out (port 465 might be blocked by provider)')), 3000)
      )
    ]);

    return { success: true };
  } catch (err) {
    console.warn('[EmailService] SMTP Connection Verification failed:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendDemoTestAlertEmail(device, alert, recipientEmail) {
  try {
    const activeTransporter = getTransporter();
    const timestampStr = new Date().toLocaleString();

    const textContent = `This is a demonstration alert generated from Force Test Mode.

Device Name: ${device.device_name}
Device ID: ${device.device_code || device.id}
Sensor Type: ${device.sensor_type || 'Unknown'}
Metric: ${alert.metric_name}
Current Value: ${alert.metric_value}
Threshold: ${alert.threshold_value}
Severity: ${alert.severity}
Timestamp: ${timestampStr}

This email confirms that the IoT Alert Notification System is functioning correctly.`;

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
          <div class="header">
            <h2>🚨 CRITICAL IOT ALERT - DEMO TEST</h2>
          </div>
          <div class="content">
            <div class="alert-box">
              <p>This is a demonstration alert generated from Force Test Mode.</p>
            </div>
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
            <p>This email confirms that the IoT Alert Notification System is functioning correctly.</p>
          </div>
          <div class="footer">IoT Monitoring System</div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"IoT Monitoring System" <${process.env.EMAIL_USER || 'no-reply@iot.com'}>`,
      to: recipientEmail,
      subject: `🚨 CRITICAL IOT ALERT - DEMO TEST`,
      text: textContent,
      html: htmlContent
    };

    console.log(`EmailService: Sending Demo Test alert email to ${recipientEmail}...`);
    const info = await activeTransporter.sendMail(mailOptions);
    console.log(`EmailService: Demo Test alert email sent. Message ID: ${info.messageId}`);
    return { success: true, info };
  } catch (err) {
    console.error(`EmailService: SMTP Error sending test alert email to ${recipientEmail}:`, err.message, err);
    throw err;
  }
}

module.exports = {
  sendAlertEmail,
  sendTestEmail,
  verifyConnection,
  sendDemoTestAlertEmail
};
