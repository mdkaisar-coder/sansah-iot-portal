import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Server, Activity, Tag, MapPin, Calendar, Hash, Cpu, Mail, Phone, User, Bell, BellOff, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function DeviceDetails() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDeviceDetailsAndAlerts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch device info, alerts history, and timeline in parallel
      const [deviceRes, alertsRes, timelineRes] = await Promise.all([
        api.fetchDeviceById(id),
        api.fetchAlerts({ device_id: id, limit: 5 }),
        api.fetchDeviceTimeline(id)
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

      if (timelineRes.success) {
        setTimeline(timelineRes.data);
      }
    } catch (err) {
      console.error('Error fetching device details/alerts/timeline:', err);
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

  // Calculate onboarding steps status
  const onboardingSteps = [
    { name: 'Device Registration', desc: 'Base asset register', completed: true },
    { name: 'Protocol Mapping', desc: `Mapped to ${device.protocol || 'None'}`, completed: !!device.protocol },
    { name: 'Sensor Mapping', desc: device.sensor_type || 'Unspecified', completed: !!device.sensor_type && device.sensor_type !== 'N/A' },
    { name: 'Thresholds Config', desc: device.alert_enabled ? 'Alert rules configured' : 'Notifications muted', completed: true },
    { name: 'Client Assignment', desc: device.client_name !== 'N/A' ? device.client_name : 'No client mapped', completed: device.client_name && device.client_name !== 'N/A' },
    { name: 'Monitoring Ready', desc: device.status === 'Online' ? 'Active telemetry flow' : 'Inactive/Offline', completed: device.status === 'Online' }
  ];

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is preventing the PDF print view from opening. Please allow popups.');
      return;
    }

    const onboardingSummary = onboardingSteps.map((step, idx) => `
      <div style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: ${step.completed ? '#f0fdf4' : '#fff'};">
        <strong style="color: ${step.completed ? '#166534' : '#64748b'};">Step ${idx + 1}: ${step.name}</strong><br/>
        <span style="font-size: 11px; color: #475569;">${step.desc} (${step.completed ? '✓ Completed' : '✕ Pending'})</span>
      </div>
    `).join('');

    const timelineHtml = timeline.map(event => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; font-size: 11px; font-family: monospace;">${new Date(event.timestamp).toLocaleString()}</td>
        <td style="padding: 8px; font-size: 11px;"><strong>${event.title}</strong></td>
        <td style="padding: 8px; font-size: 11px; color: #475569;">${event.description}</td>
        <td style="padding: 8px; font-size: 11px; color: #64748b;">${event.actor}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Sansah Innovations - IoT Device Handbook (${device.device_code})</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; }
            h1 { font-size: 24px; color: #0f172a; margin-bottom: 4px; }
            h2 { font-size: 16px; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 30px; }
            .header-table { width: 100%; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 30px; }
            .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc; }
            .card h3 { margin: 0 0 10px 0; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 11px; font-weight: bold; border: 1px solid #e2e8f0; }
            td { border: 1px solid #e2e8f0; padding: 8px; }
            .step-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
            @media print {
              body { padding: 20px; }
              @page { size: A4; margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <table class="header-table" style="width: 100%; border: none;">
            <tr>
              <td style="border: none;">
                <h1 style="margin: 0; color: #1d4ed8; font-size: 28px; font-weight: bold; font-family: Arial, sans-serif;">SANSAH INNOVATIONS</h1>
                <span style="font-size: 12px; color: #64748b; font-weight: 600; tracking-wider;">IoT PORTAL DEVICE CONFIGURATION HANDBOOK</span>
              </td>
              <td style="text-align: right; vertical-align: bottom; border: none;">
                <span style="font-size: 12px; color: #64748b;">Report Generated: ${new Date().toLocaleString()}</span>
              </td>
            </tr>
          </table>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 5px 0; border: none; padding: 0; font-size: 18px; color: #1e40af;">Device: ${device.name}</h2>
            <p style="margin: 0; font-family: monospace; font-size: 12px; color: #1e3a8a;">Device ID / Code: ${device.device_code}</p>
          </div>

          <div class="meta-grid">
            <div class="card">
              <h3>Device Specifications</h3>
              <table style="width: 100%; border: none;">
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; border: none; font-size: 12px; color: #475569;">Device Type</td><td style="padding: 6px; border: none; font-size: 12px; font-weight: bold; text-align: right;">${device.type}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; border: none; font-size: 12px; color: #475569;">Sensor Category</td><td style="padding: 6px; border: none; font-size: 12px; font-weight: bold; text-align: right;">${device.sensor_type}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; border: none; font-size: 12px; color: #475569;">Protocol</td><td style="padding: 6px; border: none; font-size: 12px; font-weight: bold; text-align: right; font-family: monospace;">${device.protocol}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; border: none; font-size: 12px; color: #475569;">Registered Date</td><td style="padding: 6px; border: none; font-size: 12px; font-weight: bold; text-align: right;">${new Date(device.registeredDate).toLocaleDateString()}</td></tr>
              </table>
            </div>

            <div class="card">
              <h3>Client Assignment Profile</h3>
              <table style="width: 100%; border: none;">
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; border: none; font-size: 12px; color: #475569;">Client Name</td><td style="padding: 6px; border: none; font-size: 12px; font-weight: bold; text-align: right;">${device.client_name}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; border: none; font-size: 12px; color: #475569;">Client Email</td><td style="padding: 6px; border: none; font-size: 12px; font-weight: bold; text-align: right; font-family: monospace;">${device.client_email}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; border: none; font-size: 12px; color: #475569;">Client Phone</td><td style="padding: 6px; border: none; font-size: 12px; font-weight: bold; text-align: right;">${device.client_phone}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; border: none; font-size: 12px; color: #475569;">Alert Status</td><td style="padding: 6px; border: none; font-size: 12px; font-weight: bold; text-align: right; color: ${device.alert_enabled ? '#16a34a' : '#64748b'};">${device.alert_enabled ? 'Active' : 'Muted'}</td></tr>
              </table>
            </div>
          </div>

          <div class="card" style="margin-bottom: 30px;">
            <h3>Deployment Site Details</h3>
            <table style="width: 100%; border: none;">
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; border: none; font-size: 12px; color: #475569;">Project Group</td><td style="padding: 6px; border: none; font-size: 12px; font-weight: bold;">${device.project}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px; border: none; font-size: 12px; color: #475569;">Deployment Location</td><td style="padding: 6px; border: none; font-size: 12px; font-weight: bold;">${device.site}</td></tr>
            </table>
          </div>

          <h2>Onboarding Workflow Completion Tracker</h2>
          <div class="step-grid">
            ${onboardingSummary}
          </div>

          <h2>Device Activity & Incidents Timeline</h2>
          <table style="margin-top: 15px;">
            <thead>
              <tr>
                <th style="width: 20%; padding: 8px;">Timestamp</th>
                <th style="width: 25%; padding: 8px;">Event Type</th>
                <th style="width: 40%; padding: 8px;">Details</th>
                <th style="width: 15%; padding: 8px;">Actor</th>
              </tr>
            </thead>
            <tbody>
              ${timelineHtml || '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #64748b;">No timeline activity recorded yet.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 50px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 10px; color: #94a3b8;">
            Sansah Innovations Private Limited - Confidentially Generated Document
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
          <button onClick={handleExportPDF} className="btn-secondary flex items-center space-x-2 text-xs cursor-pointer">
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF Handbook</span>
          </button>
          <button onClick={fetchDeviceDetailsAndAlerts} className="btn-secondary flex items-center space-x-2 text-xs cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Onboarding Workflow Tracker */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-soft">
        <h2 className="font-display text-xs font-semibold text-text uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center">
          <Cpu className="w-4 h-4 mr-2 text-primary" />
          <span>Onboarding Progress Tracker</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {onboardingSteps.map((step, idx) => (
            <div 
              key={idx} 
              className={`p-3 border rounded-xl flex flex-col justify-between transition-all ${
                step.completed 
                  ? 'border-success/30 bg-success/5 text-success' 
                  : 'border-border bg-background text-muted'
              }`}
            >
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-60">Step {idx + 1}</div>
                <div className={`text-xs font-bold mt-1 ${step.completed ? 'text-success-text' : 'text-text'}`}>
                  {step.name}
                </div>
              </div>
              <div className="text-[9px] mt-2 font-medium leading-tight opacity-80">
                {step.desc}
              </div>
            </div>
          ))}
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

      {/* History and Timeline section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alarm History grid */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-soft">
          <h2 className="font-display text-xs font-semibold text-text uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span>Alarm Incident History</span>
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-muted uppercase bg-background/50 border-b border-border">
                <tr>
                  <th scope="col" className="px-4 py-3">Telemetry Metric</th>
                  <th scope="col" className="px-4 py-3">Logged Reading</th>
                  <th scope="col" className="px-4 py-3">Threshold Limit</th>
                  <th scope="col" className="px-4 py-3">Severity Level</th>
                  <th scope="col" className="px-4 py-3">Status State</th>
                  <th scope="col" className="px-4 py-3">Incident Timestamp</th>
                  <th scope="col" className="px-4 py-3">Alarm Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-4 font-semibold text-text font-mono">{alert.metric_name}</td>
                    <td className="px-4 py-4 font-mono text-danger font-bold">{alert.metric_value}</td>
                    <td className="px-4 py-4 font-mono text-muted">{alert.threshold_value}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        alert.severity === 'Critical' ? 'bg-danger/20 text-danger border border-danger/30' :
                        alert.severity === 'High' ? 'bg-orange-500/20 text-orange border border-orange/30' :
                        alert.severity === 'Medium' ? 'bg-warning/20 text-warning border border-warning/30' :
                        'bg-primary/20 text-primary border border-primary/30'
                      }`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                        alert.status === 'Active' ? 'bg-danger/10 text-danger border border-danger/20' :
                        alert.status === 'Acknowledged' ? 'bg-warning/10 text-warning border border-warning/20' :
                        'bg-success/10 text-success border border-success/20'
                      }`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted font-mono whitespace-nowrap">
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-text leading-relaxed min-w-[200px]">{alert.message}</td>
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

        {/* Activity Timeline logs */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft flex flex-col">
          <h2 className="font-display text-xs font-semibold text-text uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-primary" />
            <span>Activity Timeline</span>
          </h2>
          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {timeline.length === 0 ? (
              <div className="text-center py-8 text-muted text-xs">No activity timeline logged yet.</div>
            ) : (
              <div className="relative pl-6 border-l border-border space-y-5 ml-3">
                {timeline.map((event) => {
                  let badgeBg = 'bg-primary/20 text-primary border-primary/30';
                  if (event.type === 'alert_trigger') {
                    badgeBg = event.severity === 'Critical' 
                      ? 'bg-danger/20 text-danger border-danger/30' 
                      : 'bg-warning/20 text-warning border-warning/30';
                  } else if (event.type === 'alert_ack') {
                    badgeBg = 'bg-warning/10 text-warning border-warning/20';
                  } else if (event.type === 'alert_resolve') {
                    badgeBg = 'bg-success/20 text-success border-success/30';
                  } else if (event.type === 'onboarding') {
                    badgeBg = 'bg-success/20 text-success border-success/30';
                  }

                  return (
                    <div key={event.id} className="relative group text-xs">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-0.5 flex items-center justify-center w-5 h-5 rounded-full border ${badgeBg} shadow-sm bg-card`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      </span>
                      {/* Timeline content */}
                      <div>
                        <div className="flex justify-between items-center text-muted text-[10px] font-mono">
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                          <span className="opacity-80">By: {event.actor}</span>
                        </div>
                        <h4 className="font-bold text-text mt-1">{event.title}</h4>
                        <p className="text-muted text-[11px] leading-relaxed mt-0.5">{event.description}</p>
                        {event.ip_address && (
                          <div className="text-[9px] text-muted font-mono mt-1 opacity-70">IP: {event.ip_address}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
