import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Cpu, 
  List, 
  Activity, 
  Bell, 
  Settings,
  LogOut,
  PlusCircle,
  X
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Device List', path: '/devices', icon: List },
  { name: 'Register Device', path: '/devices/new', icon: PlusCircle },
  { name: 'Sensor Monitoring', path: '/sensors', icon: Activity },
  { name: 'Alerts', path: '/alerts', icon: Bell },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('isAuthenticated');
    navigate('/login', { replace: true });
  };

  return (
    <div className={clsx(
      "w-64 h-screen bg-[#0B1220] border-r border-border flex flex-col fixed left-0 top-0 z-40 transition-transform duration-300 ease-in-out lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Brand Header */}
      <div className="h-20 px-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
            <Cpu className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-base font-bold text-text tracking-wide uppercase leading-tight">IoT Portal</span>
            <span className="text-[9px] text-muted font-medium tracking-widest uppercase">Console</span>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-muted hover:text-text hover:bg-secondary/50 border border-transparent hover:border-border cursor-pointer transition-colors"
          title="Close Navigation Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Nav links */}
      <div className="flex-1 overflow-y-auto py-8">
        <nav className="space-y-2 px-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={clsx(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 group relative",
                  isActive 
                    ? "bg-primary text-white shadow-soft shadow-primary/15" 
                    : "text-muted hover:bg-card hover:text-text"
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-md"></span>
                )}
                
                <Icon className={clsx(
                  "w-5 h-5 mr-3 transition-colors duration-200", 
                  isActive ? "text-white" : "text-muted group-hover:text-text"
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout Section */}
      <div className="p-4 border-t border-border bg-[#0B1220]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-semibold text-danger hover:bg-danger/10 border border-transparent hover:border-danger/25 transition-all duration-200 cursor-pointer select-none"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
}
