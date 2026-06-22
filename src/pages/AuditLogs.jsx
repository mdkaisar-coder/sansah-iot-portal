import { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw, Calendar, User, Info, MapPin } from 'lucide-react';
import { api } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const json = await api.fetchAuditLogs({
        page,
        limit,
        search: searchTerm,
        action: actionFilter
      });
      if (json.success) {
        setLogs(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      } else {
        setError(json.message || 'Failed to retrieve audit logs.');
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Connection to backend service failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    const date = new Date(ts);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text tracking-wide uppercase">Audit Logs</h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Trace all configuration modifications, login sessions, and state transition histories.</p>
        </div>
        <button 
          onClick={fetchLogs} 
          className="btn-secondary flex items-center space-x-2 text-xs py-2 px-4 select-none cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter panel */}
      <form onSubmit={handleSearchSubmit} className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Search user, details, or IP address..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-xs text-text focus:outline-none focus:border-primary transition-all placeholder-muted/50 font-semibold"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <select 
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-xs font-semibold text-text focus:outline-none focus:border-primary cursor-pointer appearance-none"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="REGISTER_USER">REGISTER_USER</option>
              <option value="CREATE_DEVICE">CREATE_DEVICE</option>
              <option value="UPDATE_DEVICE">UPDATE_DEVICE</option>
              <option value="DELETE_DEVICE">DELETE_DEVICE</option>
              <option value="SETTINGS_CHANGE">SETTINGS_CHANGE</option>
              <option value="ALERT_ACKNOWLEDGE">ALERT_ACKNOWLEDGE</option>
              <option value="ALERT_RESOLUTION">ALERT_RESOLUTION</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 text-xs font-semibold">
          <span className="text-muted">
            Showing <strong className="text-text">{logs.length}</strong> entries of <strong className="text-text">{total}</strong> total logs.
          </span>
          <button type="submit" className="btn-primary py-1.5 px-4 text-xs font-bold rounded">
            Search
          </button>
        </div>
      </form>

      {/* Main Table view */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-6 rounded-xl text-center font-medium shadow-soft">
          <p className="mb-4 text-sm">{error}</p>
          <button onClick={fetchLogs} className="btn-secondary inline-flex items-center space-x-2 select-none cursor-pointer">
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {!error && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-[#0B1220] text-muted text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Action</th>
                  <th className="py-4 px-6">Details</th>
                  <th className="py-4 px-6">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {loading ? (
                  Array.from({ length: limit }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 px-6"><div className="h-4 bg-secondary rounded w-28"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-secondary rounded w-20"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-secondary rounded w-24"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-secondary rounded w-48"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-secondary rounded w-20"></div></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 px-6 text-center text-muted font-medium">
                      No audit log actions recorded.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/15 transition-all">
                      <td className="py-4 px-6 text-muted font-medium whitespace-nowrap">
                        <span className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-primary/70" />
                          <span>{formatTimestamp(log.created_at)}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-text">
                        <span className="flex items-center space-x-2">
                          <User className="w-3.5 h-3.5 text-muted" />
                          <span>{log.username || 'System / Public'}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action.includes('DELETE') || log.action.includes('WARN')
                            ? 'bg-danger/10 text-danger border border-danger/25'
                            : log.action.includes('CREATE') || log.action === 'REGISTER_USER'
                            ? 'bg-success/10 text-success border border-success/25'
                            : log.action === 'LOGIN' || log.action === 'LOGOUT'
                            ? 'bg-primary/10 text-primary border border-primary/25'
                            : 'bg-warning/10 text-warning border border-warning/25'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-text max-w-xs sm:max-w-md truncate" title={log.details}>
                        <span className="flex items-center space-x-2">
                          <Info className="w-3.5 h-3.5 text-muted/80 flex-shrink-0" />
                          <span className="truncate">{log.details || 'N/A'}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-muted font-mono">
                        <span className="flex items-center space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-muted/65" />
                          <span>{log.ip_address || 'N/A'}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && !loading && (
            <div className="py-4 px-6 bg-[#0B1220]/30 border-t border-border flex justify-between items-center text-xs font-semibold">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1 px-3 disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer"
              >
                Previous
              </button>
              <span className="text-muted">
                Page <strong className="text-text">{page}</strong> of <strong className="text-text">{totalPages}</strong>
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-1 px-3 disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
