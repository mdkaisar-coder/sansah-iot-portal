const settingsService = require('../services/settingsService');
const emailService = require('../services/emailService');
const { pool } = require('../db');

// @desc    Get all settings configuration
// @route   GET /api/settings
const getSettings = async (req, res, next) => {
  try {
    const config = await settingsService.getSettings();
    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update admin account credentials
// @route   PUT /api/settings/admin
const updateAdmin = async (req, res, next) => {
  const { username, password, confirmPassword } = req.body;

  try {
    // 1. Basic validation
    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long.'
      });
    }

    if (password) {
      if (password.length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 4 characters long.'
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match.'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Password is required to update credentials.'
      });
    }

    // 2. Perform credential update
    await settingsService.updateAdminCredentials(username.trim(), password);

    res.status(200).json({
      success: true,
      message: 'Admin credentials updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update SMTP Email settings
// @route   PUT /api/settings/email
const updateEmail = async (req, res, next) => {
  const { admin_email, send_admin_emails, send_client_emails } = req.body;

  try {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!admin_email || !emailRegex.test(admin_email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    await settingsService.updateEmailSettings({
      admin_email: admin_email.trim(),
      send_admin_emails: send_admin_emails === true || send_admin_emails === 'true',
      send_client_emails: send_client_emails === true || send_client_emails === 'true'
    });

    res.status(200).json({
      success: true,
      message: 'Email settings updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a real test email through Nodemailer
// @route   POST /api/settings/test-email
const sendTestEmail = async (req, res, next) => {
  const { admin_email } = req.body;

  try {
    console.log(`settingsController: Requesting test email send to: ${admin_email || 'configured admin email'}`);
    const info = await emailService.sendTestEmail(admin_email);
    
    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      accepted: info.accepted,
      response: info.response,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('settingsController error: Test email dispatch failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Email failed to send.',
      error: error.message
    });
  }
};

// @desc    Check actual system health status (MySQL, SMTP, Backend API)
// @route   GET /api/settings/system-status
const getSystemStatus = async (req, res, next) => {
  try {
    // 1. Verify Database connection status
    let dbStatus = 'Disconnected';
    try {
      const [rows] = await pool.query('SELECT 1 + 1 AS check_val');
      if (rows && rows[0]?.check_val === 2) {
        dbStatus = 'Connected';
      }
    } catch (dbErr) {
      console.error('SystemStatus Check: DB connection failed:', dbErr.message);
    }

    // 2. Verify SMTP connection status
    let smtpStatus = 'Disconnected';
    try {
      const emailVerify = await emailService.verifyConnection();
      if (emailVerify.success) {
        smtpStatus = 'Connected';
      }
    } catch (smtpErr) {
      console.error('SystemStatus Check: SMTP verify failed:', smtpErr.message);
    }

    // 3. Backend status is running since this request arrived
    const backendStatus = 'Running';

    res.status(200).json({
      success: true,
      data: {
        database: dbStatus,
        smtp: smtpStatus,
        backend: backendStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateAdmin,
  updateEmail,
  sendTestEmail,
  getSystemStatus
};
