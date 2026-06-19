const alertsService = require('../services/alertsService');

// @desc    Get all alerts with pagination and filters
// @route   GET /api/alerts
const getAlerts = async (req, res, next) => {
  try {
    const { status, severity, device_id, page, limit } = req.query;
    const result = await alertsService.getAlerts({ status, severity, device_id, page, limit });

    res.status(200).json({
      success: true,
      count: result.alerts.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      data: result.alerts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get alerts statistics breakdown
// @route   GET /api/alerts/stats
const getAlertsStats = async (req, res, next) => {
  try {
    const data = await alertsService.getStats();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new alert
// @route   POST /api/alerts
const createAlert = async (req, res, next) => {
  const { device_id } = req.body;
  try {
    const alert = await alertsService.createAlert(req.body);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: `Device with ID ${device_id} does not exist.`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Alert registered successfully.',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Acknowledge alert by ID
// @route   PUT /api/alerts/:id/acknowledge
const acknowledgeAlert = async (req, res, next) => {
  const { id } = req.params;
  try {
    const updated = await alertsService.acknowledgeAlert(id);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Alert with ID ${id} not found.`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert acknowledged successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve alert by ID
// @route   PUT /api/alerts/:id/resolve
const resolveAlert = async (req, res, next) => {
  const { id } = req.params;
  try {
    const updated = await alertsService.resolveAlert(id);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Alert with ID ${id} not found.`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert resolved successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  getAlertsStats,
  createAlert,
  acknowledgeAlert,
  resolveAlert
};
