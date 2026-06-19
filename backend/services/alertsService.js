const { pool } = require('../db');

class AlertsService {
  async cleanupExpiredTestAlerts() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await pool.query(
        "UPDATE alerts SET status = 'Resolved', resolved_at = ? WHERE is_test_alert = 1 AND status != 'Resolved' AND created_at < ?",
        [new Date(), fiveMinutesAgo]
      );
    } catch (err) {
      console.error('AlertsService: Failed to cleanup expired test alerts:', err.message);
    }
  }

  async getAlerts(filters = {}) {
    await this.cleanupExpiredTestAlerts();
    const { status, severity, device_id, page = 1, limit = 10 } = filters;
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 10;
    const offset = (parsedPage - 1) * parsedLimit;

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }
    
    if (severity) {
      whereClause += ' AND a.severity = ?';
      params.push(severity);
    }

    if (device_id) {
      whereClause += ' AND a.device_id = ?';
      params.push(parseInt(device_id, 10));
    }

    // 1. Get total count
    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM alerts a' + whereClause,
      params
    );
    const total = countRows[0].total;

    // 2. Fetch paginated data
    let query = `
      SELECT 
        a.id, 
        a.device_id, 
        a.device_name,
        a.sensor_type,
        a.metric_name,
        a.metric_value,
        a.threshold_value,
        a.severity,
        a.status,
        a.message,
        a.email_sent,
        a.created_at,
        a.acknowledged_at,
        a.resolved_at,
        d.device_code,
        d.client_name,
        d.client_email,
        d.client_phone,
        d.project_name,
        d.location
      FROM alerts a
      LEFT JOIN devices d ON a.device_id = d.id
    ` + whereClause + ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;

    const dataParams = [...params, parsedLimit, offset];
    const [alerts] = await pool.query(query, dataParams);

    return {
      total,
      page: parsedPage,
      limit: parsedLimit,
      alerts
    };
  }

  async getStats() {
    await this.cleanupExpiredTestAlerts();
    const statsQuery = `
      SELECT 
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END), 0) AS active,
        COALESCE(SUM(CASE WHEN status = 'Acknowledged' THEN 1 ELSE 0 END), 0) AS acknowledged,
        COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved,
        COALESCE(SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END), 0) AS critical,
        COALESCE(SUM(CASE WHEN severity = 'High' THEN 1 ELSE 0 END), 0) AS high,
        COALESCE(SUM(CASE WHEN severity = 'Medium' THEN 1 ELSE 0 END), 0) AS medium,
        COALESCE(SUM(CASE WHEN severity = 'Low' THEN 1 ELSE 0 END), 0) AS low
      FROM alerts
    `;
    const [statsResult] = await pool.query(statsQuery);
    
    return {
      total: Number(statsResult[0].total),
      active: Number(statsResult[0].active),
      acknowledged: Number(statsResult[0].acknowledged),
      resolved: Number(statsResult[0].resolved),
      critical: Number(statsResult[0].critical),
      high: Number(statsResult[0].high),
      medium: Number(statsResult[0].medium),
      low: Number(statsResult[0].low)
    };
  }

  async createAlert(data) {
    const { device_id, message, metric_name, metric_value, threshold_value, severity, status } = data;

    // Validate device exists
    const [deviceRows] = await pool.query('SELECT device_name, sensor_type FROM devices WHERE id = ?', [device_id]);
    if (deviceRows.length === 0) {
      return null;
    }

    const deviceName = deviceRows[0].device_name;
    const sensorType = deviceRows[0].sensor_type || 'Unknown';

    // Insert alert
    const [result] = await pool.query(
      `INSERT INTO alerts (device_id, device_name, sensor_type, metric_name, metric_value, threshold_value, severity, status, message, email_sent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [
        device_id,
        deviceName,
        sensorType,
        metric_name,
        metric_value,
        threshold_value,
        severity,
        status || 'Active',
        message
      ]
    );

    return {
      id: result.insertId,
      device_id,
      device_name: deviceName,
      sensor_type: sensorType,
      metric_name,
      metric_value,
      threshold_value,
      severity,
      status: status || 'Active',
      message,
      created_at: new Date()
    };
  }

  async getAlertById(id) {
    const [rows] = await pool.query('SELECT * FROM alerts WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async acknowledgeAlert(id) {
    const [existing] = await pool.query('SELECT id FROM alerts WHERE id = ?', [id]);
    if (existing.length === 0) return null;

    await pool.query(
      "UPDATE alerts SET status = 'Acknowledged', acknowledged_at = NOW() WHERE id = ?",
      [id]
    );

    const [updated] = await pool.query('SELECT * FROM alerts WHERE id = ?', [id]);
    return updated[0];
  }

  async resolveAlert(id) {
    const [existing] = await pool.query('SELECT id FROM alerts WHERE id = ?', [id]);
    if (existing.length === 0) return null;

    await pool.query(
      "UPDATE alerts SET status = 'Resolved', resolved_at = NOW() WHERE id = ?",
      [id]
    );

    const [updated] = await pool.query('SELECT * FROM alerts WHERE id = ?', [id]);
    return updated[0];
  }
}

module.exports = new AlertsService();
