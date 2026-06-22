import { useEffect, useState, useMemo } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Gauge, 
  Battery, 
  Signal, 
  Activity, 
  Zap, 
  Sun, 
  AlertTriangle, 
  Eye, 
  Compass, 
  Cpu, 
  Heart,
  Radio,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  CheckCircle2,
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { api } from '../services/api';
import { useTelemetryPolling } from '../hooks/useTelemetryPolling';
import StatusBadge from '../components/StatusBadge';

export default function SensorMonitoring() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeAgo, setTimeAgo] = useState('');
  const [spiking, setSpiking] = useState(false);
  const [toasts, setToasts] = useState([]);

  // States to keep track of telemetry trends and prior readings
  const [trends, setTrends] = useState({});
  const [lastTelemetryVal, setLastTelemetryVal] = useState({});

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchDevices = async () => {
    try {
      setError('');
      const res = await api.fetchDevices();
      if (res.success) {
        const sensorDevices = res.data.filter(d => d.sensor_type);
        setDevices(sensorDevices);
        if (sensorDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(String(sensorDevices[0].id));
        }
      } else {
        setError(res.message || 'Failed to fetch devices list.');
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
      setError('Failed to connect to the backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const selectedDevice = useMemo(() => {
    return devices.find(d => String(d.id) === selectedDeviceId) || null;
  }, [devices, selectedDeviceId]);

  // Poll telemetry using custom hook
  const { 
    telemetry, 
    activeAlerts, 
    history,
    lastUpdated, 
    loading: telemetryLoading, 
    error: telemetryError 
  } = useTelemetryPolling(
    selectedDeviceId, 
    selectedDevice ? selectedDevice.status : 'Offline'
  );

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const groups = {};
    history.forEach(row => {
      const timeStr = new Date(row.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!groups[timeStr]) {
        groups[timeStr] = { time: timeStr };
      }
      const val = parseFloat(row.sensor_value);
      if (!isNaN(val)) {
        groups[timeStr][row.sensor_name] = val;
      }
    });
    return Object.values(groups).reverse();
  }, [history]);

  // Compute time ago counter
  useEffect(() => {
    if (!lastUpdated) {
      setTimeAgo('');
      return;
    }

    const updateTimeAgo = () => {
      const diffMs = new Date() - lastUpdated;
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      if (diffSecs < 5) {
        setTimeAgo('just now');
      } else {
        setTimeAgo(`${diffSecs} seconds ago`);
      }
    };

    updateTimeAgo();
    const intervalId = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(intervalId);
  }, [lastUpdated]);

  // Calculate real trends dynamically
  useEffect(() => {
    if (telemetry && Object.keys(telemetry).length > 0) {
      const newTrends = { ...trends };
      Object.entries(telemetry).forEach(([name, val]) => {
        const newVal = parseFloat(val);
        const oldVal = parseFloat(lastTelemetryVal[name]);
        if (!isNaN(newVal) && !isNaN(oldVal)) {
          if (newVal > oldVal) {
            newTrends[name] = 'Rising';
          } else if (newVal < oldVal) {
            newTrends[name] = 'Falling';
          } else {
            newTrends[name] = 'Stable';
          }
        } else {
          if (!newTrends[name]) {
            newTrends[name] = 'Stable';
          }
        }
      });
      setTrends(newTrends);
      setLastTelemetryVal(telemetry);
    }
  }, [telemetry]);

  // Force telemetry critical values spike beyond thresholds
  const handleForceSpike = async () => {
    if (!selectedDeviceId) return;
    try {
      setSpiking(true);
      const res = await api.triggerTestSpike(selectedDeviceId);
      if (res.success) {
        addToast('Test Alert Generated Successfully', 'success');

        if (res.data.adminEmailSent) {
          addToast('Admin Email Sent', 'success');
        } else if (res.data.adminEmail) {
          addToast(`Admin Email Failed: ${res.data.adminEmailError || 'SMTP Error'}`, 'error');
        }

        if (res.data.clientEmailSent) {
          addToast('Client Email Sent', 'success');
        } else if (res.data.clientEmail) {
          addToast(`Client Email Failed: ${res.data.clientEmailError || 'SMTP Error'}`, 'error');
        }

        await fetchDevices();
      } else {
        addToast(res.message || 'Failed to force critical telemetry spike.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to send test email', 'error');
    } finally {
      setSpiking(false);
    }
  };

  // Telemetry metadata lookup helper (icons, label names, units)
  const getMetricMetadata = (name) => {
    const lowercase = name.toLowerCase();
    
    if (lowercase.includes('temperature') || lowercase === 'temp') {
      return { icon: Thermometer, unit: '°C', label: 'Temperature' };
    }
    if (lowercase.includes('humidity')) {
      return { icon: Droplets, unit: '%', label: 'Humidity' };
    }
    if (lowercase.includes('pressure')) {
      return { icon: Gauge, unit: 'hPa', label: 'Pressure' };
    }
    if (lowercase.includes('battery') || lowercase.includes('charge')) {
      return { icon: Battery, unit: '%', label: 'Battery Level' };
    }
    if (lowercase.includes('signal') || lowercase.includes('rssi')) {
      return { icon: Signal, unit: '%', label: 'Signal Strength' };
    }
    if (lowercase.includes('aqi') || lowercase.includes('air quality')) {
      return { icon: Activity, unit: '', label: 'AQI' };
    }
    if (lowercase.includes('pm2.5')) {
      return { icon: Activity, unit: ' µg/m³', label: 'PM2.5' };
    }
    if (lowercase.includes('pm10')) {
      return { icon: Activity, unit: ' µg/m³', label: 'PM10' };
    }
    if (lowercase.includes('water level')) {
      return { icon: Droplets, unit: '%', label: 'Water Level' };
    }
    if (lowercase.includes('volume')) {
      return { icon: Gauge, unit: ' L', label: 'Tank Volume' };
    }
    if (lowercase.includes('flow rate') || lowercase.includes('flow')) {
      return { icon: Activity, unit: ' L/min', label: 'Flow Rate' };
    }
    if (lowercase.includes('consumption')) {
      return { icon: Zap, unit: ' L', label: 'Total Consumption' };
    }
    if (lowercase.includes('motion status') || lowercase.includes('motion')) {
      return { icon: Eye, unit: '', label: 'Motion Status' };
    }
    if (lowercase.includes('motion count')) {
      return { icon: Eye, unit: '', label: 'Motion Count' };
    }
    if (lowercase.includes('last motion')) {
      return { icon: Compass, unit: '', label: 'Last Motion' };
    }
    if (lowercase.includes('light') || lowercase.includes('intensity') || lowercase.includes('lux')) {
      return { icon: Sun, unit: ' Lux', label: 'Light Intensity' };
    }
    if (lowercase.includes('smoke')) {
      return { icon: AlertTriangle, unit: ' ppm', label: 'Smoke Level' };
    }
    if (lowercase.includes('gas') || lowercase.includes('concentration')) {
      return { icon: AlertTriangle, unit: ' ppm', label: 'Gas Concentration' };
    }
    if (lowercase.includes('vibration')) {
      return { icon: Activity, unit: ' mm/s', label: 'Vibration Level' };
    }
    if (lowercase.includes('frequency')) {
      return { icon: Activity, unit: ' Hz', label: 'Frequency' };
    }
    if (lowercase.includes('health')) {
      return { icon: Heart, unit: '%', label: 'Equipment Health' };
    }
    if (lowercase.includes('soil moisture')) {
      return { icon: Droplets, unit: '%', label: 'Soil Moisture' };
    }
    if (lowercase.includes('soil temperature')) {
      return { icon: Thermometer, unit: '°C', label: 'Soil Temperature' };
    }
    if (lowercase.includes('voltage')) {
      return { icon: Zap, unit: ' V', label: 'Voltage' };
    }
    if (lowercase.includes('current')) {
      return { icon: Zap, unit: ' A', label: 'Current' };
    }
    if (lowercase.includes('power')) {
      return { icon: Zap, unit: ' W', label: 'Power Consumption' };
    }
    if (lowercase.includes('energy')) {
      return { icon: Zap, unit: ' kWh', label: 'Energy Used' };
    }
    if (lowercase.includes('latitude')) {
      return { icon: Compass, unit: '°', label: 'Latitude' };
    }
    if (lowercase.includes('longitude')) {
      return { icon: Compass, unit: '°', label: 'Longitude' };
    }
    if (lowercase.includes('speed')) {
      return { icon: Activity, unit: ' km/h', label: 'Speed' };
    }
    if (lowercase.includes('distance')) {
      return { icon: Compass, unit: ' km', label: 'Distance Today' };
    }
    if (lowercase.includes('status')) {
      return { icon: Radio, unit: '', label: 'Status' };
    }

    return { icon: Cpu, unit: '', label: name };
  };

  // Derive Status & Threshold for each metric based on rule parameters
  const getMetricStatusAndThreshold = (name, value) => {
    const lowercase = name.toLowerCase();
    const val = parseFloat(value);
    
    if (isNaN(val)) {
      return { status: 'Normal', threshold: 'N/A' };
    }

    if (lowercase.includes('temperature') || lowercase === 'temp') {
      if (val > 50) return { status: 'Critical', threshold: '40°C' };
      if (val > 40) return { status: 'Alert', threshold: '40°C' };
      if (val >= 35) return { status: 'Warning', threshold: '40°C' };
      return { status: 'Normal', threshold: '40°C' };
    }

    if (lowercase.includes('battery')) {
      if (val < 10) return { status: 'Critical', threshold: '20%' };
      if (val < 20) return { status: 'Alert', threshold: '20%' };
      if (val <= 30) return { status: 'Warning', threshold: '20%' };
      return { status: 'Normal', threshold: '20%' };
    }

    if (lowercase.includes('signal') || lowercase.includes('rssi')) {
      if (val < 20) return { status: 'Critical', threshold: '40%' };
      if (val < 40) return { status: 'Alert', threshold: '40%' };
      if (val <= 60) return { status: 'Warning', threshold: '40%' };
      return { status: 'Normal', threshold: '40%' };
    }

    if (lowercase.includes('smoke')) {
      if (val > 70) return { status: 'Critical', threshold: '70 ppm' };
      if (val > 45) return { status: 'Warning', threshold: '70 ppm' };
      return { status: 'Normal', threshold: '70 ppm' };
    }

    if (lowercase.includes('gas') || lowercase.includes('concentration')) {
      if (val > 700) return { status: 'Critical', threshold: '700 ppm' };
      if (val > 350) return { status: 'Warning', threshold: '700 ppm' };
      return { status: 'Normal', threshold: '700 ppm' };
    }

    if (lowercase.includes('humidity')) {
      if (val > 90) return { status: 'Alert', threshold: '90%' };
      return { status: 'Normal', threshold: '90%' };
    }

    if (lowercase.includes('pressure')) {
      if (val > 1050) return { status: 'Alert', threshold: '1050 hPa' };
      return { status: 'Normal', threshold: '1050 hPa' };
    }

    if (lowercase.includes('aqi')) {
      if (val > 150) return { status: 'Alert', threshold: '150' };
      return { status: 'Normal', threshold: '150' };
    }

    if (lowercase.includes('pm2.5')) {
      if (val > 75) return { status: 'Alert', threshold: '75 µg/m³' };
      return { status: 'Normal', threshold: '75 µg/m³' };
    }

    if (lowercase.includes('water level')) {
      if (val < 10) return { status: 'Critical', threshold: '10%' };
      return { status: 'Normal', threshold: '10%' };
    }

    if (lowercase.includes('flow rate') || lowercase.includes('flow')) {
      if (val > 180) return { status: 'Alert', threshold: '180 L/min' };
      return { status: 'Normal', threshold: '180 L/min' };
    }

    if (lowercase.includes('vibration')) {
      if (val > 8) return { status: 'Alert', threshold: '8 mm/s' };
      return { status: 'Normal', threshold: '8 mm/s' };
    }

    if (lowercase.includes('soil moisture')) {
      if (val < 15) return { status: 'Alert', threshold: '15%' };
      return { status: 'Normal', threshold: '15%' };
    }

    if (lowercase.includes('power')) {
      if (val > 4500) return { status: 'Alert', threshold: '4500 W' };
      return { status: 'Normal', threshold: '4500 W' };
    }

    if (lowercase.includes('health')) {
      if (val < 60) return { status: 'Alert', threshold: '60%' };
      return { status: 'Normal', threshold: '60%' };
    }

    if (lowercase.includes('speed')) {
      if (val > 100) return { status: 'Alert', threshold: '100 km/h' };
      return { status: 'Normal', threshold: '100 km/h' };
    }

    return { status: 'Normal', threshold: 'N/A' };
  };

  const getCardStatusStyles = (status) => {
    switch (status) {
      case 'Critical':
        return 'border-danger bg-danger/5 shadow-[0_0_20px_-3px_rgba(239,68,68,0.25)]';
      case 'Alert':
        return 'border-orange-500 bg-orange-500/5 shadow-[0_0_20px_-3px_rgba(249,115,22,0.2)]';
      case 'Warning':
        return 'border-warning/70 bg-warning/5 shadow-[0_0_15px_-3px_rgba(245,158,11,0.12)]';
      default:
        return 'border-border bg-card hover:border-primary/30';
    }
  };

  const getBadgeStatusStyles = (status) => {
    switch (status) {
      case 'Critical':
        return 'bg-danger/20 text-danger border border-danger/30';
      case 'Alert':
        return 'bg-orange-500/20 text-orange-500 border border-orange-500/30';
      case 'Warning':
        return 'bg-warning/20 text-warning border border-warning/30';
      default:
        return 'bg-success/20 text-success border border-success/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-6">
        <div className="bg-danger/10 border border-danger/20 text-danger p-5 rounded-xl text-center font-medium shadow-soft">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Redesigned Large Information Panel Header */}
      {selectedDevice && (
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-soft flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 flex-1">
            <div className="p-3.5 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-text font-display leading-tight">{selectedDevice.device_name}</h1>
                <span className="text-[10px] text-muted font-mono font-bold bg-secondary px-2 py-0.5 rounded border border-border">{selectedDevice.device_code}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted font-medium">
                <span className="flex items-center"><Info className="w-3.5 h-3.5 mr-1" /> Category: <strong className="text-text font-semibold ml-1">{selectedDevice.sensor_type}</strong></span>
                <span className="hidden sm:inline text-border">•</span>
                <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> Protocol: <strong className="text-text font-semibold ml-1">{selectedDevice.protocol || 'N/A'}</strong></span>
                <span className="hidden sm:inline text-border">•</span>
                <span className="flex items-center"><Activity className="w-3.5 h-3.5 mr-1" /> Status: <StatusBadge status={selectedDevice.status} /></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full lg:w-auto">
            <div className="flex flex-col space-y-1 w-full sm:w-auto">
              <label className="text-[9px] font-bold text-muted uppercase tracking-widest">Select Monitored Device</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-background border border-border rounded-lg px-3.5 py-2.5 text-xs font-semibold text-text focus:outline-none focus:border-primary cursor-pointer w-full sm:w-60"
              >
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.device_name} ({d.device_code})
                  </option>
                ))}
                {devices.length === 0 && (
                  <option value="">No sensor devices registered</option>
                )}
              </select>
            </div>

            {/* Test Spike Action Button */}
            {(selectedDevice.status || '').toLowerCase() !== 'offline' && (
              <button
                onClick={handleForceSpike}
                disabled={spiking}
                className="btn-danger flex items-center space-x-2 text-xs py-2.5 px-4 border border-danger/30 cursor-pointer w-full sm:w-auto justify-center select-none font-bold uppercase tracking-wider mt-4 sm:mt-auto"
              >
                {spiking ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Force Test Mode</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Cockpit Layout Grid */}
      {selectedDevice ? (
        <>
          {(selectedDevice.status || '').toLowerCase() === 'offline' ? (
            <div className="bg-danger/10 border border-danger/25 text-danger p-8 rounded-xl text-center space-y-3 shadow-soft max-w-lg mx-auto mt-6">
              <AlertTriangle className="w-12 h-12 mx-auto text-danger animate-pulse" />
              <h3 className="font-display text-lg font-bold text-text uppercase tracking-wide">Device Offline</h3>
              <p className="text-xs text-muted leading-relaxed">
                Live telemetry simulation and rules engine polling are suspended while the asset state is set to Offline.
              </p>
            </div>
          ) : Object.keys(telemetry).length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-16 text-center space-y-3 text-muted shadow-soft">
              <Cpu className="w-12 h-12 mx-auto text-muted/60 animate-pulse" />
              <h3 className="font-display text-base font-bold text-text uppercase tracking-wide">Waiting for Handshake</h3>
              <p className="text-xs max-w-sm mx-auto leading-relaxed">
                Listening for incoming telemetry packets. The simulator engine will broadcast updates momentarily.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Poll Status Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-muted font-medium px-1">
                <div className="flex items-center space-x-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                  </span>
                  <span className="font-bold text-success uppercase tracking-widest text-[9px]">Live Connection Polling</span>
                </div>
                
                <div className="flex items-center space-x-4">
                  {activeAlerts.length > 0 && (
                    <div className="bg-danger/10 border border-danger/20 text-danger px-3 py-1 rounded-full font-bold text-[9px] animate-pulse uppercase">
                      Active Alerts: {activeAlerts.length}
                    </div>
                  )}
                  {lastUpdated && (
                    <div>
                      Last transmission: <span className="font-semibold text-text font-mono">{lastUpdated.toLocaleTimeString()}</span> ({timeAgo})
                    </div>
                  )}
                </div>
              </div>

              {/* Telemetry Chart Panel */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
                <h3 className="font-display text-xs font-bold text-text uppercase tracking-wider mb-4 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-primary animate-pulse" />
                  <span>Telemetry Analytics (Last 24 Hours / Live Trend)</span>
                </h3>
                {chartData.length === 0 ? (
                  <div className="py-20 text-center text-muted font-medium text-xs">
                    No historical readings available for trend charts.
                  </div>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1F2937', color: '#F3F4F6' }} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                        {Object.keys(chartData[0] || {})
                          .filter(k => k !== 'time')
                          .map((metric, i) => {
                            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                            const color = colors[i % colors.length];
                            return (
                              <Line
                                key={metric}
                                type="monotone"
                                dataKey={metric}
                                stroke={color}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 4 }}
                              />
                            );
                          })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Spacing adjustments: Spilt telemetry cards vs Alerts logs panel */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
                {/* Telemetry Metric Cards Grid */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Object.entries(telemetry).map(([metricName, metricValue]) => {
                    const meta = getMetricMetadata(metricName);
                    const Icon = meta.icon;

                    const metricEvaluation = getMetricStatusAndThreshold(metricName, metricValue);
                    const currentStatus = metricEvaluation.status;
                    const thresholdLimit = metricEvaluation.threshold;
                    const trend = trends[metricName] || 'Stable';

                    return (
                      <div 
                        key={metricName} 
                        className={`border rounded-xl p-6 relative overflow-hidden group transition-all duration-300 min-h-[170px] flex flex-col justify-between ${getCardStatusStyles(currentStatus)} hover:scale-[1.02] hover:-translate-y-0.5`}
                      >
                        {/* Background watermark icon */}
                        <div className="absolute -right-4 -top-4 text-border/20 group-hover:text-primary/5 transition-colors duration-300 select-none">
                          <Icon className="w-28 h-28" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full justify-between space-y-4">
                          <div>
                            {/* Header Section */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-wider">
                                <Icon className="w-4 h-4" />
                                <span>{meta.label}</span>
                              </div>
                              
                              <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${getBadgeStatusStyles(currentStatus)}`}>
                                {currentStatus}
                              </span>
                            </div>

                            {/* Metric Value */}
                            <div className="flex items-baseline space-x-2 mt-3.5">
                              <span className="text-4xl font-extrabold font-display text-text tracking-tight">
                                {metricValue}
                              </span>
                              {meta.unit && (
                                <span className="text-sm text-muted font-bold">{meta.unit}</span>
                              )}
                            </div>
                          </div>

                          {/* Footer parameters: Threshold & Trend */}
                          <div className="flex justify-between items-center text-[10px] border-t border-border/40 pt-3 text-muted font-medium">
                            <span>
                              Limit: <strong className="text-text font-mono font-semibold">{thresholdLimit}</strong>
                            </span>
                            
                            <span className="flex items-center">
                              {trend === 'Rising' && <TrendingUp className="w-3.5 h-3.5 text-danger mr-1" />}
                              {trend === 'Falling' && <TrendingDown className="w-3.5 h-3.5 text-success mr-1" />}
                              {trend === 'Stable' && <span className="w-1.5 h-1.5 rounded-full bg-muted mr-1.5"></span>}
                              Trend: <strong className="text-text font-semibold ml-1">{trend}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sticky Active Alerts Panel */}
                <div className="lg:col-span-1">
                  <div className="bg-card border border-border rounded-xl p-5 shadow-soft flex flex-col min-h-[400px] max-h-[600px]">
                    <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                      <div className="flex items-center space-x-2 text-text font-bold text-xs uppercase tracking-wider">
                        <Bell className="w-4 h-4 text-danger animate-pulse" />
                        <span>Active Incident Logs</span>
                      </div>
                      <span className="bg-danger/10 text-danger text-[10px] font-bold px-2 py-0.5 rounded-full border border-danger/20 font-mono">
                        {activeAlerts.length}
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                      {activeAlerts.map(alert => (
                        <div key={alert.id} className={`p-4 rounded-lg border flex flex-col space-y-2 relative overflow-hidden transition-all duration-200 ${
                          alert.severity === 'Critical' ? 'border-danger/30 bg-danger/5 hover:bg-danger/10' :
                          alert.severity === 'High' ? 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10' :
                          alert.severity === 'Medium' ? 'border-warning/30 bg-warning/5 hover:bg-warning/10' :
                          'border-primary/30 bg-primary/5 hover:bg-primary/10'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              alert.severity === 'Critical' ? 'bg-danger/20 text-danger border border-danger/30' :
                              alert.severity === 'High' ? 'bg-orange-500/20 text-orange border border-orange-500/30' :
                              alert.severity === 'Medium' ? 'bg-warning/20 text-warning border border-warning/30' :
                              'bg-primary/20 text-primary border border-primary/30'
                            }`}>
                              {alert.severity}
                            </span>
                            <span className="text-[9px] text-muted font-mono font-medium">
                              {new Date(alert.created_at || new Date()).toLocaleTimeString()}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-text leading-snug">{alert.message}</p>
                            <div className="flex items-center space-x-3 mt-1.5 text-[9px] text-muted font-mono">
                              <span>Metric: {alert.metric_name}</span>
                              <span>Value: <strong className="text-danger font-bold">{alert.metric_value}</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {activeAlerts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center text-muted text-xs space-y-3">
                          <CheckCircle2 className="w-10 h-10 text-success/60" />
                          <p className="font-bold text-text uppercase tracking-widest text-[9px]">All Systems Normal</p>
                          <p className="max-w-[170px] leading-relaxed">No telemetry threshold violations currently logged for this asset.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-16 text-center text-muted font-medium shadow-soft">
          Please select or register a sensor device to initiate live telemetry feeds.
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center space-x-3 px-4.5 py-3.5 rounded-lg border shadow-xl transition-all duration-300 transform translate-y-0 animate-slide-in text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-success/15 border-success/35 text-success-light backdrop-blur-md'
                : 'bg-danger/15 border-danger/35 text-danger-light backdrop-blur-md'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-danger animate-pulse" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
