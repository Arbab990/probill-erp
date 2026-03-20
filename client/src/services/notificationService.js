import api from './api.js';

export const notificationService = {
    getAll: (params) => api.get('/notifications', { params }),
    getCount: () => api.get('/notifications/count'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`),
    clearAll: () => api.delete('/notifications/clear-all'),
    triggerOverdueCheck: () => api.post('/notifications/trigger-overdue-check'),
};