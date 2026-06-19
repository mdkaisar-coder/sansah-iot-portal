const { pool } = require('../db');
const { generateTelemetryOnDemand } = require('./telemetryService');

class SensorsService {
  async getSensors(deviceId) {
    // Trigger on-demand telemetry generation check
    await generateTelemetryOnDemand(deviceId);

    let query = `
      SELECT 
        s.id, 
        s.device_id, 
        d.device_name,
        d.device_code,
        s.sensor_name, 
        s.sensor_value, 
        s.recorded_at
      FROM sensor_data s
      LEFT JOIN devices d ON s.device_id = d.id
    `;
    let params = [];
    if (deviceId) {
      query += ` WHERE s.device_id = ?`;
      params.push(deviceId);
    }
    query += ` ORDER BY s.recorded_at DESC`;

    const [sensors] = await pool.query(query, params);
    return sensors;
  }

  async checkDeviceExists(deviceId) {
    const [device] = await pool.query('SELECT id FROM devices WHERE id = ?', [deviceId]);
    return device.length > 0;
  }

  async checkSensorExists(id) {
    const [existing] = await pool.query('SELECT id FROM sensor_data WHERE id = ?', [id]);
    return existing.length > 0;
  }

  async createSensor(data) {
    const { device_id, sensor_name, sensor_value, recorded_at } = data;
    const timestamp = recorded_at ? new Date(recorded_at) : new Date();

    const [result] = await pool.query(
      'INSERT INTO sensor_data (device_id, sensor_name, sensor_value, recorded_at) VALUES (?, ?, ?, ?)',
      [device_id, sensor_name, sensor_value, timestamp]
    );

    return {
      id: result.insertId,
      device_id,
      sensor_name,
      sensor_value,
      recorded_at: timestamp
    };
  }

  async updateSensor(id, data) {
    const { device_id, sensor_name, sensor_value, recorded_at } = data;

    await pool.query(
      `UPDATE sensor_data SET 
        device_id = COALESCE(?, device_id),
        sensor_name = COALESCE(?, sensor_name),
        sensor_value = COALESCE(?, sensor_value),
        recorded_at = COALESCE(?, recorded_at)
       WHERE id = ?`,
      [
        device_id || null,
        sensor_name || null,
        sensor_value || null,
        recorded_at ? new Date(recorded_at) : null,
        id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM sensor_data WHERE id = ?', [id]);
    return updated[0];
  }

  async deleteSensor(id) {
    const [result] = await pool.query('DELETE FROM sensor_data WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = new SensorsService();
