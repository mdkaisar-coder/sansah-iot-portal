const { pool } = require('../db');
const alertsService = require('./alertsService');

class DashboardService {
  async getDashboardStats() {
    await alertsService.cleanupExpiredTestAlerts();
    // Query devices status aggregate
    const deviceStatsQuery = `
      SELECT 
        COUNT(*) AS totalDevices,
        COALESCE(SUM(CASE WHEN LOWER(status) IN ('online', 'active') THEN 1 ELSE 0 END), 0) AS onlineDevices,
        COALESCE(SUM(CASE WHEN LOWER(status) IN ('offline', 'inactive') THEN 1 ELSE 0 END), 0) AS offlineDevices
      FROM devices
    `;
    const [[deviceStats]] = await pool.query(deviceStatsQuery);

    // Query alerts aggregate
    const alertsStatsQuery = 'SELECT COUNT(*) AS totalAlerts FROM alerts WHERE status != "Resolved"';
    const [[{ totalAlerts }]] = await pool.query(alertsStatsQuery);

    // Query device categories breakdown
    const categoryQuery = `
      SELECT sensor_type, COUNT(*) AS count 
      FROM devices 
      WHERE sensor_type IS NOT NULL AND sensor_type != '' 
      GROUP BY sensor_type
    `;
    const [categories] = await pool.query(categoryQuery);

    const categoryBreakdown = {};
    categories.forEach(row => {
      categoryBreakdown[row.sensor_type] = Number(row.count);
    });

    return {
      totalDevices: Number(deviceStats.totalDevices),
      onlineDevices: Number(deviceStats.onlineDevices),
      offlineDevices: Number(deviceStats.offlineDevices),
      totalAlerts: Number(totalAlerts),
      categoryBreakdown
    };
  }
}

module.exports = new DashboardService();
