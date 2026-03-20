import api from './api.js';

export const invoiceService = {
    getAll: (params) => api.get('/invoices', { params }),
    getById: (id) => api.get(`/invoices/${id}`),
    create: (data) => api.post('/invoices', data),
    update: (id, data) => api.put(`/invoices/${id}`, data),
    delete: (id) => api.delete(`/invoices/${id}`),
    updateStatus: (id, status) => api.put(`/invoices/${id}/status`, { status }),
    send: (id) => api.post(`/invoices/${id}/send`),
    downloadPDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
    recordPayment: (id, data) => api.post(`/invoices/${id}/payment`, data),
};