import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ConnectionStatusBanner from '../components/ConnectionStatusBanner';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthenticated = !!localStorage.getItem('token');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Sidebar with toggle control */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main viewport area */}
      <div className="flex-1 lg:ml-64 flex flex-col h-screen transition-all duration-300">
        <ConnectionStatusBanner />
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1600px] w-full mx-auto flex flex-col gap-6 sm:gap-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
