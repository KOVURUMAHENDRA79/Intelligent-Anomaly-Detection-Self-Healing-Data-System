import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Loader2, ArrowLeft, AlertTriangle, Target, Workflow, Cpu } from 'lucide-react';
import Plot from 'react-plotly.js';
import { format } from 'date-fns';

const AnomalyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [feedback, setFeedback] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (id) fetchAnomalyData(parseInt(id));
  }, [id]);

  const fetchAnomalyData = async (anomalyId: number) => {
    try {
      setLoading(true);
      const [detailRes, explRes] = await Promise.all([
        api.anomalies.getDetails(anomalyId),
        api.anomalies.getExplanation(anomalyId).catch(() => ({ data: null }))
      ]);
      setData(detailRes.data);
      setExplanation(explRes.data);
    } catch (err: any) {
       setError(err.response?.data?.detail || 'Failed to fetch anomaly payload.');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (rating: number) => {
    try {
      setFeedbackStatus('sending');
      await api.feedback.submit(rating, feedback, Number(id));
      setFeedbackStatus('sent');
      setTimeout(() => setFeedbackStatus('idle'), 3000);
    } catch (e) {
      setFeedbackStatus('idle');
    }
  };

  const shapPlotData = useMemo(() => {
    if (!explanation?.ranked_contributing_factors) return null;
    const factors = [...explanation.ranked_contributing_factors].reverse();
    return [{
      type: 'bar' as const,
      x: factors.map((f: any) => f.impact_value),
      y: factors.map((f: any) => f.feature),
      orientation: 'h' as const,
      marker: {
        color: factors.map((f: any) => f.impact_value > 0 ? '#ef4444' : '#3b82f6'),
        line: { width: 0 }
      }
    }];
  }, [explanation]);

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
      <p className="text-gray-400">Loading exact vector bounds and AI trace matrices...</p>
    </div>
  );

  if (error || !data) return (
    <div className="p-8 bg-red-500/5 rounded-xl border border-red-500/20 text-center mx-auto max-w-lg mt-10">
      <AlertTriangle className="mx-auto text-red-500 mb-4" size={32} />
      <h3 className="text-lg font-bold text-white mb-2">Diagnostic Error</h3>
      <p className="text-red-400">{error}</p>
      <button onClick={() => navigate('/anomalies')} className="mt-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors">Return to Registry</button>
    </div>
  );

  const rcaNode = explanation?.root_cause_analysis || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <button onClick={() => navigate('/anomalies')} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Registry
      </button>

      {/* Header Profile */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1 font-mono">Incident #{data.id}</h1>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase border ${data.severity === 'critical' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-orange-500/20 text-orange-500 border-orange-500/30'}`}>
              {data.severity}
            </span>
          </div>
          <p className="text-gray-400 flex items-center gap-2 text-sm font-mono">
            Captured: {format(new Date(data.timestamp), 'PPpp')}
          </p>
        </div>
        
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 flex items-center gap-6 relative z-10 w-full md:w-auto">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Model Confidence</p>
            <p className="text-2xl font-mono text-white">{(data.confidence_score * 100).toFixed(2)}<span className="text-gray-500 text-lg">%</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: SHAP & Features */}
        <div className="lg:col-span-2 space-y-6">
          {/* SHAP Impact Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
             <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
                <Target size={18} className="text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-100">Local Feature Attributions (SHAP)</h2>
             </div>
             <div className="p-2 h-[350px]">
               {shapPlotData ? (
                 <Plot
                  /* @ts-ignore */
                   data={shapPlotData}
                   layout={{
                     autosize: true, margin: { t: 20, r: 20, l: 120, b: 40 },
                     paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                     font: { color: '#9ca3af', family: 'Inter' },
                     xaxis: { title: { text: 'SHAP Value (Impact on Model Output)' }, showgrid: true, gridcolor: '#1f2937', zerolinecolor: '#4b5563' },
                     yaxis: { showgrid: false }
                   }}
                   config={{ displayModeBar: false }}
                   useResizeHandler={true}
                   className="w-full h-full"
                 />
               ) : (
                 <div className="h-full flex items-center justify-center text-gray-500">No SHAP calculations generated for this vector.</div>
               )}
             </div>
          </div>

          {/* Raw Point Data Inspector */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden">
             <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
                <Cpu size={18} className="text-emerald-500" />
                <h2 className="text-lg font-semibold text-gray-100">Raw Source Telemetry Vector</h2>
             </div>
             <div className="p-4 bg-gray-950 font-mono text-xs overflow-x-auto text-gray-300">
               <pre>
                 {JSON.stringify(data.data_point, null, 2)}
               </pre>
             </div>
          </div>

        </div>

        {/* Right Column: AI Root Cause Analysis & Feedback */}
        <div className="space-y-6">
           <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden">
             <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
                <Workflow size={18} className="text-purple-500" />
                <h2 className="text-lg font-semibold text-gray-100">Statistical Root Cause</h2>
             </div>
             
             <div className="p-5">
               {rcaNode.primary_cause ? (
                 <div className="space-y-5">
                    {/* Plain English RCA */}
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 text-sm text-gray-300 leading-relaxed">
                      {rcaNode.plain_english_explanation}
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-800">
                        <span className="text-gray-500 text-sm">Primary Driver</span>
                        <span className="text-white font-mono bg-gray-800 px-2 py-0.5 rounded text-xs">{rcaNode.primary_cause}</span>
                      </div>
                      <div className="flex flex-col py-2 border-b border-gray-800 gap-2">
                        <span className="text-gray-500 text-sm">Secondary Triggers</span>
                        <div className="flex flex-wrap gap-2">
                          {rcaNode.secondary_causes && rcaNode.secondary_causes.length > 0 
                            ? rcaNode.secondary_causes.map((c: string) => <span key={c} className="text-gray-400 text-xs px-2 py-1 bg-gray-950 border border-gray-800 rounded">{c}</span>)
                            : <span className="text-gray-600 text-xs italic">Independent</span>
                          }
                        </div>
                      </div>
                      {rcaNode.evidence_used && (
                        <div className="bg-gray-950 rounded p-3 text-xs font-mono text-gray-400 grid grid-cols-2 gap-2 mt-2">
                          <div>Z-Score Dev: <span className="text-red-400">{rcaNode.evidence_used?.z_score_deviation?.toFixed(2)}</span></div>
                          <div>Trend: <span className="text-white">{rcaNode.evidence_used?.trend}</span></div>
                        </div>
                      )}
                    </div>
                 </div>
               ) : (
                 <p className="text-gray-500 text-sm italic">No data-driven RCA metrics available. Ensure baseline configurations cover this frame.</p>
               )}
             </div>
           </div>

           {/* Feedback Module */}
           <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-5">
             <h3 className="font-semibold text-gray-200 mb-3 text-sm">Submit Evaluation Feedback</h3>
             <p className="text-xs text-gray-500 mb-4">Improve future model sensitivity by rating this detection.</p>
             <textarea 
               className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 resize-none h-20 mb-3"
               placeholder="Additional context/notes on this event (optional)..."
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
             ></textarea>
             
             <div className="flex gap-2">
               <button onClick={() => submitFeedback(5)} disabled={feedbackStatus !== 'idle'} className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded font-medium text-sm transition-colors text-center disabled:opacity-50">Valid Anomaly</button>
               <button onClick={() => submitFeedback(1)} disabled={feedbackStatus !== 'idle'} className="flex-1 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded font-medium text-sm transition-colors text-center disabled:opacity-50">False Positive</button>
             </div>
             {feedbackStatus === 'sending' && <p className="text-xs text-blue-400 text-center mt-3 animate-pulse">Submitting to model registry...</p>}
             {feedbackStatus === 'sent' && <p className="text-xs text-emerald-400 text-center mt-3">Evaluation recorded.</p>}
           </div>

        </div>
      </div>
    </div>
  );
};

export default AnomalyDetail;
