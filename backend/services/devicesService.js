const { pool } = require('../db');

/**
 * Service for managing devices database queries and data transactions.
 */
class DevicesService {
  async getAllDevices() {
    const [devices] = await pool.query('SELECT * FROM devices');
    return devices;
  }

  async getDeviceById(id) {
    const [devices] = await pool.query('SELECT * FROM devices WHERE id = ?', [id]);
    return devices[0] || null;
  }

  async getDeviceByCode(code) {
    const [devices] = await pool.query('SELECT id FROM devices WHERE device_code = ?', [code]);
    return devices[0] || null;
  }

  async checkDeviceCodeCollision(code, id) {
    const [devices] = await pool.query('SELECT id FROM devices WHERE device_code = ? AND id != ?', [code, id]);
    return devices.length > 0;
  }

  async createDevice(data) {
    const { 
      device_name, 
      device_code, 
      device_type, 
      protocol, 
      project_name, 
      location, 
      status, 
      sensor_type,
      client_name,
      client_email,
      client_phone,
      alert_enabled
    } = data;

    const [result] = await pool.query(
      `INSERT INTO devices (
        device_name, device_code, device_type, protocol, 
        project_name, location, status, sensor_type, 
        client_name, client_email, client_phone, alert_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        device_name,
        device_code,
        device_type,
        protocol,
        project_name || null,
        location || null,
        status || 'Inactive',
        sensor_type || null,
        client_name || null,
        client_email || null,
        client_phone || null,
        alert_enabled !== undefined ? alert_enabled : true
      ]
    );

    return {
      id: result.insertId,
      ...data,
      project_name: project_name || null,
      location: location || null,
      status: status || 'Inactive',
      sensor_type: sensor_type || null,
      client_name: client_name || null,
      client_email: client_email || null,
      client_phone: client_phone || null,
      alert_enabled: alert_enabled !== undefined ? alert_enabled : true
    };
  }

  async updateDevice(id, data) {
    const { 
      device_name, 
      device_code, 
      device_type, 
      protocol, 
      project_name, 
      location, 
      status, 
      sensor_type,
      client_name,
      client_email,
      client_phone,
      alert_enabled
    } = data;

    await pool.query(
      `UPDATE devices SET 
        device_name = COALESCE(?, device_name),
        device_code = COALESCE(?, device_code),
        device_type = COALESCE(?, device_type),
        protocol = COALESCE(?, protocol),
        project_name = COALESCE(?, project_name),
        location = COALESCE(?, location),
        status = COALESCE(?, status),
        sensor_type = COALESCE(?, sensor_type),
        client_name = COALESCE(?, client_name),
        client_email = COALESCE(?, client_email),
        client_phone = COALESCE(?, client_phone),
        alert_enabled = COALESCE(?, alert_enabled)
       WHERE id = ?`,
      [
        device_name || null,
        device_code || null,
        device_type || null,
        protocol || null,
        project_name || null,
        location || null,
        status || null,
        sensor_type || null,
        client_name || null,
        client_email || null,
        client_phone || null,
        alert_enabled !== undefined ? alert_enabled : null,
        id
      ]
    );

    return this.getDeviceById(id);
  }

  async deleteDevice(id) {
    const [result] = await pool.query('DELETE FROM devices WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = new DevicesService();
