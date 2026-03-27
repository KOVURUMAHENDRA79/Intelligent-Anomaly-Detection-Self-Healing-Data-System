import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useAppStore } from '../store/appStore';
import { Activity, ShieldAlert, Cpu, Network } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { liveData, activeAlerts } = useAppStore();

  // Compute stats
  const totalAnalyzed = liveData.length;
  const recentAnomalies = liveData.filter(d => d.isAnomaly).length;
  const highestRisk = liveData.length > 0 ? Math.max(...liveData.map(d => d.score)) : 0;
  
  const anomalyRate = totalAnalyzed > 0 ? (recentAnomalies / totalAnalyzed) * 100 : 0;

  // Extract keys dynamically based on the current stream payload (e.g. feature_1, feature_2)
  const availableFeatures = liveData.length > 0 ? Object.keys(liveData[0].values) : [];
  
  // Plotly Multi-trace Line Chart Configuration
  const chartData = useMemo(() => {
    return availableFeatures.map((feature, i) => {
      // Pick vibrant colors from our palette logically
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
      return {
        x: liveData.map(d => new Date(d.time)),
        y: liveData.map(d => d.values[feature]),
        type: 'scatter' as const,
        mode: 'lines+markers' as const,
        name: feature,
        line: { color: colors[i % colors.length], width: 2, shape: 'spline' as const },
        marker: {
          size: liveData.map(d => d.isAnomaly ? 8 : 4),
          color: liveData.map(d => d.isAnomaly ? '#ef4444' : colors[i % colors.length]),
          symbol: liveData.map(d => d.isAnomaly ? 'diamond' : 'circle'),
        }
      };
    });
  }, [liveData, availableFeatures]);

  // Confidence Risk Sparkline Matrix
  const riskSparkline = useMemo(() => {
    return [{
      x: liveData.map(d => new Date(d.time)),
      y: liveData.map(d => d.score),
      type: 'scatter' as const,
      mode: 'lines' as const,
      fill: 'tozeroy' as const,
      line: { color: '#ef4444', width: 2, shape: 'spline' as const },
      fillcolor: 'rgba(239, 68, 68, 0.1)'
    }];
  }, [liveData]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Observation Array</h1>
          <p className="text-gray-400">Real-time isolation forest volumetric analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-500 font-medium text-sm">System Streaming</span>
        </div>
      </div>

      {/* Primary KPI Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-400 text-sm font-medium">Volumetric Scope</p>
              <h3 className="text-3xl font-bold text-white mt-1">{totalAnalyzed}</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Activity size={24} /></div>
          </div>
          <p className="text-xs text-blue-400 font-medium relative z-10">Rolling window matrix</p>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-400 text-sm font-medium">Recent Exceptions</p>
              <h3 className="text-3xl font-bold text-white mt-1">{recentAnomalies}</h3>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><ShieldAlert size={24} /></div>
          </div>
          <p className="text-xs text-red-400 font-medium relative z-10">{anomalyRate.toFixed(2)}% divergence rate</p>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors"></div>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-400 text-sm font-medium">Algorithmic Load</p>
              <h3 className="text-3xl font-bold text-white mt-1">IForest</h3>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Cpu size={24} /></div>
          </div>
          <p className="text-xs text-purple-400 font-medium relative z-10">Contamination bounds: 0.05</p>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-400 text-sm font-medium">Latency Ping</p>
              <h3 className="text-3xl font-bold text-white mt-1">24ms</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Network size={24} /></div>
          </div>
          <p className="text-xs text-emerald-400 font-medium relative z-10">Sustained WS stream</p>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
        </div>
      </div>

      {/* Main Streaming Telemetry Graphic */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" /> Multi-Variate Telemetry Matrix
            </h2>
            {liveData.length === 0 && <span className="text-xs font-medium px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-500">Awaiting Signal</span>}
          </div>
          <div className="p-1 h-[400px] flex-1 bg-gray-950/30">
            {liveData.length > 0 ? (
              <Plot
                data={chartData}
                layout={{
                  autosize: true,
                  margin: { t: 20, r: 20, l: 40, b: 40 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#9ca3af', family: 'Inter, sans-serif' },
                  hovermode: 'x unified',
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.15, font: { color: '#9ca3af' } },
                  xaxis: { 
                    showgrid: true, 
                    gridcolor: '#1f2937', 
                    zeroline: false,
                    type: 'date',
                    fixedrange: true 
                  },
                  yaxis: { 
                    showgrid: true, 
                    gridcolor: '#1f2937', 
                    zeroline: true, 
                    zerolinecolor: '#374151',
                    fixedrange: true 
                  }
                }}
                useResizeHandler={true}
                className="w-full h-full"
                config={{ displayModeBar: false }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                <Network className="w-12 h-12 mb-3 text-gray-700 animate-pulse" />
                <p>No streaming inputs detected on socket layer.</p>
                <p className="text-sm mt-1">Upload a dataset or trigger the simulator.</p>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Risk Assessment */}
        <div className="flex flex-col gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden flex-1">
            <div className="p-5 border-b border-gray-800 bg-gray-900/50">
              <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-500" /> Isolation Decision Array
              </h2>
            </div>
            <div className="p-4 h-[200px]">
              {liveData.length > 0 ? (
                <Plot
                  data={riskSparkline}
                  layout={{
                    autosize: true,
                    margin: { t: 10, r: 10, l: 30, b: 20 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#9ca3af' },
                    xaxis: { showgrid: false, zeroline: false, showticklabels: false },
                    yaxis: { showgrid: true, gridcolor: '#1f2937', zeroline: false }
                  }}
                  useResizeHandler={true}
                  className="w-full h-full"
                  config={{ displayModeBar: false }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">Awaiting bounds...</div>
              )}
            </div>
            <div className="px-5 pb-5 pt-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Peak Calculated Anomaly Threshold</span>
                <span className="text-white font-mono">{highestRisk.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-red-600 to-red-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((highestRisk / Math.max(0.1, highestRisk)) * 100, 100)}%` }} // Normalized display width
                ></div>
              </div>
            </div>
          </div>
          
          {/* Active Explanations Feed Component */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden flex-1">
             <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                <h3 className="font-semibold text-gray-200">Recent Priority Alerts</h3>
             </div>
             <div className="p-4 space-y-3 max-h-[180px] overflow-y-auto custom-scrollbar">
                {activeAlerts.length > 0 ? (
                  activeAlerts.slice(0, 4).map(alert => (
                    <div key={alert.id} className="text-sm bg-gray-950 border border-gray-800 p-3 rounded-lg flex items-start gap-3">
                       <ShieldAlert size={16} className={alert.severity === 'critical' || alert.severity === 'high' ? 'text-red-500 mt-0.5' : 'text-yellow-500 mt-0.5'} />
                       <div>
                         <p className="text-gray-300 leading-snug">{alert.message}</p>
                         <p className="text-xs text-gray-500 font-mono mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                       </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No recent priority alerts recorded.</p>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
