import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getAnomalies = async (skip = 0, limit = 100) => {
    const response = await api.get(`/anomalies?skip=${skip}&limit=${limit}`);
    return response.data;
};

export const getAnomalyDetails = async (id: number) => {
    const response = await api.get(`/anomalies/${id}`);
    return response.data;
};

export const chatWithData = async (message: string) => {
    const response = await api.post('/chat', { message });
    return response.data;
};

export const simulateDataPoint = async () => {
    const response = await api.post('/simulate_data');
    return response.data;
};

export default api;
