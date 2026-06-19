const devicesService = require('../services/devicesService');

// @desc    Get all devices
// @route   GET /api/devices
const getDevices = async (req, res, next) => {
  try {
    const devices = await devicesService.getAllDevices();
    res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single device by ID
// @route   GET /api/devices/:id
const getDeviceById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const device = await devicesService.getDeviceById(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: `Device with ID ${id} not found.`
      });
    }
    res.status(200).json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new device
// @route   POST /api/devices
const createDevice = async (req, res, next) => {
  const { device_code } = req.body;
  try {
    // Validate device code uniqueness
    const existing = await devicesService.getDeviceByCode(device_code);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A device with code '${device_code}' already exists.`
      });
    }

    const device = await devicesService.createDevice(req.body);
    res.status(201).json({
      success: true,
      message: 'Device created successfully.',
      data: device
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a device by ID
// @route   PUT /api/devices/:id
const updateDevice = async (req, res, next) => {
  const { id } = req.params;
  const { device_code } = req.body;

  try {
    // Verify device exists
    const existing = await devicesService.getDeviceById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Device with ID ${id} not found.`
      });
    }

    // Check device code collision if changed
    if (device_code) {
      const collision = await devicesService.checkDeviceCodeCollision(device_code, id);
      if (collision) {
        return res.status(400).json({
          success: false,
          message: `Device code '${device_code}' is already assigned to another device.`
        });
      }
    }

    const device = await devicesService.updateDevice(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Device updated successfully.',
      data: device
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a device by ID
// @route   DELETE /api/devices/:id
const deleteDevice = async (req, res, next) => {
  const { id } = req.params;
  try {
    const success = await devicesService.deleteDevice(id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Device with ID ${id} not found.`
      });
    }
    res.status(200).json({
      success: true,
      message: `Device with ID ${id} has been deleted.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Force telemetry critical values spike beyond thresholds for testing
// @route   POST /api/devices/:id/test-spike
const triggerTestSpike = async (req, res, next) => {
  const { id } = req.params;
  try {
    const device = await devicesService.getDeviceById(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: `Device with ID ${id} not found.`
      });
    }

    // Determine spiked metric details based on device category
    let metric_name = 'Temperature';
    let metric_value = '55°C';
    let threshold_value = '40°C';

    if (device.sensor_type === 'Smoke Sensor') {
      metric_name = 'Smoke Level';
      metric_value = '85.0 ppm';
      threshold_value = '70.0 ppm';
    } else if (device.sensor_type === 'Gas Sensor') {
      metric_name = 'Gas Concentration';
      metric_value = '850 ppm';
      threshold_value = '700 ppm';
    } else if (device.sensor_type === 'Water Level Sensor') {
      metric_name = 'Water Level';
      metric_value = '5%';
      threshold_value = '20%';
    } else if (device.sensor_type === 'Air Quality Sensor') {
      metric_name = 'AQI';
      metric_value = '220';
      threshold_value = '150';
    }

    const message = `[DEMO TEST] ${metric_name} exceeds limit: ${metric_value} (threshold: ${threshold_value})`;

    const { pool } = require('../db');
    const emailService = require('../services/emailService');
    const settingsService = require('../services/settingsService');

    const now = new Date();
    // 1. Create a temporary Critical Alert in DB with is_test_alert = 1
    const [result] = await pool.query(
      `INSERT INTO alerts (device_id, device_name, sensor_type, metric_name, metric_value, threshold_value, severity, status, message, email_sent, is_test_alert, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        device.id,
        device.device_name,
        device.sensor_type || 'Unknown',
        metric_name,
        metric_value,
        threshold_value,
        'Critical',
        'Active',
        message,
        0, // email_sent initially 0
        1, // is_test_alert = 1
        now
      ]
    );

    const alertId = result.insertId;
    const alertObj = {
      id: alertId,
      metric_name,
      metric_value,
      threshold_value,
      severity: 'Critical',
      message
    };

    // 2. Fetch admin and client emails
    const settings = await settingsService.getSettings();
    const adminEmail = settings.admin_email;
    const clientEmail = device.client_email;

    // 3. Immediately send alert emails to Admin and Client
    let adminEmailSent = false;
    let clientEmailSent = false;
    let adminEmailError = null;
    let clientEmailError = null;

    if (adminEmail) {
      try {
        await emailService.sendDemoTestAlertEmail(device, alertObj, adminEmail);
        adminEmailSent = true;
      } catch (err) {
        console.error('SMTP Error sending test alert email to Admin:', err.message, err);
        adminEmailError = err.message;
      }
    } else {
      adminEmailError = 'No admin email configured in settings';
    }

    if (clientEmail) {
      try {
        await emailService.sendDemoTestAlertEmail(device, alertObj, clientEmail);
        clientEmailSent = true;
      } catch (err) {
        console.error('SMTP Error sending test alert email to Client:', err.message, err);
        clientEmailError = err.message;
      }
    } else {
      clientEmailError = 'No client email configured for device';
    }

    // Update alert status if at least one email was sent
    if (adminEmailSent || clientEmailSent) {
      await pool.query('UPDATE alerts SET email_sent = 1 WHERE id = ?', [alertId]);
    }

    // 4. Auto Cleanup: after 5 minutes, automatically mark the test alert as Resolved
    setTimeout(async () => {
      try {
        await pool.query(
          "UPDATE alerts SET status = 'Resolved', resolved_at = ? WHERE id = ?",
          [new Date(), alertId]
        );
        console.log(`[Test Mode] Automatically resolved test alert ID ${alertId} after 5 minutes.`);
      } catch (err) {
        console.error(`[Test Mode] Failed to resolve test alert ID ${alertId} on timeout:`, err.message);
      }
    }, 5 * 60 * 1000);

    res.status(200).json({
      success: true,
      message: 'Test Alert Generated Successfully',
      data: {
        alertId,
        adminEmailSent,
        clientEmailSent,
        adminEmail,
        clientEmail,
        adminEmailError,
        clientEmailError
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  triggerTestSpike
};
