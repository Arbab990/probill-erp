import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const authData = localStorage.getItem('probill-auth');
    if (authData) {
        const { state } = JSON.parse(authData);
        if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    }
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('probill-auth');
            if (window.location.pathname !== '/login') window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;