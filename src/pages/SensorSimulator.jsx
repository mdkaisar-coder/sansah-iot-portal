import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Cpu, Send, AlertTriangle, CheckCircle, RefreshCw, Terminal, Sliders } from 'lucide-react';

const categoryMetrics = {
  'Temperature Sensor': { metric: 'Temperature', unit: '°C', min: 0, max: 80, normal: 24, warning: 36, critical: 55 },
  'Humidity Sensor': { metric: 'Humidity', unit: '%', min: 10, max: 100, normal: 45, warning: 80, critical: 95 },
  'Pressure Sensor': { metric: 'Pressure', unit: 'hPa', min: 950, max: 1100, normal: 1013, warning: 1040, critical: 1080 },
  'Air Quality Sensor': { metric: 'AQI', unit: '', min: 0, max: 300, normal: 40, warning: 120, critical: 180 },
  'Water Level Sensor': { metric: 'Water Level', unit: '%', min: 0, max: 100, normal: 60, warning: 15, critical: 5 },
  'Flow Sensor': { metric: 'Flow Rate', unit: 'L/min', min: 0, max: 250, normal: 50, warning: 150, critical: 200 },
  'Motion Sensor': { metric: 'Motion Status', unit: '', isSelect: true, options: ['Not Detected', 'Detected'], normal: 'Not Detected', warning: 'Detected', critical: 'Detected' },
  'Light Sensor': { metric: 'Light Intensity', unit: 'Lux', min: 0, max: 12000, normal: 500, warning: 8500, critical: 9500 },
  'Smoke Sensor': { metric: 'Smoke Level', unit: 'ppm', min: 0, max: 150, normal: 10, warning: 50, critical: 80 },
  'Gas Sensor': { metric: 'Gas Concentration', unit: 'ppm', min: 0, max: 1200, normal: 150, warning: 450, critical: 800 },
  'Vibration Sensor': { metric: 'Vibration Level', unit: 'mm/s', min: 0, max: 15, normal: 1.5, warning: 6, critical: 10 },
  'Soil Moisture Sensor': { metric: 'Soil Moisture', unit: '%', min: 0, max: 100, normal: 45, warning: 20, critical: 10 },
  'Power Meter': { metric: 'Power Consumption', unit: 'W', min: 0, max: 6000, normal: 1200, warning: 4000, critical: 5000 },
  'Battery Monitor': { metric: 'Health', unit: '%', min: 0, max: 100, normal: 90, warning: 25, critical: 8 },
  'GPS Tracker': { metric: 'Speed', unit: 'km/h', min: 0, max: 180, normal: 45, warning: 90, critical: 120 }
};

export default function SensorSimulator() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);

  // Telemetry metric sliders
  const [temp, setTemp] = useState(25);
  const [humidity, setHumidity] = useState(50);
  const [pressure, setPressure] = useState(1013);
  const [customMetricVal, setCustomMetricVal] = useState(0);

  const addLog = (message, type = 'info', raw = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [
      { timestamp, message, type, raw },
      ...prev.slice(0, 19) // Keep last 20 logs
    ]);
  };

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const res = await api.fetchDevices();
        if (res.success && res.data.length > 0) {
          setDevices(res.data);
          setSelectedDeviceId(res.data[0].id);
          addLog(`Loaded ${res.data.length} registered devices from database.`, 'success');
        } else {
          addLog('No registered devices found. Please create a device first.', 'warning');
        }
      } catch (err) {
        addLog(`Failed to fetch devices: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;
    const device = devices.find(d => String(d.id) === String(selectedDeviceId));
    if (device) {
      setSelectedDevice(device);
      addLog(`Selected asset: ${device.device_name} (Code: ${device.device_code})`, 'info');
      
      // Initialize custom metric default
      const cfg = categoryMetrics[device.sensor_type];
      if (cfg) {
        setCustomMetricVal(cfg.normal);
      }
    }
  }, [selectedDeviceId, devices]);

  const handlePostTelemetry = async (metricName, metricValue) => {
    if (!selectedDeviceId) return;
    setSimulating(true);
    const payload = {
      device_id: Number(selectedDeviceId),
      sensor_name: metricName,
      sensor_value: String(metricValue)
    };

    addLog(`POST /api/sensors - Payload: ${JSON.stringify(payload)}`, 'request');

    try {
      const res = await api.logSensorReading(payload);
      if (res.success) {
        addLog(`Response 201 Created: ${res.message || 'Telemetry logged successfully.'}`, 'response', res.data);
      } else {
        addLog(`Response Error: ${res.message}`, 'error');
      }
    } catch (err) {
      addLog(`HTTP POST Exception: ${err.message}`, 'error');
    } finally {
      setSimulating(false);
    }
  };

  const handleQuickSimulation = async (mode) => {
    if (!selectedDevice) return;
    const cfg = categoryMetrics[selectedDevice.sensor_type];
    
    // Choose appropriate values depending on the mode (normal, warning, critical)
    let tempVal = 22;
    let humVal = 48;
    let pressVal = 1012;
    let customVal = 0;

    if (mode === 'normal') {
      tempVal = 23.5;
      humVal = 50.0;
      pressVal = 1013.2;
      if (cfg) {
        customVal = cfg.normal;
      }
    } else if (mode === 'warning') {
      tempVal = 36.5; // warning for Temp
      humVal = 82.0; // warning for Humid
      pressVal = 1042.0; // warning for Pressure
      if (cfg) {
        customVal = cfg.warning;
      }
    } else if (mode === 'critical') {
      tempVal = 52.0; // critical for Temp
      humVal = 95.0; // critical for Humid
      pressVal = 1085.0; // critical for Pressure
      if (cfg) {
        customVal = cfg.critical;
      }
    }

    addLog(`Initiating QUICK SIMULATION: Mode = ${mode.toUpperCase()} on device: ${selectedDevice.device_name}`, 'info');

    // If device is basic temperature sensor, send temp
    if (selectedDevice.sensor_type === 'Temperature Sensor') {
      await handlePostTelemetry('Temperature', tempVal);
    } else if (selectedDevice.sensor_type === 'Humidity Sensor') {
      await handlePostTelemetry('Humidity', humVal);
    } else if (selectedDevice.sensor_type === 'Pressure Sensor') {
      await handlePostTelemetry('Pressure', pressVal);
    } else if (cfg) {
      // Send the device-specific custom metric
      await handlePostTelemetry(cfg.metric, customVal);
      // Also post Temperature as a supporting diagnostic metric
      await handlePostTelemetry('Temperature', tempVal);
    }
  };

  const clearLogs = () => {
    setConsoleLogs([]);
    addLog('Console logs cleared.', 'info');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentCfg = selectedDevice ? categoryMetrics[selectedDevice.sensor_type] : null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="font-display text-2xl font-bold text-text tracking-wide uppercase">Sensor Simulator & Telemetry Cockpit</h1>
        <p className="text-muted text-xs mt-1">Simulate real-world physical sensor inputs to validate threshold alerting rules, incident generation, and SMTP dispatches.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Box */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-soft space-y-4">
            <h2 className="font-display text-xs font-semibold text-text uppercase tracking-wider border-b border-border/50 pb-2 flex items-center">
              <Cpu className="w-4 h-4 mr-2 text-primary" />
              <span>Asset Select & Configuration</span>
            </h2>
            
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold text-muted uppercase">Target IoT Asset</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition-all cursor-pointer"
              >
                {devices.map(dev => (
                  <option key={dev.id} value={dev.id}>{dev.device_name} ({dev.device_code})</option>
                ))}
              </select>
            </div>

            {selectedDevice && (
              <div className="grid grid-cols-2 gap-4 bg-background/50 border border-border/30 rounded-lg p-3 text-xs">
                <div>
                  <span className="text-muted">Device Category:</span>
                  <p className="font-semibold text-text mt-0.5">{selectedDevice.sensor_type}</p>
                </div>
                <div>
                  <span className="text-muted">Protocol Channel:</span>
                  <p className="font-semibold text-text font-mono mt-0.5">{selectedDevice.protocol}</p>
                </div>
                <div>
                  <span className="text-muted">Client Assigned:</span>
                  <p className="font-semibold text-text mt-0.5">{selectedDevice.client_name}</p>
                </div>
                <div>
                  <span className="text-muted">Alert Notification:</span>
                  <p className={`font-bold mt-0.5 ${selectedDevice.alert_enabled ? 'text-success' : 'text-muted'}`}>
                    {selectedDevice.alert_enabled ? 'ENABLED (SMTP active)' : 'MUTED'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sliders Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-soft space-y-5">
            <h2 className="font-display text-xs font-semibold text-text uppercase tracking-wider border-b border-border/50 pb-2 flex items-center">
              <Sliders className="w-4 h-4 mr-2 text-primary" />
              <span>Adjust Custom Parameters</span>
            </h2>

            {/* General metrics */}
            <div className="space-y-4">
              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-muted">Temperature</span>
                  <span className="text-text font-mono">{temp} °C</span>
                </div>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="0.5"
                    value={temp}
                    onChange={(e) => setTemp(Number(e.target.value))}
                    className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <button
                    onClick={() => handlePostTelemetry('Temperature', temp)}
                    disabled={simulating || !selectedDeviceId}
                    className="btn-secondary py-1 px-2.5 text-[10px] flex items-center space-x-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </div>
              </div>

              {/* Humidity */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-muted">Humidity</span>
                  <span className="text-text font-mono">{humidity} %</span>
                </div>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={humidity}
                    onChange={(e) => setHumidity(Number(e.target.value))}
                    className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <button
                    onClick={() => handlePostTelemetry('Humidity', humidity)}
                    disabled={simulating || !selectedDeviceId}
                    className="btn-secondary py-1 px-2.5 text-[10px] flex items-center space-x-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </div>
              </div>

              {/* Dynamic specific metric slider */}
              {currentCfg && (
                <div className="space-y-2 border-t border-border/30 pt-4 mt-2">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-primary-text font-bold uppercase">{currentCfg.metric} (Device Specific)</span>
                    <span className="text-text font-mono">{customMetricVal} {currentCfg.unit}</span>
                  </div>
                  
                  {currentCfg.isSelect ? (
                    <div className="flex space-x-2">
                      <select
                        value={customMetricVal}
                        onChange={(e) => setCustomMetricVal(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text focus:outline-none cursor-pointer"
                      >
                        {currentCfg.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handlePostTelemetry(currentCfg.metric, customMetricVal)}
                        disabled={simulating || !selectedDeviceId}
                        className="btn-secondary py-1 px-3 text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min={currentCfg.min}
                        max={currentCfg.max}
                        step={currentCfg.max - currentCfg.min > 100 ? '5' : '0.5'}
                        value={customMetricVal}
                        onChange={(e) => setCustomMetricVal(Number(e.target.value))}
                        className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <button
                        onClick={() => handlePostTelemetry(currentCfg.metric, customMetricVal)}
                        disabled={simulating || !selectedDeviceId}
                        className="btn-secondary py-1 px-2.5 text-[10px] flex items-center space-x-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Flow simulation triggers */}
            <div className="border-t border-border/50 pt-4 space-y-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Quick Flow Automation Scenario</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickSimulation('normal')}
                  disabled={simulating || !selectedDeviceId}
                  className="bg-success/15 border border-success/30 hover:bg-success/25 text-success rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Normal</span>
                </button>
                
                <button
                  onClick={() => handleQuickSimulation('warning')}
                  disabled={simulating || !selectedDeviceId}
                  className="bg-warning/15 border border-warning/30 hover:bg-warning/25 text-warning rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Warning</span>
                </button>

                <button
                  onClick={() => handleQuickSimulation('critical')}
                  disabled={simulating || !selectedDeviceId}
                  className="bg-danger/15 border border-danger/30 hover:bg-danger/25 text-danger rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-danger animate-pulse" />
                  <span>Critical Alert</span>
                </button>
              </div>
              <span className="text-[10px] text-muted block leading-relaxed">
                Critical Alert logs anomaly levels, runs rules to create active alarms, and dispatches SMTP Resend messages immediately.
              </span>
            </div>
          </div>
        </div>

        {/* Live Terminal Log */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-soft flex flex-col h-[580px]">
          <div className="flex justify-between items-center border-b border-border/50 pb-2 mb-4">
            <h2 className="font-display text-xs font-semibold text-text uppercase tracking-wider flex items-center">
              <Terminal className="w-4 h-4 mr-2 text-primary" />
              <span>API Execution Logs</span>
            </h2>
            <button 
              onClick={clearLogs}
              className="text-[10px] text-muted hover:text-text cursor-pointer hover:underline"
            >
              Clear Logs
            </button>
          </div>

          <div className="flex-1 bg-background border border-border/60 rounded-lg p-3 font-mono text-[11px] overflow-y-auto space-y-3 leading-relaxed">
            {consoleLogs.length === 0 ? (
              <div className="text-muted italic text-center pt-24 select-none">Waiting for simulation triggers...</div>
            ) : (
              consoleLogs.map((log, index) => {
                let colorClass = 'text-primary-text';
                if (log.type === 'success') colorClass = 'text-success';
                if (log.type === 'warning') colorClass = 'text-warning';
                if (log.type === 'error') colorClass = 'text-danger font-bold';
                if (log.type === 'request') colorClass = 'text-sky-400';
                if (log.type === 'response') colorClass = 'text-emerald-400';

                return (
                  <div key={index} className="border-b border-border/30 pb-2 last:border-0">
                    <span className="text-muted mr-1.5">[{log.timestamp}]</span>
                    <span className={colorClass}>{log.message}</span>
                    {log.raw && (
                      <pre className="text-[10px] bg-card p-1.5 rounded border border-border/30 mt-1 overflow-x-auto text-muted max-h-36">
                        {JSON.stringify(log.raw, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
