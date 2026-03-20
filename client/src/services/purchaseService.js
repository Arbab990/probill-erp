import api from './api.js';

export const purchaseService = {
    // PRs
    getRequisitions: (params) => api.get('/purchase/requisitions', { params }),
    getRequisition: (id) => api.get(`/purchase/requisitions/${id}`),
    createRequisition: (data) => api.post('/purchase/requisitions', data),
    submitRequisition: (id) => api.put(`/purchase/requisitions/${id}/submit`),
    approveRequisition: (id) => api.put(`/purchase/requisitions/${id}/approve`),
    rejectRequisition: (id, reason) => api.put(`/purchase/requisitions/${id}/reject`, { reason }),

    // POs
    getPurchaseOrders: (params) => api.get('/purchase/orders', { params }),
    getPurchaseOrder: (id) => api.get(`/purchase/orders/${id}`),
    createPurchaseOrder: (data) => api.post('/purchase/orders', data),
    updatePOStatus: (id, status) => api.put(`/purchase/orders/${id}/status`, { status }),

    // GRN
    getGRNs: (params) => api.get('/purchase/grn', { params }),
    createGRN: (data) => api.post('/purchase/grn', data),

    // 3-Way Match
    getThreeWayMatch: (poId) => api.get(`/purchase/three-way-match/${poId}`),
};