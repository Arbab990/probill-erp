import api from './api.js';

export const settingsService = {
    // Company
    getCompany: () => api.get('/settings/company'),
    updateCompany: (data) => api.put('/settings/company', data),

    // Users
    getUsers: () => api.get('/settings/users'),
    inviteUser: (data) => api.post('/settings/users/invite', data),
    updateRole: (id, role) => api.put(`/settings/users/${id}/role`, { role }),
    toggleActive: (id) => api.put(`/settings/users/${id}/toggle-active`),
    resetPassword: (id) => api.put(`/settings/users/${id}/reset-password`),

    // Profile
    updateProfile: (data) => api.put('/settings/profile', data),

    // Audit log
    getAuditLog: (params) => api.get('/settings/audit-log', { params }),
};