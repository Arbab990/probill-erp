import api from './api.js';

export const fiscalPeriodService = {
    getPeriods: (params) => api.get('/fiscal-periods', { params }),
    lockPeriod: (id) => api.put(`/fiscal-periods/${id}/lock`),
    unlockPeriod: (id) => api.put(`/fiscal-periods/${id}/unlock`),
};