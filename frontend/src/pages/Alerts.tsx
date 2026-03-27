import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AlertResponse } from '../api/client';
import { AlertCircle, CheckCircle, Loader2, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { markAlertRead } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.alerts.getAlerts(0, 100);
      setAlerts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.alerts.markRead(id);
      markAlertRead(id); // Update global UI state
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 size={40} className="text-red-500 animate-spin mb-4" />
      <p className="text-gray-400">Synchronizing permanent alert bounds...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-6 rounded-xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Active Alerts</h1>
          <p className="text-gray-400 text-sm">Permanent ledger of high-priority system events and future-predictions.</p>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="p-10 text-center bg-gray-900 border border-gray-800 rounded-xl">
            <AlertCircle size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-lg font-semibold text-gray-300">Clean Subsystem</h3>
            <p className="text-gray-500 mt-1">No major pipeline issues logged recently.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className={clsx(
              "flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-5 rounded-xl border transition-all",
              alert.is_read 
                ? "bg-gray-950/50 border-gray-800/50 opacity-70" 
                : "bg-gray-900 border-red-500/20 shadow-lg"
            )}>
               <div className="flex items-start gap-4 flex-1">
                 <div className={clsx("p-2 rounded-lg shrink-0", alert.is_read ? 'bg-gray-800 text-gray-500' : 'bg-red-500/10 text-red-500')}>
                    <ShieldAlert size={24} />
                 </div>
                 <div>
                   <h3 className={clsx("font-semibold mb-1", alert.is_read ? 'text-gray-400' : 'text-gray-200')}>
                     {alert.anomaly_id ? `Event Reference #${alert.anomaly_id}` : 'Forecasting Early-Warning System'}
                   </h3>
                   <p className={clsx("text-sm leading-relaxed", alert.is_read ? 'text-gray-500' : 'text-gray-300')}>
                     {alert.message}
                   </p>
                   <p className="text-xs font-mono text-gray-500 mt-2">{format(new Date(alert.sent_at), 'PPP pp')}</p>
                 </div>
               </div>

               <div className="flex items-center gap-3 shrink-0 self-end md:self-auto mt-4 md:mt-0">
                 {alert.anomaly_id && (
                   <button 
                     onClick={() => navigate(`/anomalies/${alert.anomaly_id}`)}
                     className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                   >
                     View RCA
                   </button>
                 )}
                 {!alert.is_read ? (
                   <button 
                     onClick={() => handleMarkRead(alert.id)}
                     className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/20 rounded-lg text-sm font-medium transition-colors"
                   >
                     <CheckCircle size={16} /> Mark as Read
                   </button>
                 ) : (
                   <div className="px-4 py-2 flex items-center gap-2 text-sm text-gray-600 font-medium">
                     <CheckCircle size={16} /> Acknowledged
                   </div>
                 )}
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
