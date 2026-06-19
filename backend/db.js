const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');

// Load .env reliably using absolute path relative to this script
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Detailed startup connection log (excluding actual password for security)
console.log('Database Connection Attempt Details:');
console.log(`- Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`- Database: ${process.env.DB_NAME || 'iot_portal'}`);
console.log(`- Port: ${process.env.DB_PORT || '3306'}`);
console.log(`- User: ${process.env.DB_USER || 'root'}`);
console.log(`- Password Exists: ${process.env.DB_PASSWORD ? 'true' : 'false'}`);

let isMockMode = false;

// Create standard connection pool
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iot_portal',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Add SSL support dynamically for cloud hosted databases (e.g. TiDB Cloud)
if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') {
  poolConfig.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  };
}

const realPool = mysql.createPool(poolConfig);

// Mock database state for Demo/Mock mode fallback in serverless production
const mockDb = {
  users: [],
  devices: [
    {
      id: 1,
      device_name: 'Main Server Temperature',
      device_code: 'DEV-TEMP-001',
      device_type: 'Sensor',
      protocol: 'MQTT',
      project_name: 'Server Room Monitor',
      location: 'Rack A-12',
      status: 'Online',
      sensor_type: 'Temperature Sensor',
      client_name: 'Operations Team',
      client_email: 'mohammadkaisar933@gmail.com',
      client_phone: '1234567890',
      alert_enabled: 1
    },
    {
      id: 2,
      device_name: 'UPS Battery Monitor',
      device_code: 'DEV-BATT-002',
      device_type: 'Sensor',
      protocol: 'HTTP',
      project_name: 'Power Grid Control',
      location: 'Basement Power Room',
      status: 'Online',
      sensor_type: 'Battery Monitor',
      client_name: 'Operations Team',
      client_email: 'mohammadkaisar933@gmail.com',
      client_phone: '1234567890',
      alert_enabled: 1
    }
  ],
  alerts: [],
  sensor_data: [],
  settings: []
};

// Seed password synchronously to avoid async cold-start race conditions: admin / admin@123
try {
  const hash = bcrypt.hashSync('admin@123', 10);
  mockDb.users.push({
    id: 1,
    full_name: 'Admin Operations',
    email: 'admin',
    password: hash
  });
} catch (err) {
  console.error('[MockDB] Failed to pre-hash mock password:', err.message);
}

// Start connection check immediately on module load
const connectionCheckPromise = (async () => {
  // If running in Vercel and no public database configured, enable mock fallback immediately
  if (process.env.VERCEL && (!process.env.DB_HOST || process.env.DB_HOST === 'localhost')) {
    console.log('[MockDB] Running on Vercel without remote database env. Enabling Demo/Mock Database Mode.');
    isMockMode = true;
    return;
  }

  try {
    const connection = await realPool.getConnection();
    console.log('Database Connected Successfully');
    connection.release();
  } catch (error) {
    console.warn('[MockDB] Database connection verification failed:', error.message);
    console.warn('[MockDB] Enabling Demo/Mock Database Mode fallback.');
    isMockMode = true;
  }
})();

// SQL Query parser and executor for Mock Mode
async function mockQuery(sql, params = []) {
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();
  const p = (idx) => params[idx];

  // 1. CREATE TABLE IF NOT EXISTS
  if (normalizedSql.toUpperCase().startsWith('CREATE TABLE')) {
    return [[]];
  }

  // 2. SHOW COLUMNS FROM alerts
  if (normalizedSql.toUpperCase().startsWith('SHOW COLUMNS')) {
    const columns = [
      { Field: 'id' }, { Field: 'device_id' }, { Field: 'device_name' },
      { Field: 'sensor_type' }, { Field: 'metric_name' }, { Field: 'metric_value' },
      { Field: 'threshold_value' }, { Field: 'severity' }, { Field: 'status' },
      { Field: 'message' }, { Field: 'email_sent' }, { Field: 'created_at' },
      { Field: 'acknowledged_at' }, { Field: 'resolved_at' }, { Field: 'is_test_alert' }
    ];
    return [columns];
  }

  // 3. SELECT 1 + 1 AS result
  if (normalizedSql.includes('1 + 1 AS result')) {
    return [[{ result: 2 }]];
  }

  // 4. SELECT setting_value FROM settings WHERE setting_key = ?
  if (normalizedSql.includes('FROM settings WHERE setting_key = ?')) {
    const key = p(0);
    const row = mockDb.settings.find(s => s.setting_key === key);
    return [row ? [row] : []];
  }

  // 5. SELECT setting_key, setting_value FROM settings
  if (normalizedSql.match(/SELECT setting_key, setting_value FROM settings$/i)) {
    return [mockDb.settings];
  }

  // 6. INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
  if (normalizedSql.includes('INSERT INTO settings')) {
    const key = p(0);
    const val = p(1);
    mockDb.settings.push({ setting_key: key, setting_value: String(val) });
    return [{ insertId: 1 }];
  }

  // 7. UPDATE settings SET setting_value = ? WHERE setting_key = ?
  if (normalizedSql.includes('UPDATE settings SET setting_value = ? WHERE setting_key = ?')) {
    const val = p(0);
    const key = p(1);
    const row = mockDb.settings.find(s => s.setting_key === key);
    if (row) {
      row.setting_value = String(val);
    } else {
      mockDb.settings.push({ setting_key: key, setting_value: String(val) });
    }
    return [{ affectedRows: 1 }];
  }

  // 8. SELECT * FROM users WHERE email = ?
  if (normalizedSql.includes('FROM users WHERE email = ?')) {
    const email = p(0);
    const row = mockDb.users.find(u => u.email === email);
    return [row ? [row] : []];
  }

  // 9. INSERT INTO users
  if (normalizedSql.includes('INSERT INTO users')) {
    const row = {
      id: mockDb.users.length + 1,
      full_name: p(0),
      email: p(1),
      password: p(2)
    };
    mockDb.users.push(row);
    return [{ insertId: row.id }];
  }

  // 10. UPDATE users SET email = ?, password = ? WHERE email = ?
  if (normalizedSql.includes('UPDATE users SET email = ?, password = ? WHERE email = ?')) {
    const newEmail = p(0);
    const newPass = p(1);
    const oldEmail = p(2);
    const user = mockDb.users.find(u => u.email === oldEmail);
    if (user) {
      user.email = newEmail;
      user.password = newPass;
      const setting = mockDb.settings.find(s => s.setting_key === 'admin_username');
      if (setting) setting.setting_value = newEmail;
    }
    return [{ affectedRows: user ? 1 : 0 }];
  }

  // 11. SELECT id, full_name, email FROM users
  if (normalizedSql.includes('SELECT id, full_name, email FROM users')) {
    return [mockDb.users.map(u => ({ id: u.id, full_name: u.full_name, email: u.email }))];
  }

  // 12. SELECT * FROM devices WHERE status / status filters
  if (normalizedSql.includes('FROM devices') && normalizedSql.includes('status')) {
    if (normalizedSql.includes('totalDevices')) {
      const totalDevices = mockDb.devices.length;
      const onlineDevices = mockDb.devices.filter(d => ['online', 'active'].includes((d.status || '').toLowerCase())).length;
      const offlineDevices = totalDevices - onlineDevices;
      return [[{ totalDevices, onlineDevices, offlineDevices }]];
    }
    let devices = mockDb.devices;
    if (normalizedSql.includes('LOWER(status) IN')) {
      devices = devices.filter(d => ['online', 'active'].includes((d.status || '').toLowerCase()));
    } else if (normalizedSql.includes("status = 'Online'")) {
      devices = devices.filter(d => d.status === 'Online');
    }
    return [devices];
  }

  // 13. SELECT * FROM devices WHERE id = ?
  if (normalizedSql.includes('FROM devices WHERE id = ?')) {
    const id = parseInt(p(0), 10);
    const row = mockDb.devices.find(d => d.id === id);
    return [row ? [row] : []];
  }

  // 14. SELECT id FROM devices WHERE device_code = ? AND id != ?
  if (normalizedSql.includes('FROM devices WHERE device_code = ? AND id != ?')) {
    const code = p(0);
    const id = parseInt(p(1), 10);
    const exists = mockDb.devices.some(d => d.device_code === code && d.id !== id);
    return [exists ? [{ id: 1 }] : []];
  }

  // 15. SELECT id FROM devices WHERE device_code = ?
  if (normalizedSql.includes('FROM devices WHERE device_code = ?')) {
    const code = p(0);
    const row = mockDb.devices.find(d => d.id === code || d.device_code === code);
    return [row ? [row] : []];
  }

  // 16. SELECT COUNT(*) AS count FROM devices
  if (normalizedSql.includes('SELECT COUNT(*) AS count FROM devices')) {
    return [[{ count: mockDb.devices.length }]];
  }

  // 17. SELECT * FROM devices
  if (normalizedSql.includes('SELECT * FROM devices')) {
    return [mockDb.devices];
  }

  // 18. INSERT INTO devices
  if (normalizedSql.includes('INSERT INTO devices')) {
    const newDev = {
      id: mockDb.devices.length > 0 ? Math.max(...mockDb.devices.map(d => d.id)) + 1 : 1,
      device_name: p(0),
      device_code: p(1),
      device_type: p(2),
      protocol: p(3),
      project_name: p(4),
      location: p(5),
      status: p(6) || 'Inactive',
      sensor_type: p(7),
      client_name: p(8),
      client_email: p(9),
      client_phone: p(10),
      alert_enabled: p(11) !== undefined ? p(11) : 1
    };
    mockDb.devices.push(newDev);
    return [{ insertId: newDev.id }];
  }

  // 19. UPDATE devices SET
  if (normalizedSql.includes('UPDATE devices SET')) {
    const id = parseInt(p(params.length - 1), 10);
    const dev = mockDb.devices.find(d => d.id === id);
    if (dev) {
      if (normalizedSql.includes('status = ?') && params.length === 2) {
        dev.status = p(0);
      } else {
        dev.device_name = p(0) !== null ? p(0) : dev.device_name;
        dev.device_code = p(1) !== null ? p(1) : dev.device_code;
        dev.device_type = p(2) !== null ? p(2) : dev.device_type;
        dev.protocol = p(3) !== null ? p(3) : dev.protocol;
        dev.project_name = p(4) !== null ? p(4) : dev.project_name;
        dev.location = p(5) !== null ? p(5) : dev.location;
        dev.status = p(6) !== null ? p(6) : dev.status;
        dev.sensor_type = p(7) !== null ? p(7) : dev.sensor_type;
        dev.client_name = p(8) !== null ? p(8) : dev.client_name;
        dev.client_email = p(9) !== null ? p(9) : dev.client_email;
        dev.client_phone = p(10) !== null ? p(10) : dev.client_phone;
        dev.alert_enabled = p(11) !== null ? p(11) : dev.alert_enabled;
      }
    }
    return [{ affectedRows: dev ? 1 : 0 }];
  }

  // 20. DELETE FROM devices WHERE id = ?
  if (normalizedSql.includes('DELETE FROM devices WHERE id = ?')) {
    const id = parseInt(p(0), 10);
    const initialLen = mockDb.devices.length;
    mockDb.devices = mockDb.devices.filter(d => d.id !== id);
    return [{ affectedRows: initialLen - mockDb.devices.length }];
  }

  // 21. MAX(recorded_at) AS last_recorded FROM sensor_data WHERE device_id = ?
  if (normalizedSql.includes('MAX(recorded_at) AS last_recorded FROM sensor_data WHERE device_id = ?')) {
    const devId = parseInt(p(0), 10);
    const data = mockDb.sensor_data.filter(s => s.device_id === devId);
    if (data.length === 0) return [[{ last_recorded: null }]];
    const maxVal = data.reduce((max, s) => new Date(s.recorded_at) > new Date(max.recorded_at) ? s : max, data[0]);
    return [[{ last_recorded: maxVal.recorded_at }]];
  }

  // 22. SELECT sensor_name, sensor_value FROM sensor_data WHERE device_id = ?
  if (normalizedSql.includes('SELECT sensor_name, sensor_value FROM sensor_data WHERE device_id = ?')) {
    const devId = parseInt(p(0), 10);
    const data = mockDb.sensor_data
      .filter(s => s.device_id === devId)
      .sort((a, b) => {
        const timeDiff = new Date(b.recorded_at) - new Date(a.recorded_at);
        if (timeDiff !== 0) return timeDiff;
        return b.id - a.id;
      })
      .slice(0, 50);
    return [data];
  }

  // 23. INSERT INTO sensor_data
  if (normalizedSql.includes('INSERT INTO sensor_data')) {
    if (normalizedSql.includes('VALUES ?')) {
      const rows = p(0);
      rows.forEach(r => {
        mockDb.sensor_data.push({
          id: mockDb.sensor_data.length + 1,
          device_id: r[0],
          sensor_name: r[1],
          sensor_value: String(r[2]),
          recorded_at: r[3] || new Date().toISOString()
        });
      });
      return [{ affectedRows: rows.length }];
    } else {
      let device_id = null;
      let sensor_name = '';
      let sensor_value = '';
      let recorded_at = null;

      if (normalizedSql.includes("'Smoke Level'")) {
        device_id = p(0);
        sensor_name = 'Smoke Level';
        if (normalizedSql.includes("'85.0'")) {
          sensor_value = '85.0';
        } else if (normalizedSql.includes("'88.5'")) {
          sensor_value = '88.5';
        } else {
          sensor_value = '0.0';
        }
        recorded_at = p(1);
      } else {
        device_id = p(0);
        sensor_name = p(1);
        sensor_value = p(2);
        recorded_at = p(3);
      }

      const row = {
        id: mockDb.sensor_data.length + 1,
        device_id: device_id,
        sensor_name: sensor_name,
        sensor_value: String(sensor_value),
        recorded_at: recorded_at || new Date().toISOString()
      };
      mockDb.sensor_data.push(row);
      return [{ insertId: row.id }];
    }
  }

  // 24. UPDATE sensor_data SET recorded_at = ? WHERE device_id = ?
  if (normalizedSql.includes('UPDATE sensor_data SET recorded_at = ? WHERE device_id = ?')) {
    const recordedAt = p(0);
    const devId = parseInt(p(1), 10);
    let count = 0;
    mockDb.sensor_data.forEach(s => {
      if (s.device_id === devId) {
        s.recorded_at = recordedAt;
        count++;
      }
    });
    return [{ affectedRows: count }];
  }

  // 25. DELETE FROM sensor_data WHERE device_id = ?
  if (normalizedSql.includes('DELETE FROM sensor_data WHERE device_id = ?')) {
    const devId = parseInt(p(0), 10);
    const initialLen = mockDb.sensor_data.length;
    mockDb.sensor_data = mockDb.sensor_data.filter(s => s.device_id !== devId);
    return [{ affectedRows: initialLen - mockDb.sensor_data.length }];
  }

  // 26. SELECT COUNT(*) AS total FROM alerts
  if (normalizedSql.includes('SELECT COUNT(*) AS total FROM alerts')) {
    let list = [...mockDb.alerts];
    if (normalizedSql.includes('a.status = ?')) {
      list = list.filter(a => a.status === p(0));
    }
    if (normalizedSql.includes('a.severity = ?')) {
      const idx = normalizedSql.includes('a.status = ?') ? 1 : 0;
      list = list.filter(a => a.severity === params[idx]);
    }
    if (normalizedSql.includes('a.device_id = ?')) {
      const idx = params.length - 1;
      list = list.filter(a => a.device_id === parseInt(params[idx], 10));
    }
    return [[{ total: list.length }]];
  }

  // 26b. SELECT COUNT(*) AS totalAlerts FROM alerts WHERE status != "Resolved"
  if (normalizedSql.includes('SELECT COUNT(*) AS totalAlerts FROM alerts')) {
    const activeAlerts = mockDb.alerts.filter(a => a.status !== 'Resolved').length;
    return [[{ totalAlerts: activeAlerts }]];
  }

  // 27. SELECT COUNT(*) AS count FROM alerts WHERE status = 'Active'
  if (normalizedSql.includes("SELECT COUNT(*) AS count FROM alerts WHERE status = 'Active'")) {
    return [[{ count: mockDb.alerts.filter(a => a.status === 'Active').length }]];
  }

  // 28. SELECT COUNT(*) AS total, COALESCE... FROM alerts
  if (normalizedSql.includes('SELECT COUNT(*) AS total,') && normalizedSql.includes('FROM alerts')) {
    const total = mockDb.alerts.length;
    const active = mockDb.alerts.filter(a => a.status === 'Active').length;
    const acknowledged = mockDb.alerts.filter(a => a.status === 'Acknowledged').length;
    const resolved = mockDb.alerts.filter(a => a.status === 'Resolved').length;
    const critical = mockDb.alerts.filter(a => a.severity === 'Critical').length;
    const high = mockDb.alerts.filter(a => a.severity === 'High').length;
    const medium = mockDb.alerts.filter(a => a.severity === 'Medium').length;
    const low = mockDb.alerts.filter(a => a.severity === 'Low').length;
    return [[{ total, active, acknowledged, resolved, critical, high, medium, low }]];
  }

  // 29. SELECT * FROM alerts WHERE id = ?
  if (normalizedSql.includes('FROM alerts WHERE id = ?')) {
    const id = parseInt(p(0), 10);
    const alert = mockDb.alerts.find(a => a.id === id);
    return [alert ? [alert] : []];
  }

  // 30. SELECT id, created_at, status FROM alerts WHERE device_id = ? AND metric_name = ? AND status != 'Resolved'
  if (normalizedSql.includes('FROM alerts WHERE device_id = ? AND metric_name = ? AND status != \'Resolved\'')) {
    const deviceId = parseInt(p(0), 10);
    const metricName = p(1);
    const row = mockDb.alerts
      .filter(a => a.device_id === deviceId && a.metric_name === metricName && a.status !== 'Resolved')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return [row ? [row] : []];
  }

  // 31. INSERT INTO alerts
  if (normalizedSql.includes('INSERT INTO alerts')) {
    if (normalizedSql.includes('is_test_alert')) {
      const alert = {
        id: mockDb.alerts.length > 0 ? Math.max(...mockDb.alerts.map(a => a.id)) + 1 : 1,
        device_id: p(0),
        device_name: p(1),
        sensor_type: p(2),
        metric_name: p(3),
        metric_value: String(p(4)),
        threshold_value: String(p(5)),
        severity: p(6),
        status: p(7),
        message: p(8),
        email_sent: p(9),
        is_test_alert: p(10),
        created_at: p(11) || new Date().toISOString()
      };
      mockDb.alerts.push(alert);
      return [{ insertId: alert.id }];
    }

    const alert = {
      id: mockDb.alerts.length > 0 ? Math.max(...mockDb.alerts.map(a => a.id)) + 1 : 1,
      device_id: p(0),
      device_name: p(1),
      sensor_type: p(2),
      metric_name: p(3),
      metric_value: String(p(4)),
      threshold_value: String(p(5)),
      severity: p(6),
      email_sent: 0
    };

    if (normalizedSql.includes("'Active'")) {
      alert.status = 'Active';
      alert.message = p(7);
      alert.created_at = p(8) || new Date().toISOString();
    } else {
      alert.status = p(7) || 'Active';
      alert.message = p(8);
      alert.created_at = new Date().toISOString();
    }

    mockDb.alerts.push(alert);
    return [{ insertId: alert.id }];
  }

  // 32. UPDATE alerts SET
  if (normalizedSql.includes('UPDATE alerts SET')) {
    if (normalizedSql.includes('is_test_alert = 1')) {
      const cutoffTime = new Date(p(0));
      let count = 0;
      mockDb.alerts.forEach(a => {
        if (a.is_test_alert && a.status !== 'Resolved' && new Date(a.created_at) < cutoffTime) {
          a.status = 'Resolved';
          a.resolved_at = new Date().toISOString();
          count++;
        }
      });
      return [{ affectedRows: count }];
    }

    if (normalizedSql.includes("status = 'Acknowledged'")) {
      const id = parseInt(p(0), 10);
      const alert = mockDb.alerts.find(a => a.id === id);
      if (alert) {
        alert.status = 'Acknowledged';
        alert.acknowledged_at = new Date().toISOString();
      }
      return [{ affectedRows: alert ? 1 : 0 }];
    } else if (normalizedSql.includes("status = 'Resolved'") && normalizedSql.includes('resolved_at = NOW()')) {
      const id = parseInt(p(0), 10);
      const alert = mockDb.alerts.find(a => a.id === id);
      if (alert) {
        alert.status = 'Resolved';
        alert.resolved_at = new Date().toISOString();
      }
      return [{ affectedRows: alert ? 1 : 0 }];
    } else if (normalizedSql.includes('metric_value = ?') && normalizedSql.includes('message = ?')) {
      const val = p(0);
      const msg = p(1);
      const id = parseInt(p(2), 10);
      const alert = mockDb.alerts.find(a => a.id === id);
      if (alert) {
        alert.metric_value = String(val);
        alert.message = msg;
      }
      return [{ affectedRows: alert ? 1 : 0 }];
    } else if (normalizedSql.includes('status = \'Resolved\'') && normalizedSql.includes('resolved_at = ?')) {
      const resolvedAt = p(0);
      const deviceId = parseInt(p(1), 10);
      const metricName = p(2);
      let count = 0;
      mockDb.alerts.forEach(a => {
        if (a.device_id === deviceId && a.metric_name === metricName && a.status !== 'Resolved') {
          a.status = 'Resolved';
          a.resolved_at = resolvedAt;
          count++;
        }
      });
      return [{ affectedRows: count }];
    } else if (normalizedSql.includes('email_sent = 1')) {
      const id = parseInt(p(0), 10);
      const alert = mockDb.alerts.find(a => a.id === id);
      if (alert) alert.email_sent = 1;
      return [{ affectedRows: alert ? 1 : 0 }];
    }
  }

  // 33. DELETE FROM alerts WHERE device_id = ?
  if (normalizedSql.includes('DELETE FROM alerts WHERE device_id = ?')) {
    const devId = parseInt(p(0), 10);
    const initialLen = mockDb.alerts.length;
    mockDb.alerts = mockDb.alerts.filter(a => a.device_id !== devId);
    return [{ affectedRows: initialLen - mockDb.alerts.length }];
  }

  // 34. SELECT a.id, a.device_id, ... FROM alerts a
  if (normalizedSql.includes('FROM alerts a') || normalizedSql.includes('FROM alerts')) {
    let list = [...mockDb.alerts];
    
    if (normalizedSql.includes('a.status = ?')) {
      list = list.filter(a => a.status === p(0));
    }
    if (normalizedSql.includes('a.severity = ?')) {
      const idx = normalizedSql.includes('a.status = ?') ? 1 : 0;
      list = list.filter(a => a.severity === params[idx]);
    }
    if (normalizedSql.includes('a.device_id = ?')) {
      const idx = params.length - 3;
      list = list.filter(a => a.device_id === parseInt(params[idx], 10));
    }

    let enriched = list.map(a => {
      const dev = mockDb.devices.find(d => d.id === a.device_id) || {};
      return {
        ...a,
        device_code: dev.device_code || '',
        client_name: dev.client_name || '',
        client_email: dev.client_email || '',
        client_phone: dev.client_phone || '',
        project_name: dev.project_name || '',
        location: dev.location || ''
      };
    });

    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (normalizedSql.includes('LIMIT ? OFFSET ?')) {
      const limit = parseInt(params[params.length - 2], 10);
      const offset = parseInt(params[params.length - 1], 10);
      const paginated = enriched.slice(offset, offset + limit);
      return [paginated];
    }

    return [enriched];
  }

  console.log(`[MockDB] Warning: Unhandled SQL query: "${normalizedSql}"`, params);
  return [[]];
}

// Test database connection
async function testConnection() {
  await connectionCheckPromise;
}

// Wrap connection pool to dynamically route queries when in mock mode
const pool = {
  async query(sql, params) {
    await connectionCheckPromise;
    if (isMockMode) {
      return mockQuery(sql, params);
    }
    return realPool.query(sql, params);
  },
  async execute(sql, params) {
    await connectionCheckPromise;
    if (isMockMode) {
      return mockQuery(sql, params);
    }
    return realPool.execute(sql, params);
  },
  async getConnection() {
    await connectionCheckPromise;
    if (isMockMode) {
      return {
        async query(sql, params) { return mockQuery(sql, params); },
        async execute(sql, params) { return mockQuery(sql, params); },
        release() {}
      };
    }
    return realPool.getConnection();
  },
  on(event, handler) {
    if (!isMockMode) {
      realPool.on(event, handler);
    }
  },
  end() {
    if (isMockMode) return Promise.resolve();
    return realPool.end();
  }
};

module.exports = {
  pool,
  testConnection,
  getIsMockMode: () => isMockMode
};
