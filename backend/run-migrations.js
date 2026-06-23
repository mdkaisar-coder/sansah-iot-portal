const { pool } = require('./db');

async function run() {
  console.log('==================================================');
  console.log('   IoT Alert System Database Migration Runner     ');
  console.log('==================================================\n');

  try {
    // 1. Create audit_logs table
    console.log('Step 1: Initializing "audit_logs" table...');
    const createAuditLogsQuery = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        username VARCHAR(100) NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT NULL,
        ip_address VARCHAR(45) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createAuditLogsQuery);
    console.log('✅ "audit_logs" table checked/created successfully.\n');

    // 2. Resolve duplicates in devices.device_code
    console.log('Step 2: Checking for duplicate device codes...');
    const [duplicates] = await pool.query(`
      SELECT device_code, COUNT(*) as c 
      FROM devices 
      GROUP BY device_code 
      HAVING c > 1
    `);

    if (duplicates.length > 0) {
      console.warn(`⚠️ Warning: Found ${duplicates.length} duplicate device_code values. Resolving duplicates...`);
      for (const d of duplicates) {
        const [rows] = await pool.query('SELECT id FROM devices WHERE device_code = ? ORDER BY id', [d.device_code]);
        for (let i = 1; i < rows.length; i++) {
          const suffixCode = `${d.device_code}_dup_${i}`;
          await pool.query('UPDATE devices SET device_code = ? WHERE id = ?', [suffixCode, rows[i].id]);
          console.log(`- Renamed duplicate device ID ${rows[i].id} code to: "${suffixCode}"`);
        }
      }
      console.log('✅ Duplicate device codes resolved.');
    } else {
      console.log('✅ No duplicate device codes found.\n');
    }

    // 3. Add UNIQUE constraint to devices.device_code
    console.log('Step 3: Checking UNIQUE constraint on devices.device_code...');
    const [indexes] = await pool.query(`
      SHOW INDEX FROM devices WHERE Key_name = 'unique_device_code'
    `);
    if (indexes.length === 0) {
      console.log('Adding UNIQUE constraint "unique_device_code" to devices(device_code)...');
      await pool.query('ALTER TABLE devices ADD CONSTRAINT unique_device_code UNIQUE (device_code)');
      console.log('✅ UNIQUE constraint "unique_device_code" created successfully.\n');
    } else {
      console.log('✅ UNIQUE constraint "unique_device_code" already exists.\n');
    }

    // 4. Create composite index on sensor_data(device_id, recorded_at)
    console.log('Step 4: Checking composite index on sensor_data(device_id, recorded_at)...');
    const [sensorIndexes] = await pool.query(`
      SHOW INDEX FROM sensor_data WHERE Key_name = 'idx_sensor_device_date'
    `);
    if (sensorIndexes.length === 0) {
      console.log('Creating index "idx_sensor_device_date" on sensor_data(device_id, recorded_at)...');
      await pool.query('CREATE INDEX idx_sensor_device_date ON sensor_data(device_id, recorded_at)');
      console.log('✅ Index "idx_sensor_device_date" created successfully.\n');
    } else {
      console.log('✅ Index "idx_sensor_device_date" already exists.\n');
    }

    // 5. Create index on alerts(device_id, created_at)
    console.log('Step 5: Checking index on alerts(device_id, created_at)...');
    const [alertsIndexes] = await pool.query(`
      SHOW INDEX FROM alerts WHERE Key_name = 'idx_alerts_device_date'
    `);
    if (alertsIndexes.length === 0) {
      console.log('Creating index "idx_alerts_device_date" on alerts(device_id, created_at)...');
      await pool.query('CREATE INDEX idx_alerts_device_date ON alerts(device_id, created_at)');
      console.log('✅ Index "idx_alerts_device_date" created successfully.\n');
    } else {
      console.log('✅ Index "idx_alerts_device_date" already exists.\n');
    }

    // 6. Clean up orphaned alerts and sensor data records
    console.log('Step 6: Cleaning up orphaned sensor_data and alerts rows...');
    const [cleanSensors] = await pool.query('DELETE FROM sensor_data WHERE device_id NOT IN (SELECT id FROM devices)');
    const [cleanAlerts] = await pool.query('DELETE FROM alerts WHERE device_id NOT IN (SELECT id FROM devices)');
    console.log(`✅ Cleaned up ${cleanSensors.affectedRows} orphaned sensor_data rows and ${cleanAlerts.affectedRows} orphaned alerts rows.\n`);

    // 7. Add foreign key constraints with ON DELETE CASCADE
    console.log('Step 7: Checking foreign key constraints for cascading delete...');
    
    // 7a. For sensor_data
    const [sensorFk] = await pool.query(`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sensor_data' AND CONSTRAINT_NAME = 'fk_sensor_data_device'
    `);
    if (sensorFk.length === 0) {
      console.log('Adding FOREIGN KEY "fk_sensor_data_device" to sensor_data(device_id)...');
      await pool.query(`
        ALTER TABLE sensor_data 
        ADD CONSTRAINT fk_sensor_data_device 
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      `);
      console.log('✅ FOREIGN KEY "fk_sensor_data_device" added successfully.');
    } else {
      console.log('✅ FOREIGN KEY "fk_sensor_data_device" already exists.');
    }

    // 7b. For alerts
    const [alertsFk] = await pool.query(`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alerts' AND CONSTRAINT_NAME = 'fk_alerts_device'
    `);
    if (alertsFk.length === 0) {
      console.log('Adding FOREIGN KEY "fk_alerts_device" to alerts(device_id)...');
      await pool.query(`
        ALTER TABLE alerts 
        ADD CONSTRAINT fk_alerts_device 
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      `);
      console.log('✅ FOREIGN KEY "fk_alerts_device" added successfully.\n');
    } else {
      console.log('✅ FOREIGN KEY "fk_alerts_device" already exists.\n');
    }

    // 8. Create email_delivery_logs table
    console.log('Step 8: Initializing "email_delivery_logs" table...');
    const createEmailLogsQuery = `
      CREATE TABLE IF NOT EXISTS email_delivery_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        alert_id INT NOT NULL,
        recipient VARCHAR(100) NOT NULL,
        success TINYINT(1) NOT NULL,
        failure_reason VARCHAR(255) NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createEmailLogsQuery);
    console.log('✅ "email_delivery_logs" table checked/created successfully.\n');

    console.log('==================================================');
    console.log('    Database migration executed successfully!     ');
    console.log('==================================================');
    process.exit(0);

  } catch (err) {
    console.error('❌ Database migration failed during execution:', err);
    process.exit(1);
  }
}

run();
