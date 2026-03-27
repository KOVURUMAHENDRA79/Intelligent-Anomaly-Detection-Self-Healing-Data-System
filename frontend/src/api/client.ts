import axios from 'axios';

export const API_BASE_URL = 'http://localhost:8001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AnomalyResponse {
  id: number;
  timestamp: string;
  severity: string;
  confidence_score: number;
  status: string;
  root_cause_analysis?: string;
}

export interface PredictionResponse {
  id: number;
  model_run_id: number;
  target_timestamp: string;
  predicted_probability: number;
  features_used: Record<string, any>;
  trend_direction: string;
  predicted_risk_score: number;
}

export interface AlertResponse {
  id: number;
  anomaly_id?: number;
  channel: string;
  message: string;
  is_read: boolean;
  sent_at: string;
}

export interface ReportResponse {
  id: number;
  title: string;
  timeframe_start: string;
  timeframe_end: string;
  content: string;
  structured_data?: any;
  html_content?: string;
  created_at: string;
}

// API methods mapping directly to backend routers

export const api = {
  datasets: {
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post('/dataset/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    process: (datasetId: number) => apiClient.post(`/dataset/process/${datasetId}`)
  },
  anomalies: {
    getHistory: (skip=0, limit=100) => apiClient.get<AnomalyResponse[]>(`/anomalies/?skip=${skip}&limit=${limit}`),
    getDetails: (id: number) => apiClient.get(`/anomalies/${id}`),
    getExplanation: (id: number) => apiClient.get(`/anomalies/${id}/explanation`),
    getRootCause: (id: number) => apiClient.get(`/anomalies/${id}/root-cause`)
  },
  chat: {
    sendMessage: (message: string, sessionId?: number) => apiClient.post('/chat/', { message, session_id: sessionId }),
    getSessions: () => apiClient.get('/chat/sessions'),
    getHistory: (sessionId: number) => apiClient.get(`/chat/sessions/${sessionId}/messages`)
  },
  reports: {
    getReports: (skip=0, limit=20) => apiClient.get<ReportResponse[]>(`/reports/?skip=${skip}&limit=${limit}`),
    generate: (hours: number) => apiClient.post(`/reports/generate?timeframe_hours=${hours}`),
    downloadJsonUrl: (id: number) => `${API_BASE_URL}/reports/${id}/download/json`,
    downloadHtmlUrl: (id: number) => `${API_BASE_URL}/reports/${id}/download/html`
  },
  alerts: {
    getAlerts: (skip=0, limit=50) => apiClient.get<AlertResponse[]>(`/alerts/?skip=${skip}&limit=${limit}`),
    markRead: (id: number) => apiClient.put(`/alerts/${id}/read`)
  },
  predictions: {
    generateForecast: (datasetId: number, periodsAhead=5) => apiClient.post(`/predictions/forecast/${datasetId}?periods_ahead=${periodsAhead}`)
  },
  feedback: {
    submit: (rating: number, comments: string, anomalyId?: number) => apiClient.post(`/feedback/?rating=${rating}&comments=${encodeURIComponent(comments)}${anomalyId ? `&anomaly_id=${anomalyId}` : ''}`)
  }
};
