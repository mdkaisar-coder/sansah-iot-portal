export default function StatCard({ title, value, icon: Icon, colorClass, statusColor }) {
  // Map simple color class helper to custom indicator borders
  const getIndicatorBorder = () => {
    switch (statusColor) {
      case 'primary':
        return 'border-l-4 border-l-primary';
      case 'success':
        return 'border-l-4 border-l-success';
      case 'warning':
        return 'border-l-4 border-l-warning';
      case 'danger':
        return 'border-l-4 border-l-danger';
      default:
        return 'border-l-4 border-l-muted';
    }
  };

  return (
    <div className={`bg-card p-6 sm:p-7 rounded-xl border border-border flex items-center justify-between hover:border-primary/30 hover:scale-[1.02] shadow-soft transition-all duration-300 group ${getIndicatorBorder()}`}>
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted uppercase tracking-wider">{title}</p>
        <p className="text-4xl font-extrabold font-display text-text tracking-tight">{value}</p>
      </div>
      <div className={`p-4 rounded-xl transition-all duration-300 ${colorClass}`}>
        <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
      </div>
    </div>
  );
}
