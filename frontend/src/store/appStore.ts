import { create } from 'zustand';

export interface AlertMessage {
  id: number;
  message: string;
  severity: "critical" | "high" | "medium" | "low";
  timestamp: string;
  is_read: boolean;
}

export interface StreamingDataPoint {
  time: string;
  values: Record<string, number>;
  isAnomaly: boolean;
  score: number;
}

interface AppState {
  // Realtime alerts stream overlay bounds
  activeAlerts: AlertMessage[];
  addAlert: (alert: AlertMessage) => void;
  markAlertRead: (id: number) => void;
  setAlerts: (alerts: AlertMessage[]) => void;
  
  // Streaming Chart bounds
  liveData: StreamingDataPoint[];
  addLivePoint: (point: StreamingDataPoint) => void;
  
  // App UI State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Dataset bounds
  activeDatasetId: number | null;
  setActiveDatasetId: (id: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeAlerts: [],
  addAlert: (alert) => set((state) => ({ 
    activeAlerts: [alert, ...state.activeAlerts].slice(0, 50) 
  })),
  markAlertRead: (id) => set((state) => ({
    activeAlerts: state.activeAlerts.map(a => a.id === id ? { ...a, is_read: true } : a)
  })),
  setAlerts: (alerts) => set({ activeAlerts: alerts }),
  
  liveData: [],
  addLivePoint: (point) => set((state) => {
    // Keep sliding window of 60 points max
    const next = [...state.liveData, point];
    if (next.length > 60) next.shift();
    return { liveData: next };
  }),
  
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  activeDatasetId: null,
  setActiveDatasetId: (id) => set({ activeDatasetId: id })
}));
