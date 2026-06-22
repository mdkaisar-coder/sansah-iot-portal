const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testConnection } = require('./db');
const devicesRouter = require('./routes/devices');
const usersRouter = require('./routes/users');
const alertsRouter = require('./routes/alerts');
const sensorsRouter = require('./routes/sensors');
const dashboardRouter = require('./routes/dashboard');
const settingsRouter = require('./routes/settings');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - Allow designated React clients dynamically
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
  allowedOrigins.push(...customOrigins);
}

const corsOptions = {
  origin: function (origin, callback) {
    const isVercel = origin && (origin.endsWith('.vercel.app') || origin.endsWith('.now.sh'));
    const isLocalhost = origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (!origin || allowedOrigins.includes(origin) || isVercel || isLocalhost || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Request payload parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware with payload output
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    console.log('Request Payload:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Health check endpoint
app.get(['/health', '/api/health'], async (req, res) => {
  const { pool, getIsMockMode } = require('./db');
  const emailService = require('./services/emailService');
  let dbStatus = 'disconnected';
  let dbError = null;

  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    if (rows && rows[0].result === 2) {
      dbStatus = getIsMockMode() ? 'mock' : 'connected';
    }
  } catch (err) {
    dbStatus = 'error';
    dbError = err.message;
  }

  // Verify SMTP connection
  const smtpVerification = await emailService.verifyConnection();
  const smtpStatus = smtpVerification.success ? 'connected' : 'disconnected';

  res.status(dbStatus === 'error' ? 500 : 200).json({
    status: 'healthy',
    database: dbStatus,
    smtp: smtpStatus,
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date(),
    details: {
      database: {
        isMockMode: getIsMockMode(),
        error: dbError
      },
      smtp: {
        error: smtpVerification.error || null,
        details: smtpVerification.details || null
      },
      nodeVersion: process.version
    }
  });
});

// Mount Routes
app.use('/api/devices', devicesRouter);
app.use('/api/users', usersRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/sensors', sensorsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);

// Test Email Endpoint
const { sendTestEmail } = require('./services/emailService');

app.get('/api/test-email', async (req, res) => {
  const { target } = req.query;
  console.log(`[HTTP GET] /api/test-email: Initiating test email request to: ${target || 'Default ADMIN_EMAIL'}`);
  
  const envVerify = {
    EMAIL_USER: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 4)}... (len: ${process.env.EMAIL_USER.length})` : 'NOT SET',
    EMAIL_PASS_MASKED: process.env.EMAIL_PASS ? `${process.env.EMAIL_PASS.replace(/\s+/g, '').substring(0, 3)}...${process.env.EMAIL_PASS.replace(/\s+/g, '').slice(-3)} (len: ${process.env.EMAIL_PASS.length})` : 'NOT SET',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ? `${process.env.ADMIN_EMAIL.substring(0, 4)}... (len: ${process.env.ADMIN_EMAIL.length})` : 'NOT SET',
    SMTP_HOST: process.env.SMTP_HOST || 'DEFAULT (smtp.gmail.com)',
    SMTP_PORT: process.env.SMTP_PORT || 'DEFAULT (587)',
    SMTP_SECURE: process.env.SMTP_SECURE || 'DEFAULT (false)'
  };

  try {
    const info = await sendTestEmail(target);
    console.log(`[HTTP GET] /api/test-email: Test email sent successfully. MessageID: ${info.messageId}`);
    res.status(200).json({
      success: true,
      message: 'Test email sent successfully via GET.',
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      messageId: info.messageId,
      envVerify
    });
  } catch (error) {
    console.error('❌ GET /api/test-email Route Error:', error.message);
    console.error(error.stack);
    const emailService = require('./services/emailService');
    const smtpVerification = await emailService.verifyConnection();
    res.status(500).json({
      success: false,
      message: 'Failed to send test email via GET.',
      error: error.message,
      stack: error.stack,
      smtpVerification,
      envVerify
    });
  }
});

app.post('/api/test-email', async (req, res) => {
  console.log('[HTTP POST] /api/test-email: Initiating test email request');
  
  const envVerify = {
    EMAIL_USER: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 4)}... (len: ${process.env.EMAIL_USER.length})` : 'NOT SET',
    EMAIL_PASS_MASKED: process.env.EMAIL_PASS ? `${process.env.EMAIL_PASS.replace(/\s+/g, '').substring(0, 3)}...${process.env.EMAIL_PASS.replace(/\s+/g, '').slice(-3)} (len: ${process.env.EMAIL_PASS.length})` : 'NOT SET',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ? `${process.env.ADMIN_EMAIL.substring(0, 4)}... (len: ${process.env.ADMIN_EMAIL.length})` : 'NOT SET',
    SMTP_HOST: process.env.SMTP_HOST || 'DEFAULT (smtp.gmail.com)',
    SMTP_PORT: process.env.SMTP_PORT || 'DEFAULT (587)',
    SMTP_SECURE: process.env.SMTP_SECURE || 'DEFAULT (false)'
  };

  try {
    const info = await sendTestEmail();
    console.log(`[HTTP POST] /api/test-email: Test email sent successfully. MessageID: ${info.messageId}`);
    res.status(200).json({
      success: true,
      message: 'Test email sent successfully.',
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      messageId: info.messageId,
      envVerify
    });
  } catch (error) {
    console.error('❌ POST /api/test-email Route Error:', error.message);
    console.error(error.stack);
    const emailService = require('./services/emailService');
    const smtpVerification = await emailService.verifyConnection();
    res.status(500).json({
      success: false,
      message: 'Failed to send test email.',
      error: error.message,
      stack: error.stack,
      smtpVerification,
      envVerify
    });
  }
});

// 404 Route handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// Global error handling middleware
app.use(errorHandler);

// Database verification and Server startup
async function startServer() {
  try {
    // 1. Verify database connection
    await testConnection();

    // 2. Initialize settings schema and seed admin user
    const settingsService = require('./services/settingsService');
    await settingsService.initSettingsTable();
    await settingsService.seedDefaultSettings();
    console.log('Database initialized successfully.');
  } catch (error) {
    console.warn('Database initialization failed. Server will start but database features may be unavailable:', error.message);
  }

  // 3. Start server (avoid app.listen in serverless env)
  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`Server Running on Port ${PORT}`);
    });
  }
}

startServer();

module.exports = app;
