const https = require('https');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function verifyProduction() {
  const report = {};
  let testDeviceId = null;
  let token = null;

  try {
    console.log('==================================================');
    console.log('    Sansah IoT Portal Production Verification     ');
    console.log('==================================================\n');

    // 1. Health check
    console.log('Task 1: Querying Production Health Check...');
    const healthRes = await makeRequest({
      hostname: 'sansah-backend.onrender.com',
      path: '/api/health',
      method: 'GET'
    });
    console.log('Health Status Code:', healthRes.statusCode);
    console.log('Health Body:', healthRes.body);
    const healthJson = JSON.parse(healthRes.body);
    if (healthRes.statusCode === 200 && healthJson.status === 'healthy' && healthJson.database === 'connected' && healthJson.email === 'connected') {
      report.healthCheck = 'PASS';
    } else {
      report.healthCheck = 'FAIL';
    }

    // 2. Login verification
    console.log('\nTask 2: Testing Login functionality...');
    const loginRes = await makeRequest({
      hostname: 'sansah-backend.onrender.com',
      path: '/api/users/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'admin',
      password: 'admin@123'
    });
    console.log('Login Status Code:', loginRes.statusCode);
    console.log('Login Body:', loginRes.body);
    const loginJson = JSON.parse(loginRes.body);
    if (loginRes.statusCode === 200 && loginJson.success && loginJson.data.email === 'admin') {
      report.login = 'PASS';
      token = loginJson.data.token;
      console.log('✅ JWT Authentication token parsed:', token ? 'SUCCESS (token length: ' + token.length + ')' : 'FAILED');
    } else {
      report.login = 'FAIL';
    }

    // 3. Register Device (Create)
    console.log('\nTask 3: Registering a new test device...');
    const createRes = await makeRequest({
      hostname: 'sansah-backend.onrender.com',
      path: '/api/devices',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, {
      device_name: 'Production E2E Verified Smoke Sensor',
      device_code: 'PROD-SMOKE-888',
      device_type: 'Sensor',
      protocol: 'MQTT',
      project_name: 'Production Verification',
      location: 'Server Room',
      sensor_type: 'Smoke Sensor',
      client_name: 'Test Client',
      client_email: 'mdkaisarmdkaisar933@gmail.com', // Must be verified email in Resend sandbox
      client_phone: '+1-555-8888',
      alert_enabled: true
    });
    console.log('Create Device Status Code:', createRes.statusCode);
    console.log('Create Device Body:', createRes.body);
    const createJson = JSON.parse(createRes.body);
    if (createRes.statusCode === 201 && createJson.success && createJson.data.id) {
      testDeviceId = createJson.data.id;
      report.createDevice = 'PASS';
    } else {
      report.createDevice = 'FAIL';
    }

    // 4. Retrieve Device (Read)
    if (testDeviceId) {
      console.log('\nTask 4: Retrieving device details...');
      const readRes = await makeRequest({
        hostname: 'sansah-backend.onrender.com',
        path: `/api/devices/${testDeviceId}`,
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      console.log('Get Device Status Code:', readRes.statusCode);
      console.log('Get Device Body:', readRes.body);
      const readJson = JSON.parse(readRes.body);
      if (readRes.statusCode === 200 && readJson.success && readJson.data.client_email === 'mdkaisarmdkaisar933@gmail.com') {
        report.readDevice = 'PASS';
      } else {
        report.readDevice = 'FAIL';
      }

      // 5. Update Device
      console.log('\nTask 5: Updating device location...');
      const updateRes = await makeRequest({
        hostname: 'sansah-backend.onrender.com',
        path: `/api/devices/${testDeviceId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }, {
        location: 'Server Room B3'
      });
      console.log('Update Device Status Code:', updateRes.statusCode);
      console.log('Update Device Body:', updateRes.body);
      const updateJson = JSON.parse(updateRes.body);
      if (updateRes.statusCode === 200 && updateJson.success && updateJson.data.location === 'Server Room B3') {
        report.updateDevice = 'PASS';
      } else {
        report.updateDevice = 'FAIL';
      }

      // 6. Trigger Test Alert (Telemetry violation check & Email delivery)
      console.log('\nTask 6: Triggering test spike alert...');
      const alertRes = await makeRequest({
        hostname: 'sansah-backend.onrender.com',
        path: `/api/devices/${testDeviceId}/test-spike`,
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      console.log('Alert Spike Status Code:', alertRes.statusCode);
      console.log('Alert Spike Body:', alertRes.body);
      const alertJson = JSON.parse(alertRes.body);
      if (alertRes.statusCode === 200 && alertJson.success && alertJson.data.adminEmailSent && alertJson.data.clientEmailSent) {
        report.alertDelivery = 'PASS';
        report.alertDeliveryDetails = `Admin Sent: ${alertJson.data.adminEmailSent}, Client Sent: ${alertJson.data.clientEmailSent}`;
      } else {
        report.alertDelivery = 'FAIL';
        report.alertDeliveryDetails = alertJson.message || 'Alert trigger failed';
      }

      // 7. Delete Device
      console.log('\nTask 7: Deleting test device...');
      const deleteRes = await makeRequest({
        hostname: 'sansah-backend.onrender.com',
        path: `/api/devices/${testDeviceId}`,
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      console.log('Delete Device Status Code:', deleteRes.statusCode);
      console.log('Delete Device Body:', deleteRes.body);
      const deleteJson = JSON.parse(deleteRes.body);
      if (deleteRes.statusCode === 200 && deleteJson.success) {
        report.deleteDevice = 'PASS';
      } else {
        report.deleteDevice = 'FAIL';
      }
    } else {
      report.readDevice = 'FAIL (No Device Created)';
      report.updateDevice = 'FAIL (No Device Created)';
      report.alertDelivery = 'FAIL (No Device Created)';
      report.deleteDevice = 'FAIL (No Device Created)';
    }

  } catch (err) {
    console.error('Error during production verification:', err);
    report.exception = err.message;
  } finally {
    console.log('\n==================================================');
    console.log('           Production Verification Summary        ');
    console.log('==================================================');
    console.log(JSON.stringify(report, null, 2));
    console.log('==================================================\n');
  }
}

verifyProduction();
