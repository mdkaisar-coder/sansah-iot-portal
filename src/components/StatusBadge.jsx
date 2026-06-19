import clsx from 'clsx';

export default function StatusBadge({ status }) {
  const normStatus = (status || '').trim();
  
  const isOnline = normStatus === 'Online' || normStatus === 'Resolved' || normStatus === 'Normal' || normStatus === 'Active';
  const isWarning = normStatus === 'Warning' || normStatus === 'Medium';
  const isAlert = normStatus === 'Alert' || normStatus === 'High';
  const isCritical = normStatus === 'Critical' || normStatus === 'Offline';

  return (
    <span className={clsx(
      "px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider",
      isOnline && "bg-success/10 text-success border-success/20 shadow-[0_0_10px_-3px_rgba(16,185,129,0.15)]",
      isWarning && "bg-warning/10 text-warning border-warning/20 shadow-[0_0_10px_-3px_rgba(245,158,11,0.15)]",
      isAlert && "bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_10px_-3px_rgba(249,115,22,0.15)]",
      isCritical && "bg-danger/10 text-danger border-danger/20 shadow-[0_0_10px_-3px_rgba(239,68,68,0.15)]",
      !isOnline && !isWarning && !isAlert && !isCritical && "bg-muted/10 text-muted border-muted/20"
    )}>
      {normStatus}
    </span>
  );
}
