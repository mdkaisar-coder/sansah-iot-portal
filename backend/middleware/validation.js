// Helper to validate email format
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// Middleware for user registration validation
const validateRegister = (req, res, next) => {
  const { full_name, email, password } = req.body;

  if (!full_name || typeof full_name !== 'string' || full_name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Full name is required.' });
  }

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  next();
};

// Middleware for user login validation
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({ success: false, message: 'Username is required.' });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  next();
};

// Middleware for device configuration validation
const validateDevice = (req, res, next) => {
  const { device_name, device_code, device_type, protocol, project_name, location, status, client_email, alert_enabled } = req.body;

  if (!device_name || typeof device_name !== 'string' || device_name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Device name is required.' });
  }

  if (!device_code || typeof device_code !== 'string' || device_code.trim() === '') {
    return res.status(400).json({ success: false, message: 'Device code is required.' });
  }

  if (!device_type || typeof device_type !== 'string' || device_type.trim() === '') {
    return res.status(400).json({ success: false, message: 'Device type is required.' });
  }

  if (!protocol || typeof protocol !== 'string' || protocol.trim() === '') {
    return res.status(400).json({ success: false, message: 'Protocol is required.' });
  }

  if (client_email && !validateEmail(client_email)) {
    return res.status(400).json({ success: false, message: 'Client email format is invalid.' });
  }

  if (alert_enabled !== undefined && typeof alert_enabled !== 'boolean' && alert_enabled !== 'true' && alert_enabled !== 'false' && alert_enabled !== 1 && alert_enabled !== 0) {
    return res.status(400).json({ success: false, message: 'Alert enabled must be a boolean.' });
  }

  // project_name, location, and status can be optional but if supplied, must be strings/proper format
  next();
};

// Middleware for alert validation
const validateAlert = (req, res, next) => {
  const { device_id, message, metric_name, metric_value, threshold_value, severity, status } = req.body;

  if (device_id === undefined || device_id === null || isNaN(Number(device_id))) {
    return res.status(400).json({ success: false, message: 'A valid numeric device ID is required.' });
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ success: false, message: 'Alert message is required.' });
  }

  if (!metric_name || typeof metric_name !== 'string' || metric_name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Metric name is required.' });
  }

  if (metric_value === undefined || metric_value === null || String(metric_value).trim() === '') {
    return res.status(400).json({ success: false, message: 'Metric value is required.' });
  }

  if (threshold_value === undefined || threshold_value === null || String(threshold_value).trim() === '') {
    return res.status(400).json({ success: false, message: 'Threshold value is required.' });
  }

  if (!severity || typeof severity !== 'string' || severity.trim() === '') {
    return res.status(400).json({ success: false, message: 'Severity is required.' });
  }

  if (status && !['Active', 'Acknowledged', 'Resolved'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value.' });
  }

  next();
};

// Middleware for sensor data validation
const validateSensor = (req, res, next) => {
  const { device_id, sensor_name, sensor_value } = req.body;

  if (device_id === undefined || device_id === null || isNaN(Number(device_id))) {
    return res.status(400).json({ success: false, message: 'A valid numeric device ID is required.' });
  }

  if (!sensor_name || typeof sensor_name !== 'string' || sensor_name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Sensor name is required.' });
  }

  if (sensor_value === undefined || sensor_value === null || String(sensor_value).trim() === '') {
    return res.status(400).json({ success: false, message: 'Sensor value is required.' });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateDevice,
  validateAlert,
  validateSensor
};
