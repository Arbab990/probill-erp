import api from './api.js';

export const orderService = {
    // Customers
    getCustomers: (params) => api.get('/orders/customers', { params }),
    getCustomer: (id) => api.get(`/orders/customers/${id}`),
    createCustomer: (data) => api.post('/orders/customers', data),
    updateCustomer: (id, data) => api.put(`/orders/customers/${id}`, data),
    deleteCustomer: (id) => api.delete(`/orders/customers/${id}`),

    // Sales Orders
    getSalesOrders: (params) => api.get('/orders/sales', { params }),
    getSalesOrder: (id) => api.get(`/orders/sales/${id}`),
    createSalesOrder: (data) => api.post('/orders/sales', data),
    updateSOStatus: (id, status) => api.put(`/orders/sales/${id}/status`, { status }),
    createInvoiceFromSO: (id) => api.post(`/orders/sales/${id}/invoice`),

    // AR Aging
    getARAgingReport: () => api.get('/orders/ar-aging'),
};