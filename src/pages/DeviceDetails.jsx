import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Server, Activity, Tag, MapPin, Calendar, Hash, Cpu, Mail, Phone, User, Bell, BellOff, AlertTriangle, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function DeviceDetails() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDeviceDetailsAndAlerts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch device info and alerts history in parallel
      const [deviceRes, alertsRes] = await Promise.all([
        api.fetchDeviceById(id),
        api.fetchAlerts({ device_id: id, limit: 5 })
      ]);

      if (deviceRes.success) {
        const d = deviceRes.data;
        setDevice({
          id: d.id,
          device_code: d.device_code,
          name: d.device_name,
          type: d.device_type,
          protocol: d.protocol,
          project: d.project_name || 'N/A',
          site: d.location || 'N/A',
          status: d.status,
          sensor_type: d.sensor_type || 'N/A',
          client_name: d.client_name || 'N/A',
          client_email: d.client_email || 'N/A',
          client_phone: d.client_phone || 'N/A',
          alert_enabled: d.alert_enabled,
          registeredDate: d.created_at || new Date().toISOString(),
          lastSeen: d.updated_at || new Date().toISOString()
        });
      } else {
        setError(deviceRes.message || 'Device details not found.');
      }

      if (alertsRes.success) {
        setAlerts(alertsRes.data);
      }
    } catch (err) {
      console.error('Error fetching device details/alerts:', err);
      setError('Failed to connect to the backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceDetailsAndAlerts();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center space-x-4">
          <Link to="/devices" className="p-2 bg-card border border-border hover:bg-secondary rounded-lg transition-colors text-muted hover:text-text">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-muted">Back to inventory</span>
        </div>
        <div className="bg-danger/10 border border-danger/25 text-danger p-6 rounded-xl text-center font-medium shadow-soft">
          {error || 'Device not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/devices" className="p-2 bg-card border border-border hover:bg-secondary rounded-lg transition-colors text-muted hover:text-text">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="font-display text-xl font-bold text-text tracking-wide">{device.name}</h1>
              <StatusBadge status={device.status} />
            </div>
            <p className="text-[10px] text-muted font-mono mt-0.5 tracking-wider uppercase">{device.device_code}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link to="/sensors" className="btn-primary flex items-center space-x-2 text-xs">
            <Activity className="w-3.5 h-3.5" />
            <span>Telemetry cockpit</span>
          </Link>
          <button onClick={fetchDeviceDetailsAndAlerts} className="btn-secondary flex items-center space-x-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Grid Configuration cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Device Specs */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-soft">
          <h2 className="font-display text-xs font-semibold text-text uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center">
            <Tag className="w-4 h-4 mr-2 text-primary" />
            <span>Specifications</span>
          </h2>
          <div className="space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Device Type</span>
              <span className="font-semibold text-text">{device.type}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Sensor Category</span>
              <span className="font-semibold text-text">{device.sensor_type}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Transmission Protocol</span>
              <span className="font-semibold text-text font-mono">{device.protocol}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Registered Date</span>
              <span className="font-semibold text-text">{new Date(device.registeredDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Client Profile */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-soft">
          <h2 className="font-display text-xs font-semibold text-text uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center">
            <User className="w-4 h-4 mr-2 text-primary" />
            <span>Client Profile</span>
          </h2>
          <div className="space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Client Name</span>
              <span className="font-semibold text-text">{device.client_name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Contact Email</span>
              <span className="font-semibold text-text font-mono truncate max-w-[160px]" title={device.client_email}>{device.client_email}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Phone Number</span>
              <span className="font-semibold text-text">{device.client_phone}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted flex items-center">
                {device.alert_enabled ? <Bell className="w-3.5 h-3.5 mr-1.5 text-success" /> : <BellOff className="w-3.5 h-3.5 mr-1.5 text-muted" />}
                Alarm Alerts
              </span>
              <span className={`font-bold uppercase ${device.alert_enabled ? 'text-success' : 'text-muted'}`}>
                {device.alert_enabled ? 'Active' : 'Muted'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Deployment Location */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-soft">
          <h2 className="font-display text-xs font-semibold text-text uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            <span>Deployment Site</span>
          </h2>
          <div className="space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Project Group</span>
              <span className="font-semibold text-text">{device.project}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Deployment Location</span>
              <span className="font-semibold text-text">{device.site}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Signal Status</span>
              <span className="font-semibold text-text flex items-center">
                <span className="w-2 h-2 rounded-full bg-success mr-1.5 animate-ping"></span>
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Last Handshake</span>
              <span className="font-semibold text-text font-mono text-[10px]">{new Date(device.lastSeen).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alarm History grid */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
        <h2 className="font-display text-xs font-semibold text-text uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <span>Alarm Incident History</span>
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] text-muted uppercase bg-background/50 border-b border-border">
              <tr>
                <th scope="col" className="px-6 py-3">Telemetry Metric</th>
                <th scope="col" className="px-6 py-3">Logged Reading</th>
                <th scope="col" className="px-6 py-3">Threshold Limit</th>
                <th scope="col" className="px-6 py-3">Severity Level</th>
                <th scope="col" className="px-6 py-3">Status State</th>
                <th scope="col" className="px-6 py-3">Incident Timestamp</th>
                <th scope="col" className="px-6 py-3">Alarm Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-6 py-4 font-semibold text-text font-mono">{alert.metric_name}</td>
                  <td className="px-6 py-4 font-mono text-danger font-bold">{alert.metric_value}</td>
                  <td className="px-6 py-4 font-mono text-muted">{alert.threshold_value}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      alert.severity === 'Critical' ? 'bg-danger/20 text-danger border border-danger/30' :
                      alert.severity === 'High' ? 'bg-orange-500/20 text-orange border border-orange/30' :
                      alert.severity === 'Medium' ? 'bg-warning/20 text-warning border border-warning/30' :
                      'bg-primary/20 text-primary border border-primary/30'
                    }`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                      alert.status === 'Active' ? 'bg-danger/10 text-danger border border-danger/20' :
                      alert.status === 'Acknowledged' ? 'bg-warning/10 text-warning border border-warning/20' :
                      'bg-success/10 text-success border border-success/20'
                    }`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted font-mono">
                    {new Date(alert.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-text leading-relaxed">{alert.message}</td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-muted">
                    No registered alarm incidents logged for this device.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
