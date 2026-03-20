import api from './api.js';

export const aiService = {
    financialSummary: (kpis) => api.post('/ai/financial-summary', { kpis }),
    vendorRisk: (vendorId) => api.post('/ai/vendor-risk', { vendorId }),
    invoiceDescription: (prompt) => api.post('/ai/invoice-description', { prompt }),
};