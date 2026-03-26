import express from 'express';
import {
    financialSummary,
    vendorRisk,
    invoiceDescription,
    paymentTiming,
    journalAnomaly,
    predictLatePayersHandler,
    nlQuery,
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();
router.use(protect);

// Always available
router.post('/financial-summary', financialSummary);
router.post('/vendor-risk', authorize('super_admin', 'finance_manager', 'procurement_officer'), vendorRisk);
router.post('/invoice-description', invoiceDescription);

// Finance-only AI features
router.post('/payment-timing', authorize('super_admin', 'finance_manager'), paymentTiming);
router.post('/journal-anomaly', authorize('super_admin', 'finance_manager', 'auditor'), journalAnomaly);
router.post('/predict-late-payers', authorize('super_admin', 'finance_manager', 'sales_executive'), predictLatePayersHandler);
router.post('/nl-query', authorize('super_admin', 'finance_manager', 'auditor'), nlQuery);

export default router;