import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, RefreshCw, Cpu } from 'lucide-react';
import { api } from '../services/api';
import DeviceCard from '../components/DeviceCard';

export default function DeviceList() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sensorFilter, setSensorFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError('');
      const json = await api.fetchDevices();
      if (json.success) {
        const mapped = json.data.map(d => ({
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
          registeredDate: d.created_at || new Date().toISOString()
        }));
        setDevices(mapped);
      } else {
        setError(json.message || 'Failed to retrieve devices.');
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Connection to backend service failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const uniqueSensorTypes = useMemo(() => {
    const types = new Set();
    devices.forEach(d => {
      if (d.sensor_type && d.sensor_type !== 'N/A') {
        types.add(d.sensor_type);
      }
    });
    return Array.from(types).sort();
  }, [devices]);

  const processedDevices = useMemo(() => {
    let result = [...devices];

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(d => 
        d.name.toLowerCase().includes(term) || 
        d.device_code.toLowerCase().includes(term) ||
        d.client_name.toLowerCase().includes(term) ||
        d.project.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(d => d.status === statusFilter);
    }

    if (sensorFilter !== 'All') {
      result = result.filter(d => d.sensor_type === sensorFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'code-asc':
          return a.device_code.localeCompare(b.device_code);
        case 'date-desc':
          return b.id - a.id;
        case 'date-asc':
          return a.id - b.id;
        default:
          return 0;
      }
    });

    return result;
  }, [devices, searchTerm, statusFilter, sensorFilter, sortBy]);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse">
        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-8 bg-secondary rounded w-1/4"></div>
          <div className="h-4 bg-secondary rounded w-1/3"></div>
        </div>

        {/* Filter panel skeleton */}
        <div className="bg-card border border-border rounded-xl p-6 h-28 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-10 bg-secondary rounded md:col-span-2"></div>
            <div className="h-10 bg-secondary rounded"></div>
            <div className="h-10 bg-secondary rounded"></div>
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-6 h-48 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="space-y-2 w-2/3">
                  <div className="h-5 bg-secondary rounded"></div>
                  <div className="h-4 bg-secondary rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-secondary rounded-full w-16"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-secondary rounded w-3/4"></div>
                <div className="h-4 bg-secondary rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-6">
        <div className="bg-danger/10 border border-danger/20 text-danger p-6 rounded-xl text-center font-medium shadow-soft">
          <p className="mb-4 text-sm">{error}</p>
          <button onClick={fetchDevices} className="btn-secondary inline-flex items-center space-x-2 select-none cursor-pointer">
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text tracking-wide uppercase">Device Inventory</h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Manage, query, and monitor all registered physical assets.</p>
        </div>
        <button 
          onClick={fetchDevices} 
          className="btn-secondary flex items-center space-x-2 text-xs py-2 px-4 select-none cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>
      
      {/* Filter panel */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Search devices, code, client, project..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-xs text-text focus:outline-none focus:border-primary transition-all placeholder-muted/50 font-semibold"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-xs font-semibold text-text focus:outline-none focus:border-primary cursor-pointer appearance-none"
            >
              <option value="All">All Statuses</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          <div className="relative">
            <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <select 
              value={sensorFilter}
              onChange={(e) => setSensorFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-xs font-semibold text-text focus:outline-none focus:border-primary cursor-pointer appearance-none"
            >
              <option value="All">All Categories</option>
              {uniqueSensorTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort option row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-border/50 gap-4 text-xs font-semibold">
          <span className="text-muted">
            Found <strong className="text-text">{processedDevices.length}</strong> matching assets of <strong className="text-text">{devices.length}</strong> total devices.
          </span>
          
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted" />
            <span className="text-muted whitespace-nowrap">Sort By:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-background border border-border rounded px-2.5 py-1 text-text focus:outline-none focus:border-primary cursor-pointer font-bold"
            >
              <option value="date-desc">Newest Added</option>
              <option value="date-asc">Oldest Added</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="code-asc">Device Code</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {processedDevices.map(device => (
          <DeviceCard key={device.id} device={device} />
        ))}
        {processedDevices.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted bg-card border border-border rounded-xl shadow-soft font-semibold leading-relaxed">
            No devices found matching your search filters.
          </div>
        )}
      </div>
    </div>
  );
}
