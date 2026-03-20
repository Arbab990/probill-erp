import api from './api.js';

export const searchService = {
    search: (q) => api.get('/search', { params: { q } }),
};