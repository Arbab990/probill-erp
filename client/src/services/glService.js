import api from './api.js';

export const glService = {
    // Chart of Accounts
    seedAccounts: () => api.post('/gl/accounts/seed'),
    getAccounts: (type) => api.get('/gl/accounts', { params: { type } }),
    createAccount: (data) => api.post('/gl/accounts', data),
    updateAccount: (id, data) => api.put(`/gl/accounts/${id}`, data),

    // Journal Entries
    getJournalEntries: (params) => api.get('/gl/journal', { params }),
    getJournalEntry: (id) => api.get(`/gl/journal/${id}`),
    createJournalEntry: (data) => api.post('/gl/journal', data),
    postEntry: (id) => api.put(`/gl/journal/${id}/post`),
    reverseEntry: (id) => api.put(`/gl/journal/${id}/reverse`),

    // Reports
    getTrialBalance: () => api.get('/gl/reports/trial-balance'),
    getBalanceSheet: () => api.get('/gl/reports/balance-sheet'),
    getProfitLoss: (fromDate, toDate) => api.get('/gl/reports/profit-loss', { params: { fromDate, toDate } }),
};