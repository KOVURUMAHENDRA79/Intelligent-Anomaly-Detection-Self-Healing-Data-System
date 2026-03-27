import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, FileBarChart, MessageSquare, ShieldAlert, Settings, Info, UploadCloud } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import clsx from 'clsx';

export const Sidebar: React.FC = () => {
  const { isSidebarOpen, activeAlerts } = useAppStore();
  const unreadAlerts = activeAlerts.filter(a => !a.is_read).length;

  const links = [
    { to: '/', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { to: '/upload', label: 'Ingestion', icon: <UploadCloud size={20} /> },
    { to: '/anomalies', label: 'Anomalies', icon: <ShieldAlert size={20} /> },
    { to: '/chat', label: 'Data Chat', icon: <MessageSquare size={20} /> },
    { to: '/reports', label: 'Reports', icon: <FileBarChart size={20} /> },
    { to: '/alerts', label: 'Active Alerts', icon: <AlertCircle size={20} />, badge: unreadAlerts },
  ];

  if (!isSidebarOpen) return null;

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full sticky top-0">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            E
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            ERTAIS
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
              isActive 
                ? 'bg-blue-500/10 text-blue-400 font-medium' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            )}
          >
            <span className={clsx('transition-colors group-hover:text-current')}>
              {link.icon}
            </span>
            <span className="flex-1">{link.label}</span>
            {link.badge && link.badge > 0 && (
              <span className="bg-red-500/10 text-red-500 py-0.5 px-2 rounded-full text-xs font-medium border border-red-500/20 animate-pulse">
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Info size={16} />
          <span>v1.0.0 Stable</span>
        </div>
      </div>
    </div>
  );
};
