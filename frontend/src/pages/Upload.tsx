import React, { useState } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';

const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [results, setResults] = useState<{ processed: number, anomalies: number } | null>(null);
  const { addAlert } = useAppStore();
  const navigate = useNavigate();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.csv')) {
      setFile(droppedFile);
    } else {
      setErrorMsg('Please upload a valid CSV file.');
      setStatus('error');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setStatus('uploading');
      setErrorMsg('');
      
      const res = await api.datasets.upload(file);
      const datasetId = res.data.id;
      
      setStatus('processing');
      // Fire statistical pipelines in backend generating RCA events
      const proc = await api.datasets.process(datasetId);
      
      setResults({
        processed: proc.data.total_rows,
        anomalies: proc.data.anomalies_detected
      });
      
      setStatus('success');
      
      addAlert({
        id: Math.random(),
        message: `Dataset processed successfully: ${proc.data.anomalies_detected} anomalies detected globally.`,
        severity: 'medium',
        timestamp: new Date().toISOString(),
        is_read: false
      });
      
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.response?.data?.detail || 'Failed to process dataset network configuration.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Ingest Telemetry Array</h1>
        <p className="text-gray-400">Upload multidimensional CSV clusters to calculate isolated feature impacts globally.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden p-8">
        
        {/* Upload Zone */}
        {status !== 'success' && (
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${status === 'error' ? 'border-red-500/50 bg-red-500/5' : 'border-gray-700 hover:border-blue-500 hover:bg-blue-500/5'}`}
          >
            {status === 'idle' || status === 'error' ? (
              <>
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                  <UploadCloud size={32} className="text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Drag and drop CSV here</h3>
                <p className="text-gray-400 mb-6">Support for numeric variance files evaluating automated drift detection.</p>
                
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label 
                  htmlFor="file-upload" 
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer transition-colors"
                >
                  Browse Files
                </label>
                
                {file && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 py-2 px-4 rounded-full w-max mx-auto border border-emerald-500/20">
                    <FileType size={16} /> <span>{file.name}</span>
                  </div>
                )}
                {status === 'error' && (
                  <p className="text-red-400 text-sm mt-4 flex items-center justify-center gap-2">
                    <AlertTriangle size={16} /> {errorMsg}
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                 <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
                 <h3 className="text-xl font-semibold text-white mb-2">
                   {status === 'uploading' ? 'Ingesting vectors...' : 'Isolating Anomalous Signatures...'}
                 </h3>
                 <p className="text-gray-400">Executing Isolation Forest and extracting SHAP determinants globally.</p>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {file && (status === 'idle' || status === 'error') && (
          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleUpload}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Initialize Analytics Engine
            </button>
          </div>
        )}

        {/* Success View */}
        {status === 'success' && (
          <div className="text-center py-10 animate-in fade-in zoom-in-95 duration-500">
             <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <CheckCircle size={40} className="text-emerald-400" />
             </div>
             <h2 className="text-2xl font-bold text-white mb-2">Processing Complete</h2>
             <p className="text-gray-400 mb-8 max-w-md mx-auto">
               The algorithmic pipeline successfully evaluated the dataset extracting comprehensive explainability metrics.
             </p>
             
             <div className="flex justify-center gap-6 mb-10">
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 w-40 text-center">
                   <p className="text-3xl font-bold text-blue-400">{results?.processed}</p>
                   <p className="text-xs text-gray-500 uppercase font-semibold mt-1">Vectors Evaluated</p>
                </div>
                <div className="bg-gray-950 border border-red-900/40 rounded-xl p-4 w-40 text-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-red-500/5"></div>
                   <p className="text-3xl font-bold text-red-500 relative z-10">{results?.anomalies}</p>
                   <p className="text-xs text-red-400 uppercase font-semibold mt-1 relative z-10">Critical Spikes</p>
                </div>
             </div>

             <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={() => navigate('/anomalies')}
                  className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  View Extracted Anomalies
                </button>
                <button 
                  onClick={() => navigate('/')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-colors"
                >
                  Return to Dashboard
                </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Upload;
