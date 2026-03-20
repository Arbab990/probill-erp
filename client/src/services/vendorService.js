import api from './api.js';

export const vendorService = {
    getAll: (params) => api.get('/vendors', { params }),
    getById: (id) => api.get(`/vendors/${id}`),
    create: (data) => api.post('/vendors', data),
    update: (id, data) => api.put(`/vendors/${id}`, data),
    delete: (id) => api.delete(`/vendors/${id}`),
    updateStatus: (id, status) => api.put(`/vendors/${id}/status`, { status }),
};