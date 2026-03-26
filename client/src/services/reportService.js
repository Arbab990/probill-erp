import api from './api.js';
 
export const reportService = {
    getDashboard: () => api.get('/reports/dashboard'),
    getAPAging: () => api.get('/reports/ap-aging'),
};