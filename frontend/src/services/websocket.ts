import { useAppStore } from '../store/appStore';

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export const connectWebSocket = (datasetId?: number) => {
  if (ws) {
    ws.close();
  }

  // Passing token or dataset context if needed, currently unified stream
  ws = new WebSocket('ws://localhost:8001/ws/stream');

  ws.onopen = () => {
    console.log('[WebSocket] Connected');
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'alert') {
        // Global Redux/Zustand push for alerts
        useAppStore.getState().addAlert({
          id: data.alert_id,
          message: data.message,
          severity: data.severity || 'high',
          timestamp: data.timestamp || new Date().toISOString(),
          is_read: false
        });
      } else if (data.type === 'telemetry') {
        // Pushing raw sliding streams into zustand for charts to pick up globally
        useAppStore.getState().addLivePoint({
          time: new Date().toISOString(),
          values: data.features || {},
          isAnomaly: data.is_anomaly || false,
          score: data.score || 0
        });
      } else if (data.type === 'anomaly') {
        // We can hook specific anomalous peaks
        console.warn("Anomaly Detected:", data);
        useAppStore.getState().addAlert({
            id: data.anomaly_id,
            message: `Pipeline Alert: High-confidence anomaly (${Math.round(data.confidence * 100)}%) detected in streaming data.`,
            severity: data.severity || 'high',
            timestamp: new Date().toISOString(),
            is_read: false
          });
      }
    } catch (e) {
      console.error('[WebSocket] Parsing error:', e);
    }
  };

  ws.onclose = () => {
    console.log('[WebSocket] Disconnected. Reconnecting in 5s...');
    reconnectTimer = setTimeout(() => connectWebSocket(datasetId), 5000);
  };

  ws.onerror = (err) => {
    console.error('[WebSocket] Error:', err);
    ws?.close();
  };
};

export const disconnectWebSocket = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) ws.close();
  ws = null;
};
