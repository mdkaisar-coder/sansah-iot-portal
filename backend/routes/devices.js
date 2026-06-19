const express = require('express');
const router = express.Router();
const {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  triggerTestSpike
} = require('../controllers/devicesController');
const { validateDevice } = require('../middleware/validation');

// GET /api/devices
router.get('/', getDevices);

// GET /api/devices/:id
router.get('/:id', getDeviceById);

// POST /api/devices
router.post('/', validateDevice, createDevice);

// PUT /api/devices/:id
router.put('/:id', updateDevice);

// DELETE /api/devices/:id
router.delete('/:id', deleteDevice);

// POST /api/devices/:id/test-spike
router.post('/:id/test-spike', triggerTestSpike);

module.exports = router;
