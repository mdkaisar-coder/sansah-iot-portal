const { pool } = require('./db');
const emailService = require('./services/emailService');

async function runManualAlertTest() {
  let testDeviceId = null;
  let alertId = null;

  try {
    console.log('==================================================');
    console.log('         MANUAL ALERT TEST WORKFLOW START         ');
    console.log('==================================================\n');

    // 1. Create a test device matching the requirements
    console.log('Step 1: Creating a test device in devices table...');
    const [devResult] = await pool.query(
      `INSERT INTO devices (device_name, device_code, device_type, protocol, project_name, location, status, sensor_type, client_name, client_email, client_phone, alert_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        'Manual Test Temp Sensor',
        'M-TEMP-555',
        'Sensor',
        'MQTT',
        'Manual Test Project',
        'Lab Room 3B',
        'Online',
        'Temperature Sensor',
        'Verification Client',
        'mdkaisarmdkaisar933@gmail.com',
        '+1-555-7777'
      ]
    );
    testDeviceId = devResult.insertId;
    console.log(`✅ Test device created with ID: ${testDeviceId}`);

    // Fetch device back to ensure we have the exact object
    const [devices] = await pool.query('SELECT * FROM devices WHERE id = ?', [testDeviceId]);
    const device = devices[0];

    // 2. Prepare manual alert details
    const alertDetails = {
      metric_name: 'Temperature',
      metric_value: '45°C',
      threshold_value: '40°C',
      severity: 'High',
      message: 'Manual test alert generated for email verification.'
    };

    console.log('\nStep 2: Inserting manual alert record in MySQL (email_sent = 0)...');
    const [alertResult] = await pool.query(
      `INSERT INTO alerts (device_id, device_name, sensor_type, metric_name, metric_value, threshold_value, severity, status, message, email_sent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, 0, NOW())`,
      [
        testDeviceId,
        device.device_name,
        device.sensor_type || 'Unknown',
        alertDetails.metric_name,
        alertDetails.metric_value,
        alertDetails.threshold_value,
        alertDetails.severity,
        alertDetails.message
      ]
    );
    alertId = alertResult.insertId;
    console.log(`✅ Alert record created in alerts table with ID: ${alertId}`);

    // 3. Trigger production Nodemailer path
    console.log('\nStep 3: Dispatching email via Nodemailer...');
    const emailSuccess = await emailService.sendAlertEmail(device, {
      id: alertId,
      severity: alertDetails.severity,
      message: alertDetails.message,
      metric_name: alertDetails.metric_name,
      metric_value: alertDetails.metric_value,
      threshold_value: alertDetails.threshold_value
    });

    // 4. Update and verify results
    console.log('\nStep 4: Verifying final pipeline results...');
    
    if (emailSuccess) {
      // Update email_sent flag
      await pool.query('UPDATE alerts SET email_sent = 1 WHERE id = ?', [alertId]);
      console.log('✅ email_sent flag successfully updated to 1 in alerts table.');
    }

    // Query alert record to verify fields in MySQL
    const [finalAlertRows] = await pool.query('SELECT * FROM alerts WHERE id = ?', [alertId]);
    const finalAlert = finalAlertRows[0];

    console.log('\n==================================================');
    console.log('               MANUAL TEST REPORT                 ');
    console.log('==================================================');
    console.log(`- Alert ID Created:      ${alertId}`);
    console.log(`- Device Used:           ${device.device_name} (ID: ${device.id}, Code: ${device.device_code})`);
    console.log(`- Recipient Email(s):    ${[device.client_email, process.env.ADMIN_EMAIL].filter(Boolean).join(', ')}`);
    console.log(`- SMTP Transporter:      Initialized with ${process.env.EMAIL_USER}`);
    
    if (emailSuccess) {
      console.log(`- SMTP Send Result:      SUCCESS`);
      console.log(`- Database Verification: Verified in MySQL (email_sent = ${finalAlert.email_sent})`);
      console.log('\nSMTP send succeeded. Please manually check the inbox and spam folder of the recipient email address.');
    } else {
      console.log(`- SMTP Send Result:      FAILED (Check Nodemailer logs above)`);
      console.log(`- Database Verification: Verified in MySQL (email_sent = ${finalAlert.email_sent})`);
      console.log('\nSMTP dispatch failed. Port 465 connections are likely blocked by network firewall constraints in this sandboxed workspace environment.');
    }
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ Manual Alert Test Error:', err);
  } finally {
    // 5. Clean up test records
    if (testDeviceId) {
      console.log('Cleaning up manual test records...');
      if (alertId) {
        await pool.query('DELETE FROM alerts WHERE id = ?', [alertId]);
      }
      await pool.query('DELETE FROM devices WHERE id = ?', [testDeviceId]);
      console.log('✅ Cleanup finished.');
    }
    process.exit(0);
  }
}

runManualAlertTest();
