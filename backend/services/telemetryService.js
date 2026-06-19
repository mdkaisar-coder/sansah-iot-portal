const { pool } = require('../db');
const emailService = require('./emailService');

// Helper to generate gradual changes for numbers
function generateGradual(lastVal, minVal, maxVal, step, decimals = 1) {
  if (lastVal === undefined || lastVal === null || isNaN(Number(lastVal))) {
    return Number((minVal + Math.random() * (maxVal - minVal)).toFixed(decimals));
  }
  const current = Number(lastVal);
  const delta = (Math.random() - 0.5) * 2 * step;
  let newVal = current + delta;
  if (newVal < minVal) newVal = minVal;
  if (newVal > maxVal) newVal = maxVal;
  return Number(newVal.toFixed(decimals));
}

// Realistic battery drain generator
function generateBattery(lastVal) {
  if (lastVal === undefined || lastVal === null || isNaN(Number(lastVal))) {
    return 100;
  }
  const current = Number(lastVal);
  if (current <= 5) return 100; // Reset battery to 100 when depleted for continuity
  // 30% chance to drop by 1%
  const drop = Math.random() < 0.3 ? 1 : 0;
  return current - drop;
}

// Realistic signal strength fluctuation generator
function generateSignalStrength(lastVal) {
  if (lastVal === undefined || lastVal === null || isNaN(Number(lastVal))) {
    return 85;
  }
  const current = Number(lastVal);
  const delta = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
  let newVal = current + delta;
  if (newVal < 40) newVal = 40;
  if (newVal > 100) newVal = 100;
  return newVal;
}

// Helper to derive overall device status from current metrics
function deriveOverallStatus(metrics, deviceCategory) {
  let worstStatus = 'Normal';

  const updateWorst = (status) => {
    const severityOrder = { 'Normal': 0, 'Warning': 1, 'Alert': 2, 'Critical': 3 };
    if (severityOrder[status] > severityOrder[worstStatus]) {
      worstStatus = status;
    }
  };

  // Evaluate Temperature
  if (metrics['Temperature'] !== undefined) {
    const val = Number(metrics['Temperature']);
    if (val > 50) updateWorst('Critical');
    else if (val > 40) updateWorst('Alert');
    else if (val >= 35) updateWorst('Warning');
  }

  // Evaluate Battery
  const batteryVal = metrics['Battery'] !== undefined ? metrics['Battery'] : metrics['Battery Level'];
  if (batteryVal !== undefined) {
    const val = Number(batteryVal);
    if (val < 10) updateWorst('Critical');
    else if (val < 20) updateWorst('Alert');
    else if (val <= 30) updateWorst('Warning');
  }

  // Evaluate Signal Strength
  if (metrics['Signal Strength'] !== undefined) {
    const val = Number(metrics['Signal Strength']);
    if (val < 20) updateWorst('Critical');
    else if (val < 40) updateWorst('Alert');
    else if (val <= 60) updateWorst('Warning');
  }

  // Evaluate Category-specific thresholds
  if (deviceCategory === 'Smoke Sensor' && metrics['Smoke Level'] !== undefined) {
    const val = Number(metrics['Smoke Level']);
    if (val > 70) updateWorst('Critical');
    else if (val > 45) updateWorst('Warning');
  }

  if (deviceCategory === 'Gas Sensor' && metrics['Gas Concentration'] !== undefined) {
    const val = Number(metrics['Gas Concentration']);
    if (val > 700) updateWorst('Critical');
    else if (val > 350) updateWorst('Warning');
  }

  return worstStatus;
}

// Helper to generate cumulative increasing numbers
function generateCumulative(lastVal, initialVal, step, decimals = 2) {
  if (lastVal === undefined || lastVal === null || isNaN(Number(lastVal))) {
    return Number(initialVal.toFixed(decimals));
  }
  const current = Number(lastVal);
  const increment = Math.random() * step;
  return Number((current + increment).toFixed(decimals));
}

// GPS coordinates slow movement helper
function generateGPS(lastVal, baseVal, maxDelta) {
  if (lastVal === undefined || lastVal === null || isNaN(Number(lastVal))) {
    return Number(baseVal.toFixed(6));
  }
  const current = Number(lastVal);
  const delta = (Math.random() - 0.5) * 2 * maxDelta;
  return Number((current + delta).toFixed(6));
}

// Generate new values based on category and prior state
function generateTelemetryForCategory(category, lastValues) {
  const metrics = {};
  const now = new Date();

  switch (category) {
    case 'Temperature Sensor':
      metrics['Temperature'] = generateGradual(lastValues['Temperature'], 18, 40, 0.4, 1);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      metrics['Signal Strength'] = generateSignalStrength(lastValues['Signal Strength']);
      break;

    case 'Humidity Sensor':
      metrics['Humidity'] = generateGradual(lastValues['Humidity'], 30, 90, 0.8, 1);
      metrics['Temperature'] = generateGradual(lastValues['Temperature'], 18, 40, 0.3, 1);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      break;

    case 'Pressure Sensor':
      metrics['Pressure'] = generateGradual(lastValues['Pressure'], 980, 1050, 1.5, 1);
      metrics['Temperature'] = generateGradual(lastValues['Temperature'], 18, 40, 0.2, 1);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      break;

    case 'Air Quality Sensor':
      metrics['AQI'] = generateGradual(lastValues['AQI'], 20, 250, 3, 0);
      metrics['PM2.5'] = generateGradual(lastValues['PM2.5'], 5, 100, 1.5, 1);
      metrics['PM10'] = generateGradual(lastValues['PM10'], 10, 150, 2, 1);
      metrics['Temperature'] = generateGradual(lastValues['Temperature'], 18, 40, 0.3, 1);
      metrics['Humidity'] = generateGradual(lastValues['Humidity'], 30, 90, 0.8, 1);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      break;

    case 'Water Level Sensor':
      metrics['Water Level'] = generateGradual(lastValues['Water Level'], 0, 100, 0.5, 1);
      metrics['Tank Volume'] = 100 + Math.round((metrics['Water Level'] / 100) * 9900);
      metrics['Flow Rate'] = generateGradual(lastValues['Flow Rate'], 5, 150, 4, 1);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      break;

    case 'Flow Sensor':
      metrics['Flow Rate'] = generateGradual(lastValues['Flow Rate'], 5, 200, 5, 1);
      const prevConsumption = lastValues['Total Consumption'];
      const addedCons = (metrics['Flow Rate'] * 5) / 60;
      metrics['Total Consumption'] = generateCumulative(prevConsumption, 120.0, addedCons, 2);
      metrics['Pressure'] = generateGradual(lastValues['Pressure'], 980, 1050, 1, 1);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      break;

    case 'Motion Sensor':
      const motionDetected = Math.random() < 0.15;
      metrics['Motion Status'] = motionDetected ? 'Detected' : 'Not Detected';
      let mCount = lastValues['Motion Count'] !== undefined
        ? Number(lastValues['Motion Count']) + (motionDetected ? 1 : 0)
        : 0;
      if (mCount > 100) mCount = 0;
      metrics['Motion Count'] = mCount;
      metrics['Last Motion'] = motionDetected 
        ? now.toISOString() 
        : (lastValues['Last Motion'] || 'No motion yet');
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      metrics['Signal Strength'] = generateSignalStrength(lastValues['Signal Strength']);
      break;

    case 'Light Sensor':
      metrics['Light Intensity'] = generateGradual(lastValues['Light Intensity'], 0, 10000, 150, 0);
      metrics['Ambient Temperature'] = generateGradual(lastValues['Ambient Temperature'], 18, 40, 0.3, 1);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      break;

    case 'Smoke Sensor':
      metrics['Smoke Level'] = generateGradual(lastValues['Smoke Level'], 0, 100, 0.8, 1);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      metrics['Signal Strength'] = generateSignalStrength(lastValues['Signal Strength']);
      break;

    case 'Gas Sensor':
      metrics['Gas Concentration'] = generateGradual(lastValues['Gas Concentration'], 0, 1000, 8, 1);
      metrics['Temperature'] = generateGradual(lastValues['Temperature'], 18, 40, 0.3, 1);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      break;

    case 'Vibration Sensor':
      metrics['Vibration Level'] = generateGradual(lastValues['Vibration Level'], 0, 10, 0.15, 2);
      metrics['Frequency'] = generateGradual(lastValues['Frequency'], 10, 100, 1.5, 1);
      const currentHealth = lastValues['Equipment Health'] !== undefined ? Number(lastValues['Equipment Health']) : 100;
      let targetHealth = currentHealth;
      if (metrics['Vibration Level'] > 7) {
        targetHealth -= 0.2;
      } else {
        targetHealth += 0.05;
      }
      if (targetHealth > 100) targetHealth = 100;
      if (targetHealth < 50) targetHealth = 50;
      metrics['Equipment Health'] = Number(targetHealth.toFixed(1));
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      break;

    case 'Soil Moisture Sensor':
      metrics['Soil Moisture'] = generateGradual(lastValues['Soil Moisture'], 0, 100, 0.5, 1);
      metrics['Soil Temperature'] = generateGradual(lastValues['Soil Temperature'], 15, 40, 0.2, 1);
      metrics['Humidity'] = generateGradual(lastValues['Humidity'], 30, 90, 0.5, 1);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      break;

    case 'Power Meter':
      metrics['Voltage'] = generateGradual(lastValues['Voltage'], 210, 250, 0.5, 1);
      metrics['Current'] = generateGradual(lastValues['Current'], 1, 30, 0.2, 2);
      let powerVal = Math.round(metrics['Voltage'] * metrics['Current']);
      if (powerVal > 5000) powerVal = 5000;
      if (powerVal < 100) powerVal = 100;
      metrics['Power Consumption'] = powerVal;
      const prevEnergy = lastValues['Energy Used'];
      const addedEnergy = (metrics['Power Consumption'] * 5) / 3600000;
      metrics['Energy Used'] = generateCumulative(prevEnergy, 10.5, addedEnergy, 4);
      break;

    case 'Battery Monitor':
      metrics['Battery Level'] = generateBattery(lastValues['Battery Level']);
      metrics['Voltage'] = generateGradual(lastValues['Voltage'], 3, 24, 0.1, 2);
      metrics['Temperature'] = generateGradual(lastValues['Temperature'], 18, 40, 0.3, 1);
      metrics['Health'] = generateGradual(lastValues['Health'], 50, 100, 0.01, 1);
      if (metrics['Battery Level'] >= 100) {
        metrics['Charging Status'] = 'Full';
      } else if (metrics['Battery Level'] < 15) {
        metrics['Charging Status'] = 'Charging';
      } else {
        metrics['Charging Status'] = lastValues['Charging Status'] || (Math.random() < 0.5 ? 'Charging' : 'Discharging');
        if (Math.random() < 0.05) {
          metrics['Charging Status'] = metrics['Charging Status'] === 'Charging' ? 'Discharging' : 'Charging';
        }
      }
      break;

    case 'GPS Tracker':
      metrics['Latitude'] = generateGPS(lastValues['Latitude'], 37.7749, 0.00005);
      metrics['Longitude'] = generateGPS(lastValues['Longitude'], -122.4194, 0.00005);
      metrics['Speed'] = generateGradual(lastValues['Speed'], 0, 120, 4, 1);
      const prevDistance = lastValues['Distance Today'];
      const addedDistance = (metrics['Speed'] * 5) / 3600;
      metrics['Distance Today'] = generateCumulative(prevDistance, 0.0, addedDistance, 3);
      metrics['Battery'] = generateBattery(lastValues['Battery']);
      break;

    default:
      break;
  }

  return metrics;
}

// Check and create alerts based on telemetry values
async function checkAndCreateAlerts(deviceId, metrics) {
  try {
    const alertInserts = [];
    const now = new Date();

    // Fetch device metadata to know device_name, sensor_type, project_name, etc.
    const [devices] = await pool.query(
      "SELECT id, device_name, device_code, sensor_type, protocol, client_name, client_email, location, project_name, alert_enabled FROM devices WHERE id = ?",
      [deviceId]
    );
    if (devices.length === 0) return;
    const device = devices[0];
    const sensor_type = device.sensor_type;

    // 1. General Metric Checks (run on any device that reports these metrics)
    if (metrics['Temperature'] !== undefined) {
      const val = Number(metrics['Temperature']);
      if (val > 50) {
        alertInserts.push({
          metric_name: 'Temperature',
          metric_value: String(val),
          threshold_value: '40',
          severity: 'Critical',
          message: `Temperature critically high: ${val}°C (threshold: 40°C)`
        });
      } else if (val > 40) {
        alertInserts.push({
          metric_name: 'Temperature',
          metric_value: String(val),
          threshold_value: '40',
          severity: 'High',
          message: `Temperature exceeds limit: ${val}°C (threshold: 40°C)`
        });
      }
    }

    const batteryVal = metrics['Battery'] !== undefined ? metrics['Battery'] : metrics['Battery Level'];
    if (batteryVal !== undefined) {
      const val = Number(batteryVal);
      if (val < 10) {
        alertInserts.push({
          metric_name: 'Battery',
          metric_value: String(val),
          threshold_value: '20',
          severity: 'Critical',
          message: `Battery level critically low: ${val}% (threshold: 20%)`
        });
      } else if (val < 20) {
        alertInserts.push({
          metric_name: 'Battery',
          metric_value: String(val),
          threshold_value: '20',
          severity: 'Medium',
          message: `Battery level is low: ${val}% (threshold: 20%)`
        });
      }
    }

    if (metrics['Signal Strength'] !== undefined) {
      const val = Number(metrics['Signal Strength']);
      if (val < 20) {
        alertInserts.push({
          metric_name: 'Signal Strength',
          metric_value: String(val),
          threshold_value: '40',
          severity: 'Critical',
          message: `Signal strength critically low: ${val}% (threshold: 40%)`
        });
      } else if (val < 40) {
        alertInserts.push({
          metric_name: 'Signal Strength',
          metric_value: String(val),
          threshold_value: '40',
          severity: 'Medium',
          message: `Signal strength is weak: ${val}% (threshold: 40%)`
        });
      }
    }

    // 2. Category-Specific Metric Checks
    if (sensor_type === 'Humidity Sensor') {
      if (metrics['Humidity'] !== undefined && Number(metrics['Humidity']) > 90) {
        alertInserts.push({
          metric_name: 'Humidity',
          metric_value: String(metrics['Humidity']),
          threshold_value: '90',
          severity: 'Medium',
          message: `Humidity exceeds limit: ${metrics['Humidity']}% (threshold: 90%)`
        });
      }
    }
    else if (sensor_type === 'Pressure Sensor') {
      if (metrics['Pressure'] !== undefined && Number(metrics['Pressure']) > 1050) {
        alertInserts.push({
          metric_name: 'Pressure',
          metric_value: String(metrics['Pressure']),
          threshold_value: '1050',
          severity: 'Medium',
          message: `Pressure exceeds limit: ${metrics['Pressure']} hPa (threshold: 1050 hPa)`
        });
      }
    }
    else if (sensor_type === 'Air Quality Sensor') {
      if (metrics['AQI'] !== undefined && Number(metrics['AQI']) > 150) {
        alertInserts.push({
          metric_name: 'AQI',
          metric_value: String(metrics['AQI']),
          threshold_value: '150',
          severity: 'High',
          message: `AQI exceeds limit: ${metrics['AQI']} (threshold: 150)`
        });
      }
      if (metrics['PM2.5'] !== undefined && Number(metrics['PM2.5']) > 75) {
        alertInserts.push({
          metric_name: 'PM2.5',
          metric_value: String(metrics['PM2.5']),
          threshold_value: '75',
          severity: 'High',
          message: `PM2.5 exceeds limit: ${metrics['PM2.5']} µg/m³ (threshold: 75 µg/m³)`
        });
      }
    }
    else if (sensor_type === 'Water Level Sensor') {
      if (metrics['Water Level'] !== undefined && Number(metrics['Water Level']) < 10) {
        alertInserts.push({
          metric_name: 'Water Level',
          metric_value: String(metrics['Water Level']),
          threshold_value: '10',
          severity: 'Critical',
          message: `Water Level is critically low: ${metrics['Water Level']}% (threshold: 10%)`
        });
      }
    }
    else if (sensor_type === 'Flow Sensor') {
      if (metrics['Flow Rate'] !== undefined && Number(metrics['Flow Rate']) > 180) {
        alertInserts.push({
          metric_name: 'Flow Rate',
          metric_value: String(metrics['Flow Rate']),
          threshold_value: '180',
          severity: 'High',
          message: `Flow Rate exceeds limit: ${metrics['Flow Rate']} L/min (threshold: 180 L/min)`
        });
      }
    }
    else if (sensor_type === 'Motion Sensor') {
      if (metrics['Motion Count'] !== undefined && Number(metrics['Motion Count']) > 20) {
        alertInserts.push({
          metric_name: 'Motion Count',
          metric_value: String(metrics['Motion Count']),
          threshold_value: '20',
          severity: 'Medium',
          message: `Motion Count exceeds threshold: ${metrics['Motion Count']} detections (threshold: 20)`
        });
      }
    }
    else if (sensor_type === 'Light Sensor') {
      if (metrics['Light Intensity'] !== undefined && Number(metrics['Light Intensity']) > 9000) {
        alertInserts.push({
          metric_name: 'Light Intensity',
          metric_value: String(metrics['Light Intensity']),
          threshold_value: '9000',
          severity: 'Medium',
          message: `Light Intensity exceeds limit: ${metrics['Light Intensity']} Lux (threshold: 9000 Lux)`
        });
      }
    }
    else if (sensor_type === 'Smoke Sensor') {
      if (metrics['Smoke Level'] !== undefined && Number(metrics['Smoke Level']) > 70) {
        alertInserts.push({
          metric_name: 'Smoke Level',
          metric_value: String(metrics['Smoke Level']),
          threshold_value: '70',
          severity: 'Critical',
          message: `Smoke Level exceeds limit: ${metrics['Smoke Level']} ppm (threshold: 70 ppm)`
        });
      }
    }
    else if (sensor_type === 'Gas Sensor') {
      if (metrics['Gas Concentration'] !== undefined && Number(metrics['Gas Concentration']) > 700) {
        alertInserts.push({
          metric_name: 'Gas Concentration',
          metric_value: String(metrics['Gas Concentration']),
          threshold_value: '700',
          severity: 'Critical',
          message: `Gas Concentration exceeds limit: ${metrics['Gas Concentration']} ppm (threshold: 700 ppm)`
        });
      }
    }
    else if (sensor_type === 'Vibration Sensor') {
      if (metrics['Vibration Level'] !== undefined && Number(metrics['Vibration Level']) > 8) {
        alertInserts.push({
          metric_name: 'Vibration Level',
          metric_value: String(metrics['Vibration Level']),
          threshold_value: '8',
          severity: 'High',
          message: `Vibration Level exceeds limit: ${metrics['Vibration Level']} mm/s (threshold: 8 mm/s)`
        });
      }
    }
    else if (sensor_type === 'Soil Moisture Sensor') {
      if (metrics['Soil Moisture'] !== undefined && Number(metrics['Soil Moisture']) < 15) {
        alertInserts.push({
          metric_name: 'Soil Moisture',
          metric_value: String(metrics['Soil Moisture']),
          threshold_value: '15',
          severity: 'High',
          message: `Soil Moisture is low: ${metrics['Soil Moisture']}% (threshold: 15%)`
        });
      }
    }
    else if (sensor_type === 'Power Meter') {
      if (metrics['Power Consumption'] !== undefined && Number(metrics['Power Consumption']) > 4500) {
        alertInserts.push({
          metric_name: 'Power Consumption',
          metric_value: String(metrics['Power Consumption']),
          threshold_value: '4500',
          severity: 'High',
          message: `Power Consumption exceeds limit: ${metrics['Power Consumption']} W (threshold: 4500 W)`
        });
      }
    }
    else if (sensor_type === 'Battery Monitor') {
      if (metrics['Health'] !== undefined && Number(metrics['Health']) < 60) {
        alertInserts.push({
          metric_name: 'Health',
          metric_value: String(metrics['Health']),
          threshold_value: '60',
          severity: 'High',
          message: `Battery Health is critical: ${metrics['Health']}% (threshold: 60%)`
        });
      }
    }
    else if (sensor_type === 'GPS Tracker') {
      if (metrics['Speed'] !== undefined && Number(metrics['Speed']) > 100) {
        alertInserts.push({
          metric_name: 'Speed',
          metric_value: String(metrics['Speed']),
          threshold_value: '100',
          severity: 'Medium',
          message: `Speed exceeds speed limit: ${metrics['Speed']} km/h (threshold: 100 km/h)`
        });
      }
    }

    // Process all alerts through de-duplication / 15-minute throttling
    for (const alert of alertInserts) {
      const [existing] = await pool.query(
        "SELECT id, created_at, status FROM alerts WHERE device_id = ? AND metric_name = ? AND status != 'Resolved' ORDER BY created_at DESC LIMIT 1",
        [deviceId, alert.metric_name]
      );

      let shouldCreateNew = true;
      let existingAlert = null;

      if (existing.length > 0) {
        existingAlert = existing[0];
        const diffMinutes = (now - new Date(existingAlert.created_at)) / (60 * 1000);
        if (diffMinutes < 15) {
          shouldCreateNew = false;
        }
      }

      if (shouldCreateNew) {
        // Create new alert and send email
        const [result] = await pool.query(
          `INSERT INTO alerts (device_id, device_name, sensor_type, metric_name, metric_value, threshold_value, severity, status, message, email_sent, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, 0, ?)`,
          [
            deviceId,
            device.device_name,
            device.sensor_type || 'Unknown',
            alert.metric_name,
            alert.metric_value,
            alert.threshold_value,
            alert.severity,
            alert.message,
            now
          ]
        );
        const newAlertId = result.insertId;

        // Trigger email notification
        const emailSuccess = await emailService.sendAlertEmail(device, {
          id: newAlertId,
          severity: alert.severity,
          message: alert.message,
          metric_name: alert.metric_name,
          metric_value: alert.metric_value,
          threshold_value: alert.threshold_value
        });

        if (emailSuccess) {
          await pool.query("UPDATE alerts SET email_sent = 1 WHERE id = ?", [newAlertId]);
          console.log(`Alert created with ID ${newAlertId} and email notification dispatched.`);
        } else {
          console.log(`Alert created with ID ${newAlertId} but email was not sent (or skipped).`);
        }
      } else {
        // Under 15-minute cooldown. Reuse existing alert by updating value and message in-place
        await pool.query(
          "UPDATE alerts SET metric_value = ?, message = ? WHERE id = ?",
          [alert.metric_value, alert.message, existingAlert.id]
        );
        console.log(`Alert ID ${existingAlert.id} updated in-place (under 15-minute cooldown). Email throttled.`);
      }
    }

    // Alert Recovery: If a metric is present in this telemetry cycle but did NOT trigger an alert,
    // automatically resolve any existing active/acknowledged alerts for that metric on this device.
    const triggeredMetrics = alertInserts.map(a => a.metric_name);
    const metricsToResolve = Object.keys(metrics).filter(m => !triggeredMetrics.includes(m));
    for (const metricName of metricsToResolve) {
      const [updateResult] = await pool.query(
        "UPDATE alerts SET status = 'Resolved', resolved_at = ? WHERE device_id = ? AND metric_name = ? AND status != 'Resolved'",
        [now, deviceId, metricName]
      );
      if (updateResult.affectedRows > 0) {
        console.log(`Automatically resolved active alerts for device ID ${deviceId}, metric: ${metricName} (returned to normal).`);
      }
    }

    // Derive overall device status from telemetry metrics and update in database
    const overallStatus = deriveOverallStatus(metrics, device.sensor_type);
    await pool.query(
      "UPDATE devices SET status = ? WHERE id = ?",
      [overallStatus, deviceId]
    );
    console.log(`Device ID ${deviceId} status updated to: ${overallStatus} dynamically.`);
  } catch (err) {
    console.error('Failed to check and create alerts:', err.message);
  }
}

// On-demand simulation generation handler
async function generateTelemetryOnDemand(deviceId) {
  try {
    let query = "SELECT id, sensor_type, status FROM devices WHERE sensor_type IS NOT NULL";
    let params = [];
    if (deviceId) {
      query += " AND id = ?";
      params.push(deviceId);
    } else {
      query += " AND LOWER(status) IN ('online', 'active')";
    }

    const [devices] = await pool.query(query, params);
    if (devices.length === 0) return;

    const insertValues = [];
    const now = new Date();

    for (const device of devices) {
      const statusLower = (device.status || '').toLowerCase();
      if (statusLower === 'offline' || statusLower === 'inactive') {
        continue;
      }

      // 2. Query the last recorded telemetry timestamp
      const [timeCheck] = await pool.query(
        'SELECT MAX(recorded_at) AS last_recorded FROM sensor_data WHERE device_id = ?',
        [device.id]
      );

      const lastRecorded = timeCheck[0]?.last_recorded;

      // 3. Generate if empty OR older than 5 seconds (5000 milliseconds)
      if (!lastRecorded || (now - new Date(lastRecorded)) > 5000) {
        // Query the latest state dictionary
        const [lastReadings] = await pool.query(
          'SELECT sensor_name, sensor_value FROM sensor_data WHERE device_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 50',
          [device.id]
        );

        const lastValues = {};
        lastReadings.forEach(row => {
          if (lastValues[row.sensor_name] === undefined) {
            lastValues[row.sensor_name] = row.sensor_value;
          }
        });

        // Generate metrics
        const newTelemetry = generateTelemetryForCategory(device.sensor_type, lastValues);

        // Check and generate alerts
        await checkAndCreateAlerts(device.id, newTelemetry);

        // Queue records for insert
        Object.entries(newTelemetry).forEach(([metricName, metricVal]) => {
          insertValues.push([device.id, metricName, String(metricVal), now]);
        });
      }
    }

    // 4. Batch insert
    if (insertValues.length > 0) {
      await pool.query(
        'INSERT INTO sensor_data (device_id, sensor_name, sensor_value, recorded_at) VALUES ?',
        [insertValues]
      );
      console.log(`Generated on-demand telemetry updates for device ${deviceId || 'all'}: ${insertValues.length} metrics recorded.`);
    }
  } catch (err) {
    console.error('On-demand telemetry simulation check failed:', err.message);
  }
}

module.exports = {
  generateTelemetryOnDemand,
  checkAndCreateAlerts
};
