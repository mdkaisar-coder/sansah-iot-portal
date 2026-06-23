import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, CheckCircle2, Eye, ShieldAlert, Check, HelpCircle, RefreshCw, Download, FileText } from 'lucide-react';
import { api } from '../services/api';
import TableComponent from '../components/TableComponent';
import StatusBadge from '../components/StatusBadge';

export default function Alerts() {
  const [alertsList, setAlertsList] = useState([]);
  const [devicesList, setDevicesList] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDeviceId, setSelectedDeviceId] = useState('All');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState(null); // For details modal
  const limit = 10;

  // Fetch all devices on mount to populate the device filter dropdown
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await api.fetchDevices();
        if (res.success) {
          setDevicesList(res.data);
        }
      } catch (err) {
        console.error('Failed to retrieve devices list for filters:', err);
      }
    };
    fetchDevices();
  }, []);

  const fetchAlertsAndStats = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit,
        status: statusFilter,
        severity: severityFilter,
        device_id: selectedDeviceId !== 'All' ? selectedDeviceId : undefined
      };

      const [statsData, alertsData] = await Promise.all([
        api.fetchAlertStats(),
        api.fetchAlerts(params)
      ]);

      if (statsData.success) {
        setStats(statsData.data);
      }

      if (alertsData.success) {
        setAlertsList(alertsData.data);
        setTotalCount(alertsData.total);
      } else {
        setError(alertsData.message || 'Failed to retrieve alerts feed.');
      }
    } catch (err) {
      console.error('Failed fetching alerts:', err);
      setError('Connection to IoT Portal service failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (alertsList.length === 0) {
      alert('No alerts logged to export.');
      return;
    }

    const exportData = alertsList.map(a => ({
      'Alert ID': a.id,
      'Device Name': a.device_name,
      'Device Code': a.device_code || 'N/A',
      'Client Name': a.client_name || 'N/A',
      'Client Email': a.client_email || 'N/A',
      'Project': a.project_name || 'N/A',
      'Metric': a.metric_name,
      'Logged Reading': a.metric_value,
      'Threshold': a.threshold_value,
      'Severity': a.severity,
      'Status': a.status,
      'Timestamp': new Date(a.created_at).toLocaleString(),
      'Message': a.message
    }));

    const headers = Object.keys(exportData[0]);
    const csvRows = [headers.join(',')];

    for (const row of exportData) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + (val === null || val === undefined ? '' : val)).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Sansah_Alerts_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (alertsList.length === 0) {
      alert('No alerts logged to export.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is preventing the PDF print view from opening. Please allow popups.');
      return;
    }

    const alertsHtml = alertsList.map(alert => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px;"><strong>${alert.device_name}</strong><br/><span style="color:#64748b; font-family:monospace; font-size:9px;">${alert.device_code || ''}</span></td>
        <td style="padding: 8px;">${alert.client_name || 'N/A'}</td>
        <td style="padding: 8px; font-family: monospace;">${alert.metric_name}: <strong>${alert.metric_value}</strong></td>
        <td style="padding: 8px; font-family: monospace; color: #475569;">${alert.threshold_value}</td>
        <td style="padding: 8px;"><span style="font-weight: bold; color: ${
          alert.severity === 'Critical' ? '#ef4444' :
          alert.severity === 'High' ? '#f97316' :
          alert.severity === 'Medium' ? '#eab308' : '#3b82f6'
        }">${alert.severity}</span></td>
        <td style="padding: 8px;">${alert.status}</td>
        <td style="padding: 8px; font-family: monospace; font-size:10px;">${new Date(alert.created_at).toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Sansah Innovations - IoT Alarm Incident Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; }
            h1 { font-size: 24px; color: #0f172a; margin-bottom: 4px; }
            .header-table { width: 100%; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 11px; font-weight: bold; border: 1px solid #e2e8f0; }
            td { border: 1px solid #e2e8f0; padding: 8px; }
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
                <span style="font-size: 12px; color: #64748b; font-weight: 600; tracking-wider;">IoT PORTAL ALARM INCIDENT REPORT</span>
              </td>
              <td style="text-align: right; vertical-align: bottom; border: none;">
                <span style="font-size: 12px; color: #64748b;">Report Generated: ${new Date().toLocaleString()}</span>
              </td>
            </tr>
          </table>

          <div style="display: flex; gap: 15px; margin-bottom: 25px; font-size: 12px;">
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; background-color: #f8fafc; flex: 1;">
              <strong>Active Alarms:</strong> ${stats.active}
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; background-color: #f8fafc; flex: 1;">
              <strong>Critical Alarms:</strong> ${stats.critical}
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; background-color: #f8fafc; flex: 1;">
              <strong>Total Logged Alarms:</strong> ${stats.total}
            </div>
          </div>

          <h2>Alarm Feed Listing</h2>
          <table>
            <thead>
              <tr>
                <th>Device Asset</th>
                <th>Client Name</th>
                <th>Metric Reading</th>
                <th>Threshold</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${alertsHtml}
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

  useEffect(() => {
    fetchAlertsAndStats();
  }, [page, severityFilter, statusFilter, selectedDeviceId]);

  const handleAcknowledge = async (id) => {
    try {
      const data = await api.acknowledgeAlert(id);
      if (data.success) {
        fetchAlertsAndStats();
        if (selectedAlert && selectedAlert.id === id) {
          setSelectedAlert(data.data);
        }
      } else {
        alert(data.message || 'Failed to acknowledge alert.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to acknowledge alert. Please try again.');
    }
  };

  const handleResolve = async (id) => {
    try {
      const data = await api.resolveAlert(id);
      if (data.success) {
        fetchAlertsAndStats();
        if (selectedAlert && selectedAlert.id === id) {
          setSelectedAlert(data.data);
        }
      } else {
        alert(data.message || 'Failed to resolve alert.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to resolve alert. Please try again.');
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'Critical': return 'bg-danger/10 text-danger border border-danger/20 shadow-[0_0_10px_-3px_rgba(239,68,68,0.15)]';
      case 'High': return 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_10px_-3px_rgba(249,115,22,0.15)]';
      case 'Medium': return 'bg-warning/10 text-warning border border-warning/20 shadow-[0_0_10px_-3px_rgba(245,158,11,0.15)]';
      case 'Low': return 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_-3px_rgba(59,130,246,0.15)]';
      default: return 'bg-muted/10 text-muted';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active': return 'bg-danger/10 text-danger border border-danger/20';
      case 'Acknowledged': return 'bg-warning/10 text-warning border border-warning/20';
      case 'Resolved': return 'bg-success/10 text-success border border-success/20';
      default: return 'bg-muted/10 text-muted';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text tracking-wide uppercase">Alarm Center</h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Real-time telemetry anomaly detection and alert lifecycle management.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button 
            onClick={handleExportCSV} 
            className="btn-secondary flex items-center space-x-2 text-xs py-2 px-4 select-none cursor-pointer font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={handleExportPDF} 
            className="btn-secondary flex items-center space-x-2 text-xs py-2 px-4 select-none cursor-pointer font-bold"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF Report</span>
          </button>
          <button 
            onClick={fetchAlertsAndStats} 
            className="btn-secondary flex items-center space-x-2 text-xs py-2 px-4 select-none cursor-pointer font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Feeds</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Alerts */}
        <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between shadow-soft hover:border-primary/20 hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-muted group">
          <div className="space-y-1">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Total Alerts</span>
            {loading ? (
              <div className="h-8 bg-secondary rounded w-12 animate-pulse mt-1"></div>
            ) : (
              <span className="text-3xl font-extrabold font-display text-text block leading-tight">{stats.total}</span>
            )}
          </div>
          <div className="p-3.5 bg-secondary/40 text-muted rounded-xl border border-border group-hover:scale-110 transition-transform">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active Alerts */}
        <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between shadow-soft hover:border-danger/20 hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-danger group">
          <div className="space-y-1">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Active Alerts</span>
            {loading ? (
              <div className="h-8 bg-secondary rounded w-12 animate-pulse mt-1"></div>
            ) : (
              <span className="text-3xl font-extrabold font-display text-text block leading-tight">{stats.active}</span>
            )}
          </div>
          <div className="p-3.5 bg-danger/10 text-danger rounded-xl border border-danger/20 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Card 3: Critical Severity Alerts */}
        <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between shadow-soft hover:border-danger/30 hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-danger group">
          <div className="space-y-1">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Critical</span>
            {loading ? (
              <div className="h-8 bg-secondary rounded w-12 animate-pulse mt-1"></div>
            ) : (
              <span className="text-3xl font-extrabold font-display text-text block leading-tight">{stats.critical}</span>
            )}
          </div>
          <div className="p-3.5 bg-danger/15 text-danger rounded-xl border border-danger/25 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Resolved Alerts */}
        <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between shadow-soft hover:border-success/20 hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-success group">
          <div className="space-y-1">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Resolved</span>
            {loading ? (
              <div className="h-8 bg-secondary rounded w-12 animate-pulse mt-1"></div>
            ) : (
              <span className="text-3xl font-extrabold font-display text-text block leading-tight">{stats.resolved}</span>
            )}
          </div>
          <div className="p-3.5 bg-success/10 text-success rounded-xl border border-success/20 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Dashboard Header */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Status Filter */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs text-muted font-bold uppercase tracking-wider">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-background border border-border rounded-lg px-3.5 py-2.5 text-xs font-semibold text-text focus:outline-none focus:border-primary cursor-pointer w-full"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs text-muted font-bold uppercase tracking-wider">Severity Filter</label>
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              className="bg-background border border-border rounded-lg px-3.5 py-2.5 text-xs font-semibold text-text focus:outline-none focus:border-primary cursor-pointer w-full"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Device Filter */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs text-muted font-bold uppercase tracking-wider">Device Filter</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => { setSelectedDeviceId(e.target.value); setPage(1); }}
              className="bg-background border border-border rounded-lg px-3.5 py-2.5 text-xs font-semibold text-text focus:outline-none focus:border-primary cursor-pointer w-full"
            >
              <option value="All">All Devices</option>
              {devicesList.map(dev => (
                <option key={dev.id} value={dev.id}>
                  {dev.device_name} ({dev.device_code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      {error ? (
        <div className="bg-danger/10 border border-danger/20 text-danger p-6 rounded-xl text-center font-medium shadow-soft">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-soft">
            <TableComponent headers={['Device', 'Client', 'Project', 'Metric', 'Current Value', 'Threshold', 'Severity', 'Status', 'Created Time', 'Actions']}>
              {loading ? (
                Array.from({ length: limit }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse border-b border-border/40">
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-12 font-mono"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-12 font-mono"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-secondary rounded-md w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-secondary rounded-md w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-secondary rounded w-16"></div></td>
                  </tr>
                ))
              ) : alertsList.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-muted text-sm font-semibold bg-card leading-relaxed">
                    No registered alarm incidents logged.
                  </td>
                </tr>
              ) : (
                alertsList.map((alert) => (
                  <tr key={alert.id} className="hover:bg-secondary/20 transition-all border-b border-border/40 last:border-b-0">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-text text-sm">{alert.device_name}</div>
                      <div className="text-[10px] text-muted font-mono mt-0.5 tracking-wider uppercase">{alert.device_code || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-text">{alert.client_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs text-muted font-medium">{alert.project_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs font-semibold font-mono text-text">{alert.metric_name}</td>
                    <td className="px-6 py-4 text-xs font-bold font-mono text-danger">{alert.metric_value}</td>
                    <td className="px-6 py-4 text-xs font-mono text-muted">{alert.threshold_value}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getSeverityBadgeClass(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(alert.status)}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted text-xs font-mono">
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          title="View Details"
                          className="p-1.5 hover:bg-secondary text-primary rounded-md transition-colors cursor-pointer border border-transparent hover:border-border"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {alert.status === 'Active' && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            title="Acknowledge Alert"
                            className="p-1.5 hover:bg-secondary text-warning rounded-md transition-colors cursor-pointer border border-transparent hover:border-border"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        {alert.status !== 'Resolved' && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            title="Resolve Alert"
                            className="p-1.5 hover:bg-secondary text-success rounded-md transition-colors cursor-pointer border border-transparent hover:border-border"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </TableComponent>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 font-semibold text-xs">
              <span className="text-muted">
                Showing page <strong className="text-text">{page}</strong> of <strong className="text-text">{totalPages}</strong> ({totalCount} total alerts)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="px-3.5 py-2 text-xs font-bold text-text bg-card border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-all cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="px-3.5 py-2 text-xs font-bold text-text bg-card border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details View Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-background/50">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider font-display flex items-center space-x-2">
                <AlertTriangle className={`w-4 h-4 ${selectedAlert.severity === 'Critical' ? 'text-danger animate-pulse' : 'text-warning'}`} />
                <span>Alarm Incident Profile</span>
              </h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-muted hover:text-text text-xl font-semibold p-1 hover:bg-secondary rounded-md cursor-pointer border border-transparent"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 max-h-[70vh]">
              <div className="bg-secondary/20 p-4 rounded-lg border border-border/50">
                <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Incident Message</span>
                <p className="text-sm font-semibold text-text mt-1">{selectedAlert.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted block">Device Asset</span>
                  <span className="text-sm text-text font-semibold">{selectedAlert.device_name}</span>
                  <span className="text-xs text-muted block font-mono mt-0.5">{selectedAlert.device_code || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Sensor Category</span>
                  <span className="text-sm text-text font-semibold">{selectedAlert.sensor_type}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Metric / Reading</span>
                  <span className="text-sm text-text font-semibold">{selectedAlert.metric_name}</span>
                  <span className="text-xs text-danger font-semibold font-mono block mt-0.5">Current: {selectedAlert.metric_value}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Threshold Reference</span>
                  <span className="text-sm text-text font-semibold font-mono mt-0.5">{selectedAlert.threshold_value}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">Severity</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase inline-block ${getSeverityBadgeClass(selectedAlert.severity)}`}>
                    {selectedAlert.severity}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">Status State</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase inline-block ${getStatusBadgeClass(selectedAlert.status)}`}>
                    {selectedAlert.status}
                  </span>
                </div>
              </div>

              <hr className="border-border" />

              <div>
                <span className="text-[10px] font-bold uppercase text-muted tracking-wider block mb-2">Client Details & Deployment</span>
                <div className="grid grid-cols-2 gap-3 bg-secondary/10 p-3.5 rounded-lg border border-border/30 text-xs">
                  <div>
                    <span className="text-muted block">Client Name</span>
                    <span className="text-text font-semibold">{selectedAlert.client_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Project Name</span>
                    <span className="text-text font-semibold">{selectedAlert.project_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Client Email</span>
                    <span className="text-text font-mono truncate block mt-0.5" title={selectedAlert.client_email}>{selectedAlert.client_email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Location / Site</span>
                    <span className="text-text font-semibold">{selectedAlert.location || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              <div className="space-y-2 text-xs text-muted">
                <div className="flex justify-between">
                  <span>Created At:</span>
                  <span className="text-text font-medium">{new Date(selectedAlert.created_at).toLocaleString()}</span>
                </div>
                {selectedAlert.acknowledged_at && (
                  <div className="flex justify-between">
                    <span>Acknowledged At:</span>
                    <span className="text-text font-medium">{new Date(selectedAlert.acknowledged_at).toLocaleString()}</span>
                  </div>
                )}
                {selectedAlert.resolved_at && (
                  <div className="flex justify-between">
                    <span>Resolved At:</span>
                    <span className="text-text font-medium">{new Date(selectedAlert.resolved_at).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Email Notification Sent:</span>
                  <span className={`font-semibold ${selectedAlert.email_sent ? 'text-success font-bold' : 'text-muted'}`}>
                    {selectedAlert.email_sent ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end space-x-3 bg-background/50">
              {selectedAlert.status === 'Active' && (
                <button
                  onClick={() => handleAcknowledge(selectedAlert.id)}
                  className="btn-secondary py-1.5 text-xs text-warning border-warning/20 hover:bg-warning/10"
                >
                  Acknowledge
                </button>
              )}
              {selectedAlert.status !== 'Resolved' && (
                <button
                  onClick={() => handleResolve(selectedAlert.id)}
                  className="btn-success py-1.5 text-xs"
                >
                  Resolve Alert
                </button>
              )}
              <button
                onClick={() => setSelectedAlert(null)}
                className="btn-secondary py-1.5 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
