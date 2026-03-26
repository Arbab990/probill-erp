import api from './api.js';

export const aiService = {
    // Always available
    financialSummary: (kpis) => api.post('/ai/financial-summary', { kpis }),
    vendorRisk: (vendorId) => api.post('/ai/vendor-risk', { vendorId }),
    invoiceDescription: (prompt) => api.post('/ai/invoice-description', { prompt }),

    // Finance-only features (now wired)
    paymentTiming: (cashBalance) => api.post('/ai/payment-timing', { cashBalance }),
    journalAnomaly: () => api.post('/ai/journal-anomaly'),
    predictLatePayers: () => api.post('/ai/predict-late-payers'),
    nlQuery: (query, module) => api.post('/ai/nl-query', { query, module }),
};