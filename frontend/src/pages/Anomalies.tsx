import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { AnomalyResponse } from '../api/client';
import { ShieldAlert, ArrowRight, Loader2, AlertTriangle, Activity } from 'lucide-react';
import { format } from 'date-fns';

const Anomalies: React.FC = () => {
  const [anomalies, setAnomalies] = useState<AnomalyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const res = await api.anomalies.getHistory(0, 50);
      setAnomalies(res.data);
    } catch (err) {
      setError('Failed to load anomaly registry.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
      <p className="text-gray-400">Synchronizing registry ledger...</p>
    </div>
  );

  if (error) return (
    <div className="p-8 bg-red-500/5 rounded-xl border border-red-500/20 text-center mx-auto max-w-lg mt-10">
      <AlertTriangle className="mx-auto text-red-500 mb-4" size={32} />
      <h3 className="text-lg font-bold text-white mb-2">Sync Error</h3>
      <p className="text-red-400">{error}</p>
      <button onClick={fetchAnomalies} className="mt-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors">Retry Query</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-6 rounded-xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Anomaly Registry</h1>
          <p className="text-gray-400 text-sm">Historical record of all documented isolation deviations</p>
        </div>
        <div className="flex items-center gap-4 bg-gray-950 px-4 py-2 rounded-lg border border-gray-800">
           <Activity size={18} className="text-blue-400" />
           <span className="text-2xl font-bold text-white">{anomalies.length}</span>
           <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        {anomalies.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldAlert size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-lg font-semibold text-gray-300">Clean Ledger</h3>
            <p className="text-gray-500 mt-1">No deviations have been documented within the specified horizon.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-950/50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
                  <th className="py-4 px-6 font-semibold">Incident ID</th>
                  <th className="py-4 px-6 font-semibold">Detection Time</th>
                  <th className="py-4 px-6 font-semibold">Severity Matrix</th>
                  <th className="py-4 px-6 font-semibold">Model Confidence</th>
                  <th className="py-4 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {anomalies.map((anomaly) => (
                  <tr key={anomaly.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-mono text-gray-400 group-hover:text-blue-400 transition-colors">
                        #ANM-{anomaly.id.toString().padStart(4, '0')}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-300">
                      {format(new Date(anomaly.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider ${severityColor(anomaly.severity)}`}>
                        {anomaly.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${anomaly.confidence_score > 0.8 ? 'bg-red-500' : 'bg-blue-500'}`} 
                            style={{ width: `${anomaly.confidence_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono text-gray-400">{(anomaly.confidence_score * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => navigate(`/anomalies/${anomaly.id}`)}
                        className="p-2 bg-gray-800 hover:bg-blue-600 rounded-lg text-gray-400 hover:text-white transition-all inline-flex items-center gap-2 text-sm font-medium"
                      >
                        Deep Dive <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Anomalies;
