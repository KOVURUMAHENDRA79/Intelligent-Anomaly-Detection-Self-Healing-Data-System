import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, Menu, Search, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { connectWebSocket, disconnectWebSocket } from '../../services/websocket';

export const DashboardLayout: React.FC = () => {
  const { toggleSidebar, activeAlerts, markAlertRead } = useAppStore();
  
  useEffect(() => {
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  const unreadCount = activeAlerts.filter(a => !a.is_read).length;

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-gray-900 border-b border-gray-800 z-10">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors">
              <Menu size={20} />
            </button>
            <div className="relative hidden md:block group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search telemetry or signatures..." 
                className="pl-10 pr-4 py-2 bg-gray-950 border border-gray-800 focus:border-blue-500 rounded-lg text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900"></span>
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 border border-gray-700"></div>
          </div>
        </header>

        {/* Global Alert Toasts Overlay (Top Right) */}
        <div className="absolute top-20 right-6 z-50 flex flex-col gap-3 w-80 max-w-full pointer-events-none">
          {activeAlerts.filter(a => !a.is_read).slice(0, 3).map(alert => (
            <div key={alert.id} className="pointer-events-auto bg-gray-900 border border-red-500/30 rounded-lg p-4 shadow-xl shadow-red-900/10 transform transition-all animate-in slide-in-from-right-8 text-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  System Alert
                </div>
                <button onClick={() => markAlertRead(alert.id)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <p className="text-gray-300 leading-relaxed mb-2">{alert.message}</p>
              <div className="text-xs text-gray-500 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0a0f18] p-6 lg:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
