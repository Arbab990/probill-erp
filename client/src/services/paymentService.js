import api from './api.js';

export const paymentService = {
    getPendingInvoices: (type) => api.get('/payments/invoices/pending', { params: { type } }),
    getRuns: (params) => api.get('/payments/runs', { params }),
    getRun: (id) => api.get(`/payments/runs/${id}`),
    createRun: (data) => api.post('/payments/runs', data),
    submitRun: (id) => api.put(`/payments/runs/${id}/submit`),
    approveRun: (id) => api.put(`/payments/runs/${id}/approve`),
    rejectRun: (id, reason) => api.put(`/payments/runs/${id}/reject`, { reason }),
    executeRun: (id) => api.put(`/payments/runs/${id}/execute`),
    exportCSV: (id) => api.get(`/payments/runs/${id}/export`, { responseType: 'blob' }),

    generateProposal: (data) => api.post('/payments/runs/propose', data),
    blockEntry: (id, entryIndex, blocked, blockReason) =>
        api.put(`/payments/runs/${id}/entries/${entryIndex}/block`, { blocked, blockReason }),
    confirmProposal: (id) => api.put(`/payments/runs/${id}/confirm-proposal`),
};