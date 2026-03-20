import express from 'express';
import {
    getCashFlow, getVendorAnalytics, getCustomerAnalytics,
    getKPITrends, getAISummary, exportToExcel,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/cash-flow', getCashFlow);
router.get('/vendors', getVendorAnalytics);
router.get('/customers', getCustomerAnalytics);
router.get('/kpi-trends', getKPITrends);
router.post('/ai-summary', getAISummary);
router.get('/export/:reportType', exportToExcel);

export default router;