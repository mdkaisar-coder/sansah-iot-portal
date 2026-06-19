const express = require('express');
const router = express.Router();
const { getSensors, createSensor, updateSensor, deleteSensor } = require('../controllers/sensorsController');
const { validateSensor } = require('../middleware/validation');

// GET /api/sensors
router.get('/', getSensors);

// POST /api/sensors
router.post('/', validateSensor, createSensor);

// PUT /api/sensors/:id
router.put('/:id', updateSensor);

// DELETE /api/sensors/:id
router.delete('/:id', deleteSensor);

module.exports = router;
