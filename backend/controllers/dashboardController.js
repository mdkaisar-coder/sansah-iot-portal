const dashboardService = require('../services/dashboardService');

// @desc    Get dashboard stats (total, online, offline devices and total alerts)
// @route   GET /api/dashboard/stats
const getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats
};
