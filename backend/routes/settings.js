const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateAdmin,
  updateEmail,
  sendTestEmail,
  getSystemStatus
} = require('../controllers/settingsController');

// GET /api/settings
router.get('/', getSettings);

// PUT /api/settings/admin
router.put('/admin', updateAdmin);

// PUT /api/settings/email
router.put('/email', updateEmail);

// POST /api/settings/test-email
router.post('/test-email', sendTestEmail);

// GET /api/settings/system-status
router.get('/system-status', getSystemStatus);

module.exports = router;
