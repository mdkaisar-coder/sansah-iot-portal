import { MapPin, Server, Tag, Cpu, User, ArrowRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { Link } from 'react-router-dom';

export default function DeviceCard({ device }) {
  // Glow highlighting depending on status
  const getGlowStyle = (status) => {
    switch (status) {
      case 'Critical':
      case 'Offline':
        return 'hover:border-danger/40 hover:shadow-[0_0_20px_-3px_rgba(239,68,68,0.15)]';
      case 'Warning':
      case 'Medium':
        return 'hover:border-warning/40 hover:shadow-[0_0_20px_-3px_rgba(245,158,11,0.15)]';
      case 'Alert':
      case 'High':
        return 'hover:border-orange-500/40 hover:shadow-[0_0_20px_-3px_rgba(249,115,22,0.15)]';
      default:
        return 'hover:border-primary/45 hover:shadow-[0_0_20px_-3px_rgba(59,130,246,0.15)]';
    }
  };

  return (
    <div className={`bg-card rounded-xl border border-border p-6 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full group relative overflow-hidden shadow-soft ${getGlowStyle(device.status)}`}>
      {/* Top Details */}
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div>
          <h3 className="font-display font-bold text-text group-hover:text-primary transition-colors text-base sm:text-lg tracking-tight leading-snug">{device.name}</h3>
          <p className="text-[10px] text-muted font-mono mt-0.5 tracking-wider uppercase font-semibold">{device.device_code}</p>
        </div>
        <StatusBadge status={device.status} />
      </div>

      {/* Attributes Area */}
      <div className="flex-1 space-y-3.5 mb-6 relative z-10 border-t border-border/40 pt-4">
        <div className="flex items-center text-xs text-muted font-medium">
          <Tag className="w-4 h-4 mr-3 text-muted/60" />
          <span className="w-24">Asset Type</span>
          <span className="text-text font-bold">{device.type}</span>
        </div>
        <div className="flex items-center text-xs text-muted font-medium">
          <Cpu className="w-4 h-4 mr-3 text-muted/60" />
          <span className="w-24">Category</span>
          <span className="text-text font-bold truncate" title={device.sensor_type}>{device.sensor_type || 'N/A'}</span>
        </div>
        <div className="flex items-center text-xs text-muted font-medium">
          <User className="w-4 h-4 mr-3 text-muted/60" />
          <span className="w-24">Client Name</span>
          <span className="text-text font-bold truncate" title={device.client_name}>{device.client_name || 'N/A'}</span>
        </div>
        <div className="flex items-center text-xs text-muted font-medium">
          <Server className="w-4 h-4 mr-3 text-muted/60" />
          <span className="w-24">Project</span>
          <span className="text-text font-bold truncate" title={device.project}>{device.project || 'N/A'}</span>
        </div>
        <div className="flex items-center text-xs text-muted font-medium">
          <MapPin className="w-4 h-4 mr-3 text-muted/60" />
          <span className="w-24">Location</span>
          <span className="text-text font-bold truncate" title={device.site}>{device.site}</span>
        </div>
      </div>

      {/* Button link footer */}
      <div className="pt-4 border-t border-border/40 flex justify-between items-center relative z-10 text-xs font-semibold">
        <span className="text-[10px] text-muted font-mono">Registered {new Date(device.registeredDate).toLocaleDateString()}</span>
        <Link
          to={`/devices/${device.id}`}
          className="text-primary hover:underline flex items-center space-x-1 transition-all group/link cursor-pointer"
        >
          <span>Asset Details</span>
          <ArrowRight className="w-3.5 h-3.5 transform group-hover/link:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
