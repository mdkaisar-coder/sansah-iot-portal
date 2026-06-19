import { useEffect, useState } from 'react';
import { Cpu, Server, AlertTriangle, Activity, RefreshCw, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import StatCard from '../components/StatCard';
import AlertCard from '../components/AlertCard';
import TableComponent from '../components/TableComponent';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    totalDevices: 0, 
    onlineDevices: 0, 
    offlineDevices: 0, 
    totalAlerts: 0,
    categoryBreakdown: {}
  });
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsData, devicesData, alertsData] = await Promise.all([
        api.fetchDashboardStats(),
        api.fetchDevices(),
        api.fetchAlerts({ limit: 5 })
      ]);

      setStats(statsData);
      
      if (devicesData.success) {
        setDevices(devicesData.data.map(d => ({
          id: d.id,
          device_code: d.device_code,
          name: d.device_name,
          protocol: d.protocol,
          client_name: d.client_name || 'N/A',
          project: d.project_name || 'N/A',
          status: d.status
        })));
      }

      if (alertsData.success) {
        setAlerts(alertsData.data.map(a => ({
          id: a.id,
          severity: a.severity || 'Warning',
          message: a.message,
          deviceName: a.device_name || 'Unknown Device',
          date: a.created_at,
          status: a.status
        })));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard metrics. Is the database connected and server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
        <div className="bg-danger/10 border border-danger/20 text-danger p-6 rounded-xl text-center font-medium shadow-soft">
          <p className="mb-4 text-sm">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="btn-secondary inline-flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  // Calculate percentage of category breakdown for custom visual progress chart
  const maxCategoryCount = Math.max(...Object.values(stats.categoryBreakdown || { 'Placeholder': 1 }));

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Title section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text tracking-wide uppercase">System Overview</h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Live telemetry metrics and IoT device connectivity statistics.</p>
        </div>
        <button 
          onClick={fetchDashboardData} 
          className="btn-secondary flex items-center space-x-2 text-xs py-2 px-4 select-none cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Operations</span>
        </button>
      </div>

      {/* Top Row: KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Devices" 
          value={stats.totalDevices} 
          icon={Cpu} 
          colorClass="bg-primary/10 text-primary border border-primary/20" 
          statusColor="primary"
        />
        <StatCard 
          title="Online Devices" 
          value={stats.onlineDevices} 
          icon={Activity} 
          colorClass="bg-success/10 text-success border border-success/20" 
          statusColor="success"
        />
        <StatCard 
          title="Offline Devices" 
          value={stats.offlineDevices} 
          icon={Server} 
          colorClass="bg-muted/10 text-muted border border-border" 
          statusColor="muted"
        />
        <StatCard 
          title="Active Alerts" 
          value={stats.totalAlerts} 
          icon={AlertTriangle} 
          colorClass={stats.totalAlerts > 0 ? "bg-danger/15 text-danger border border-danger/25" : "bg-success/10 text-success border border-success/20"} 
          statusColor={stats.totalAlerts > 0 ? "danger" : "success"}
        />
      </div>

      {/* Second Row: Recent Assets & Recent Alarms split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Col: Recent Assets Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-display text-sm font-bold text-text uppercase tracking-wider">Recent Registered Assets</h2>
            <Link to="/devices" className="text-xs text-primary hover:underline font-semibold">View Inventory &rarr;</Link>
          </div>
          
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-soft">
            <TableComponent headers={['Device Profile', 'Protocol', 'Deployment Project', 'Status', 'Action']}>
              {devices.slice(0, 5).map((device) => (
                <tr key={device.id} className="hover:bg-secondary/20 transition-all border-b border-border/40 last:border-b-0">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-text text-sm">{device.name}</div>
                    <div className="text-[10px] text-muted font-mono mt-0.5">{device.device_code}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-text">{device.protocol}</td>
                  <td className="px-6 py-4 text-xs text-muted font-medium">{device.project}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={device.status} />
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/devices/${device.id}`} className="text-xs font-semibold text-primary hover:underline">Details</Link>
                  </td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-muted text-sm font-medium">No registered assets found.</td>
                </tr>
              )}
            </TableComponent>
          </div>
        </div>

        {/* Right Col: Recent Alerts List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-display text-sm font-bold text-text uppercase tracking-wider">Recent Alert Alarms</h2>
            <Link to="/alerts" className="text-xs text-primary hover:underline font-semibold">Alarm Center &rarr;</Link>
          </div>
          
          <div className="space-y-4">
            {alerts.slice(0, 4).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-16 text-muted text-sm bg-card border border-border rounded-xl shadow-soft font-medium">
                No active alarm incidents detected.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Third Row: Device Categories Breakdown Progress Chart */}
      {stats.categoryBreakdown && Object.keys(stats.categoryBreakdown).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 sm:p-7 shadow-soft space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-border/50 pb-3">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xs font-bold text-text uppercase tracking-wider">Device Categories Distribution</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {Object.entries(stats.categoryBreakdown).map(([category, count]) => {
              const pct = maxCategoryCount > 0 ? (count / maxCategoryCount) * 100 : 0;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text font-semibold">{category}</span>
                    <span className="text-muted font-mono font-bold">{count} {count === 1 ? 'device' : 'devices'}</span>
                  </div>
                  
                  {/* Visual Progress Bar Chart */}
                  <div className="w-full bg-background h-2.5 rounded-full overflow-hidden border border-border/40">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
