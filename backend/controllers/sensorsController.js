const sensorsService = require('../services/sensorsService');

// @desc    Get all sensor data
// @route   GET /api/sensors
const getSensors = async (req, res, next) => {
  const { deviceId } = req.query;
  try {
    const sensors = await sensorsService.getSensors(deviceId);
    res.status(200).json({
      success: true,
      count: sensors.length,
      data: sensors
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new sensor reading
// @route   POST /api/sensors
const createSensor = async (req, res, next) => {
  const { device_id } = req.body;
  try {
    // Check if referenced device exists
    const deviceExists = await sensorsService.checkDeviceExists(device_id);
    if (!deviceExists) {
      return res.status(404).json({
        success: false,
        message: `Device with ID ${device_id} does not exist.`
      });
    }

    const sensorData = await sensorsService.createSensor(req.body);
    res.status(201).json({
      success: true,
      message: 'Sensor data logged successfully.',
      data: sensorData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a sensor reading by ID
// @route   PUT /api/sensors/:id
const updateSensor = async (req, res, next) => {
  const { id } = req.params;
  const { device_id } = req.body;

  try {
    const existing = await sensorsService.checkSensorExists(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Sensor record with ID ${id} not found.`
      });
    }

    // Verify the device exists if the update tries to change the device_id
    if (device_id) {
      const deviceExists = await sensorsService.checkDeviceExists(device_id);
      if (!deviceExists) {
        return res.status(404).json({
          success: false,
          message: `Device with ID ${device_id} does not exist.`
        });
      }
    }

    const sensorData = await sensorsService.updateSensor(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Sensor data updated successfully.',
      data: sensorData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a sensor reading by ID
// @route   DELETE /api/sensors/:id
const deleteSensor = async (req, res, next) => {
  const { id } = req.params;
  try {
    const success = await sensorsService.deleteSensor(id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Sensor record with ID ${id} not found.`
      });
    }

    res.status(200).json({
      success: true,
      message: `Sensor record with ID ${id} has been deleted.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSensors,
  createSensor,
  updateSensor,
  deleteSensor
};
