import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { apiStatus } from '../services/api';

export default function ConnectionStatusBanner() {
  const [isOffline, setIsOffline] = useState(apiStatus.isBackendOffline());
  const [retrying, setRetrying] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Subscribe to status updates from API layer
    const unsubscribe = apiStatus.subscribe((offline) => {
      setIsOffline(offline);
      if (offline) {
        setVisible(true); // Always show again when transitioning to offline
      }
    });

    // Initial check (ping) on mount to catch passive states
    const checkStatus = async () => {
      try {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        const url = isLocal ? 'http://localhost:5000/api/health' : '/api/health';
        
        const res = await fetch(url);
        if (res.ok) {
          apiStatus.setOffline(false);
        }
      } catch (err) {
        apiStatus.setOffline(true);
      }
    };
    checkStatus();

    return () => unsubscribe();
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      const url = isLocal ? 'http://localhost:5000/api/health' : '/api/health';
      
      const res = await fetch(url);
      if (res.ok) {
        apiStatus.setOffline(false);
        setIsOffline(false);
      }
    } catch (err) {
      console.warn('Retry connection ping failed:', err.message);
    } finally {
      setRetrying(false);
    }
  };

  if (!isOffline || !visible) return null;

  return (
    <div className="w-full bg-gradient-to-r from-danger/25 via-danger/15 to-danger/25 border-b border-danger/30 text-text px-4 py-2 flex items-center justify-between text-xs sm:text-sm animate-in slide-in-from-top duration-300 relative z-50">
      <div className="flex items-center gap-2 max-w-[85%]">
        <div className="p-1 bg-danger/20 rounded-md border border-danger/30 animate-pulse">
          <WifiOff className="w-3.5 h-3.5 text-danger" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
          <span className="font-semibold text-danger flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Offline Mode:
          </span>
          <span className="text-muted">
            Unable to establish communication with the API server. Database operations may be unavailable.
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="flex items-center gap-1 px-2.5 py-1 bg-danger/20 hover:bg-danger/35 text-text border border-danger/30 rounded-md transition-all active:scale-[0.97] disabled:opacity-50 select-none cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
          <span>{retrying ? 'Retrying...' : 'Retry'}</span>
        </button>
        <button
          onClick={() => setVisible(false)}
          className="p-1 hover:bg-white/5 rounded transition-all cursor-pointer"
          title="Dismiss alert"
        >
          <X className="w-3.5 h-3.5 text-muted hover:text-text" />
        </button>
      </div>
    </div>
  );
}
