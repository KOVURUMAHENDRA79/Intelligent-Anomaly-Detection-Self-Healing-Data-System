import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ReportResponse } from '../api/client';
import { FileBarChart, Loader2, Download, FileJson, FileText } from 'lucide-react';
import { format } from 'date-fns';

const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.reports.getReports();
      setReports(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      await api.reports.generate(24); // Generating standard 24 hour snapshot
      await fetchReports();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 size={40} className="text-purple-500 animate-spin mb-4" />
      <p className="text-gray-400">Loading historical artifacts...</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-6 rounded-xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Generated Analytics</h1>
          <p className="text-gray-400 text-sm">Automated PDF-ready and JSON structurally exported executive summaries.</p>
        </div>
        <button 
          onClick={generateReport}
          disabled={generating}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-purple-900/20 font-medium transition-all"
        >
          {generating ? <Loader2 size={18} className="animate-spin" /> : <FileBarChart size={18} />}
          Generate 24h Snapshot
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.length === 0 ? (
          <div className="col-span-full p-10 text-center bg-gray-900 border border-gray-800 rounded-xl">
            <FileBarChart size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-lg font-semibold text-gray-300">No Reports Identified</h3>
            <p className="text-gray-500 mt-1">Trigger an AI generation pipeline to evaluate and construct a summary.</p>
          </div>
        ) : (
          reports.map(report => (
            <div key={report.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col group hover:border-purple-500/50 transition-colors relative overflow-hidden">
               <div className="flex items-start justify-between mb-4 relative z-10">
                 <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
                     <FileText size={24} />
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-200 line-clamp-1">{report.title}</h3>
                     <p className="text-xs text-gray-500 font-mono mt-0.5">{format(new Date(report.created_at), 'MMM dd, yyyy')}</p>
                   </div>
                 </div>
               </div>
               
               <div className="flex-1 mb-6 relative z-10">
                 <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                   {report.content.substring(0, 150)}...
                 </p>
               </div>

               <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
                 <a 
                   href={api.reports.downloadHtmlUrl(report.id)} 
                   download
                   className="flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded-lg text-sm transition-colors border border-gray-700 font-medium"
                 >
                   <Download size={14} /> PDF/HTML
                 </a>
                 <a 
                   href={api.reports.downloadJsonUrl(report.id)} 
                   download
                   className="flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-emerald-600 text-gray-300 hover:text-white rounded-lg text-sm transition-colors border border-gray-700 font-medium"
                 >
                   <FileJson size={14} /> Raw JSON
                 </a>
               </div>
               
               <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors pointer-events-none"></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reports;
