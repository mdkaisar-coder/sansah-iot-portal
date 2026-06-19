const { pool } = require('../db');
const bcrypt = require('bcrypt');

class SettingsService {
  async initSettingsTable() {
    try {
      console.log('SettingsService: Initializing settings table schema...');
      const createQuery = `
        CREATE TABLE IF NOT EXISTS settings (
          setting_key VARCHAR(50) PRIMARY KEY,
          setting_value TEXT NOT NULL
        )
      `;
      await pool.query(createQuery);
      console.log('✅ SettingsService: settings table initialized.');
    } catch (err) {
      console.error('SettingsService error: Failed to init settings table:', err.message);
      throw err;
    }
  }

  async seedDefaultSettings() {
    try {
      const now = new Date();
      console.log('SettingsService: Seeding default configurations...');

      // Helper helper to get or insert setting
      const ensureSetting = async (key, defaultValue) => {
        const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', [key]);
        if (rows.length === 0) {
          await pool.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, defaultValue]);
          console.log(`SettingsService: Seeded default setting [${key}] = "${defaultValue}"`);
          return defaultValue;
        }
        return rows[0].setting_value;
      };

      // Seed core settings
      const adminUsername = await ensureSetting('admin_username', 'admin');
      await ensureSetting('admin_email', process.env.ADMIN_EMAIL || 'admin@iotportal.local');
      await ensureSetting('send_admin_emails', 'true');
      await ensureSetting('send_client_emails', 'true');

      // Ensure the admin user credentials row exists in the users table
      const [userRows] = await pool.query('SELECT * FROM users WHERE email = ?', [adminUsername]);
      if (userRows.length === 0) {
        console.log(`SettingsService: Admin user "${adminUsername}" not found in users table. Seeding default Admin...`);
        const defaultPassHash = await bcrypt.hash('admin@123', 10);
        await pool.query(
          'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
          ['Admin Operations', adminUsername, defaultPassHash]
        );
        console.log(`✅ SettingsService: Default admin user "${adminUsername}" created with password "admin@123".`);
      } else {
        console.log(`SettingsService: Admin user "${adminUsername}" verified in database.`);
      }
    } catch (err) {
      console.error('SettingsService error: Seeding failed:', err.message);
      throw err;
    }
  }

  async getSettings() {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const config = {};
    rows.forEach(row => {
      let val = row.setting_value;
      if (val === 'true') val = true;
      if (val === 'false') val = false;
      config[row.setting_key] = val;
    });

    return {
      username: config.admin_username || 'admin',
      admin_email: config.admin_email || '',
      send_admin_emails: config.send_admin_emails !== false,
      send_client_emails: config.send_client_emails !== false
    };
  }

  async updateAdminCredentials(newUsername, newPassword) {
    // 1. Get current username
    const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = "admin_username"');
    const currentUsername = rows[0]?.setting_value || 'admin';

    // 2. Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 3. Check if user already exists
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [currentUsername]);
    
    if (existingUsers.length > 0) {
      // Update existing admin user record
      await pool.query(
        'UPDATE users SET email = ?, password = ? WHERE email = ?',
        [newUsername, passwordHash, currentUsername]
      );
      console.log(`SettingsService: Updated admin credentials row in users table. User email changed: ${currentUsername} -> ${newUsername}`);
    } else {
      // Insert new admin user record
      await pool.query(
        'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
        ['Admin Operations', newUsername, passwordHash]
      );
      console.log(`SettingsService: Inserted admin user row: ${newUsername}`);
    }

    // 4. Update the settings table pointer
    await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = "admin_username"', [newUsername]);
    return true;
  }

  async updateEmailSettings(settings) {
    const { admin_email, send_admin_emails, send_client_emails } = settings;

    const updateSetting = async (key, val) => {
      await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [String(val), key]);
    };

    await updateSetting('admin_email', admin_email);
    await updateSetting('send_admin_emails', send_admin_emails);
    await updateSetting('send_client_emails', send_client_emails);
    console.log('SettingsService: Email alerts preferences updated successfully.');
    return true;
  }
}

module.exports = new SettingsService();
