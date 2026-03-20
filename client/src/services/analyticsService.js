import api from './api.js';

export const analyticsService = {
    getCashFlow: (months = 6) => api.get('/analytics/cash-flow', { params: { months } }),
    getVendorAnalytics: () => api.get('/analytics/vendors'),
    getCustomerAnalytics: () => api.get('/analytics/customers'),
    getKPITrends: () => api.get('/analytics/kpi-trends'),
    getAISummary: () => api.post('/analytics/ai-summary'),
    exportExcel: (reportType) => api.get(`/analytics/export/${reportType}`, { responseType: 'blob' }),
};