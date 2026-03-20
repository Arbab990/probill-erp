import api from './api.js';

export const reportService = {
    getDashboard: () => api.get('/reports/dashboard'),
};