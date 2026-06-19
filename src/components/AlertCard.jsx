import { AlertTriangle, Clock, Server } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function AlertCard({ alert }) {
  const isCritical = alert.severity === 'Critical';
  const isHigh = alert.severity === 'High';
  const isMedium = alert.severity === 'Medium';

  return (
    <div className="bg-card p-4 rounded-lg border border-border flex items-start space-x-4 hover:border-primary/50 transition-colors">
      <div className={`p-2 rounded-full ${isCritical ? 'bg-danger/10 text-danger' : isHigh ? 'bg-warning/10 text-warning' : isMedium ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-semibold text-text">{alert.message}</h4>
          <StatusBadge status={alert.status} />
        </div>
        <div className="flex items-center text-xs text-muted space-x-4">
          <span className="flex items-center">
            <Server className="w-3 h-3 mr-1" />
            {alert.deviceName}
          </span>
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {new Date(alert.date).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
