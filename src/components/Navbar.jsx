import { Bell, Search, User, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Navbar({ onMenuToggle }) {
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  useEffect(() => {
    const fetchActiveAlerts = async () => {
      try {
        const statsData = await api.fetchAlertStats();
        if (statsData.success) {
          setActiveAlertCount(statsData.data.active || 0);
        }
      } catch (err) {
        console.error('Failed to load active alert counts in navbar:', err);
      }
    };
    fetchActiveAlerts();
    const timer = setInterval(fetchActiveAlerts, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 shadow-soft">
      {/* Search Input bar */}
      <div className="flex items-center flex-1 gap-3">
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-muted hover:text-text hover:bg-secondary/50 rounded-lg border border-transparent hover:border-border cursor-pointer transition-all duration-200"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input 
            type="text" 
            placeholder="Search devices, alerts..." 
            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text placeholder-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
          />
        </div>
      </div>
      
      {/* Right Notifications & Profile controls */}
      <div className="flex items-center space-x-5">
        <button className="relative p-2 text-muted hover:text-text transition-all duration-200 rounded-lg hover:bg-secondary/50 cursor-pointer border border-transparent hover:border-border">
          <Bell className="w-5 h-5" />
          {activeAlertCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border border-card animate-pulse">
              {activeAlertCount}
            </span>
          )}
        </button>
        
        <div className="flex items-center space-x-3 pl-4 border-l border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-soft">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-text">Admin User</p>
            <p className="text-[10px] text-muted leading-tight">admin@iotportal.local</p>
          </div>
        </div>
      </div>
    </header>
  );
}
