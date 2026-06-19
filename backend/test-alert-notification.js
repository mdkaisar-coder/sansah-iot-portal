const { pool } = require('./db');
const { checkAndCreateAlerts } = require('./services/telemetryService');
const emailService = require('./services/emailService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runE2ETest() {
  let testDeviceId = null;
  let firstAlertId = null;

  try {
    console.log('==================================================');
    console.log('       IOT ALERTS SYSTEM E2E VERIFICATION TEST     ');
    console.log('==================================================\n');

    // 1. Create a temporary test device
    console.log('Step 1: Creating temporary test device...');
    const [devResult] = await pool.query(
      `INSERT INTO devices (device_name, device_code, device_type, protocol, project_name, location, status, sensor_type, client_name, client_email, client_phone, alert_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        'Alert Test Device',
        'E2E-ALERT-TEST-DEV',
        'Sensor',
        'MQTT',
        'Email Alert Testing',
        'Lab Bench 1',
        'Online',
        'Temperature Sensor',
        'Test Client',
        'mohammadkaisar933@gmail.com',
        '9999999999'
      ]
    );
    testDeviceId = devResult.insertId;
    console.log(`✅ Test device registered successfully in MySQL (ID: ${testDeviceId}).`);

    // 2. Verify device exists in MySQL
    console.log('\nStep 2: Verifying device presence in database...');
    const [deviceRows] = await pool.query('SELECT * FROM devices WHERE id = ?', [testDeviceId]);
    if (deviceRows.length === 0) {
      throw new Error('Test device not found in MySQL after insertion.');
    }
    console.log('Device DB Record:');
    console.table(deviceRows);

    // 3. Force alert creation through production logic
    console.log('\nStep 3: Simulating telemetry threshold violation (Temperature = 55.0°C, Limit = 40.0°C)...');
    
    // Seed telemetry reading in sensor_data first
    await pool.query(
      "INSERT INTO sensor_data (device_id, sensor_name, sensor_value, recorded_at) VALUES (?, 'Temperature', '55.0', NOW())",
      [testDeviceId]
    );
    console.log('✅ Telemetry reading seeded in sensor_data table.');

    // Trigger checkAndCreateAlerts using exact same production code path
    await checkAndCreateAlerts(testDeviceId, { Temperature: 55.0 });

    // 4. Verify Database Alert Record
    console.log('\nStep 4: Querying alerts table to verify database entry...');
    const [alertRows] = await pool.query(
      'SELECT * FROM alerts WHERE device_id = ? ORDER BY created_at DESC LIMIT 1',
      [testDeviceId]
    );

    if (alertRows.length === 0) {
      throw new Error('❌ Alert record was not created in alerts table.');
    }

    const firstAlert = alertRows[0];
    firstAlertId = firstAlert.id;
    console.log('✅ Database Alert Record Created:');
    console.log(JSON.stringify(firstAlert, null, 2));

    // Assertions
    const isStatusOk = firstAlert.status === 'Active';
    const isSeverityOk = firstAlert.severity === 'Critical';
    const isMetricOk = firstAlert.metric_name === 'Temperature';
    const isEmailSentOk = firstAlert.email_sent === 1;

    console.log(`\nDatabase Assertions:`);
    console.log(`- Status = Active?         ${isStatusOk ? '✅' : '❌'} (${firstAlert.status})`);
    console.log(`- Severity = Critical?     ${isSeverityOk ? '✅' : '❌'} (${firstAlert.severity})`);
    console.log(`- Metric = Temperature?    ${isMetricOk ? '✅' : '❌'} (${firstAlert.metric_name})`);
    console.log(`- Email Sent = true (1)?   ${isEmailSentOk ? '✅' : '❌'} (${firstAlert.email_sent})`);

    // 5. Verify Duplicate Protection
    console.log('\nStep 5: Simulating immediate subsequent alert (Temperature = 56.0°C, under 15-min cooldown)...');
    
    // Seed duplicate high reading
    await pool.query(
      "INSERT INTO sensor_data (device_id, sensor_name, sensor_value, recorded_at) VALUES (?, 'Temperature', '56.0', NOW())",
      [testDeviceId]
    );

    // Call production alert logic again
    await checkAndCreateAlerts(testDeviceId, { Temperature: 56.0 });

    // Check alerts in database
    const [allAlerts] = await pool.query('SELECT * FROM alerts WHERE device_id = ?', [testDeviceId]);
    console.log(`\nAlerts list in database after duplicate trigger (Total alerts: ${allAlerts.length}):`);
    console.table(allAlerts);

    const isDuplicateProtected = allAlerts.length === 1 && allAlerts[0].id === firstAlertId;
    const isValueUpdated = allAlerts[0].metric_value === '56';

    console.log(`\nDuplicate Protection Assertions:`);
    console.log(`- Exactly 1 alert record?  ${isDuplicateProtected ? '✅' : '❌'}`);
    console.log(`- Metric value updated?    ${isValueUpdated ? '✅' : '❌'} (Old: ${firstAlert.metric_value}, New: ${allAlerts[0].metric_value})`);

    // 6. Final Report Summary
    console.log('\n==================================================');
    console.log('               FINAL E2E TEST REPORT              ');
    console.log('==================================================');
    console.log(`1. Alert Database Record:\n${JSON.stringify(allAlerts[0], null, 2)}`);
    console.log(`2. Client Email:          mohammadkaisar933@gmail.com`);
    console.log(`3. Admin Email:           ${process.env.ADMIN_EMAIL}`);
    console.log(`4. SMTP User:             ${process.env.EMAIL_USER}`);
    console.log(`5. SMTP Transporter Send: ${isEmailSentOk ? 'SUCCESS' : 'FAILED'}`);
    console.log(`6. Duplicate Protection:  ${(isDuplicateProtected && isValueUpdated) ? 'SUCCESS (Alert value updated in-place, email throttled)' : 'FAILED'}`);
    console.log(`7. Errors Found:          ${(isStatusOk && isSeverityOk && isMetricOk && isEmailSentOk && isDuplicateProtected && isValueUpdated) ? 'NONE' : 'Check assertions failed'}`);
    console.log(`8. E2E Test Overall:      ${(isStatusOk && isSeverityOk && isMetricOk && isEmailSentOk && isDuplicateProtected && isValueUpdated) ? 'PASSED' : 'FAILED'}`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ E2E Alert verification failed:', err);
  } finally {
    // Clean up test records
    if (testDeviceId) {
      console.log('Cleaning up temporary test records from MySQL...');
      await pool.query('DELETE FROM alerts WHERE device_id = ?', [testDeviceId]);
      await pool.query('DELETE FROM sensor_data WHERE device_id = ?', [testDeviceId]);
      await pool.query('DELETE FROM devices WHERE id = ?', [testDeviceId]);
      console.log('✅ Cleanup complete. Database restored.');
    }
    process.exit(0);
  }
}

runE2ETest();
