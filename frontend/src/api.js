import axios from 'axios';

const api = axios.create({
    baseURL: '/api' // Proxy handles this in dev
});

// Interceptor to add Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
