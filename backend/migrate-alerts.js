const { pool } = require('./db');

async function migrate() {
  try {
    console.log('Starting DB migration check for alerts table...');

    // 1. Check if the table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'alerts'");
    
    if (tables.length === 0) {
      console.log('Table "alerts" does not exist. Creating alerts table from scratch...');
      const createTableQuery = `
        CREATE TABLE alerts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_id INT NOT NULL,
          device_name VARCHAR(100) NOT NULL,
          sensor_type VARCHAR(100) NOT NULL,
          metric_name VARCHAR(100) NOT NULL,
          metric_value VARCHAR(100) NOT NULL,
          threshold_value VARCHAR(100) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          status VARCHAR(20) DEFAULT 'Active',
          message TEXT NOT NULL,
          email_sent TINYINT(1) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          acknowledged_at DATETIME NULL,
          resolved_at DATETIME NULL,
          is_test_alert TINYINT(1) DEFAULT 0
        );
      `;
      await pool.query(createTableQuery);
      console.log('Table "alerts" created successfully.');
      process.exit(0);
    }

    console.log('Table "alerts" exists. Inspecting columns...');
    
    // 2. Fetch existing columns
    const [columns] = await pool.query('SHOW COLUMNS FROM alerts');
    const columnNames = columns.map(c => c.Field);
    console.log('Existing columns:', columnNames);

    // 3. Add missing columns incrementally
    if (!columnNames.includes('device_name')) {
      await pool.query("ALTER TABLE alerts ADD COLUMN device_name VARCHAR(100) NOT NULL DEFAULT 'Unknown' AFTER device_id");
      console.log('Added column "device_name".');
    }
    
    if (!columnNames.includes('sensor_type')) {
      await pool.query("ALTER TABLE alerts ADD COLUMN sensor_type VARCHAR(100) NOT NULL DEFAULT 'Unknown' AFTER device_name");
      console.log('Added column "sensor_type".');
    }
    
    if (!columnNames.includes('metric_name')) {
      await pool.query("ALTER TABLE alerts ADD COLUMN metric_name VARCHAR(100) NOT NULL DEFAULT 'Unknown' AFTER sensor_type");
      console.log('Added column "metric_name".');
    }
    
    if (!columnNames.includes('metric_value')) {
      await pool.query("ALTER TABLE alerts ADD COLUMN metric_value VARCHAR(100) NOT NULL DEFAULT '0' AFTER metric_name");
      console.log('Added column "metric_value".');
    }
    
    if (!columnNames.includes('threshold_value')) {
      await pool.query("ALTER TABLE alerts ADD COLUMN threshold_value VARCHAR(100) NOT NULL DEFAULT '0' AFTER metric_value");
      console.log('Added column "threshold_value".');
    }
    
    if (!columnNames.includes('status')) {
      await pool.query("ALTER TABLE alerts ADD COLUMN status VARCHAR(20) DEFAULT 'Active' AFTER severity");
      console.log('Added column "status".');
    }
    
    if (!columnNames.includes('email_sent')) {
      await pool.query("ALTER TABLE alerts ADD COLUMN email_sent TINYINT(1) DEFAULT 0 AFTER message");
      console.log('Added column "email_sent".');
    }
    
    if (!columnNames.includes('acknowledged_at')) {
      await pool.query("ALTER TABLE alerts ADD COLUMN acknowledged_at DATETIME NULL AFTER email_sent");
      console.log('Added column "acknowledged_at".');
    }
    
    if (!columnNames.includes('resolved_at')) {
      await pool.query("ALTER TABLE alerts ADD COLUMN resolved_at DATETIME NULL AFTER acknowledged_at");
      console.log('Added column "resolved_at".');
    }
    
    if (!columnNames.includes('is_test_alert')) {
      await pool.query("ALTER TABLE alerts ADD COLUMN is_test_alert TINYINT(1) DEFAULT 0 AFTER resolved_at");
      console.log('Added column "is_test_alert".');
    }

    // 4. Map values from old structure if applicable
    if (columnNames.includes('is_resolved')) {
      console.log('Migrating data from "is_resolved" to "status" column...');
      await pool.query("UPDATE alerts SET status = 'Resolved', resolved_at = COALESCE(created_at, NOW()) WHERE is_resolved = 1");
      await pool.query("UPDATE alerts SET status = 'Active' WHERE is_resolved = 0 OR is_resolved IS NULL");
      await pool.query("ALTER TABLE alerts DROP COLUMN is_resolved");
      console.log('Dropped old "is_resolved" column.');
    }

    if (columnNames.includes('alert_type') && !columnNames.includes('metric_name')) {
      console.log('Migrating data from "alert_type" to "metric_name" column...');
      await pool.query("UPDATE alerts SET metric_name = alert_type");
    }

    // Drop alert_type column if it exists in the final schema to ensure alignment
    if (columnNames.includes('alert_type')) {
      await pool.query("ALTER TABLE alerts DROP COLUMN alert_type");
      console.log('Dropped old "alert_type" column.');
    }

    console.log('Alerts table schema inspection and migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
