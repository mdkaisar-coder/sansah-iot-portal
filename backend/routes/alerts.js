const express = require('express');
const router = express.Router();
const { 
  getAlerts, 
  getAlertsStats, 
  createAlert, 
  acknowledgeAlert, 
  resolveAlert 
} = require('../controllers/alertsController');
const { validateAlert } = require('../middleware/validation');

// GET /api/alerts/stats
router.get('/stats', getAlertsStats);

// GET /api/alerts
router.get('/', getAlerts);

// POST /api/alerts
router.post('/', validateAlert, createAlert);

// PUT /api/alerts/:id/acknowledge
router.put('/:id/acknowledge', acknowledgeAlert);

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', resolveAlert);

module.exports = router;
