import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Lazy loading pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Upload = React.lazy(() => import('./pages/Upload'));
const Anomalies = React.lazy(() => import('./pages/Anomalies'));
const AnomalyDetail = React.lazy(() => import('./pages/AnomalyDetail'));

const Chat = React.lazy(() => import('./pages/Chat'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Alerts = React.lazy(() => import('./pages/Alerts'));

// Basic Loading Fallback
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center p-10 min-h-[50vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-gray-400 font-medium">Loading telemetry module...</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<React.Suspense fallback={<PageLoader />}><Dashboard /></React.Suspense>} />
          <Route path="upload" element={<React.Suspense fallback={<PageLoader />}><Upload /></React.Suspense>} />
          <Route path="anomalies" element={<React.Suspense fallback={<PageLoader />}><Anomalies /></React.Suspense>} />
          <Route path="anomalies/:id" element={<React.Suspense fallback={<PageLoader />}><AnomalyDetail /></React.Suspense>} />
          
          <Route path="chat" element={<React.Suspense fallback={<PageLoader />}><Chat /></React.Suspense>} />
          <Route path="reports" element={<React.Suspense fallback={<PageLoader />}><Reports /></React.Suspense>} />
          <Route path="alerts" element={<React.Suspense fallback={<PageLoader />}><Alerts /></React.Suspense>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
