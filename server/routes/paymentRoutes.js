import express from 'express';
import {
    getPaymentRuns, getPaymentRun, createPaymentRun,
    generateProposal, toggleEntryBlock, confirmProposal,
    submitPaymentRun, approvePaymentRun, rejectPaymentRun,
    executePaymentRun, exportPaymentRunCSV, getPendingInvoices,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();
router.use(protect);

// Proposal flow (SAP-style)
router.post('/runs/propose', authorize('super_admin', 'finance_manager'), generateProposal);
router.put('/runs/:id/entries/:entryIndex/block', authorize('super_admin', 'finance_manager'), toggleEntryBlock);
router.put('/runs/:id/confirm-proposal', authorize('super_admin', 'finance_manager'), confirmProposal);

// Standard CRUD + workflow
router.get('/invoices/pending', getPendingInvoices);
router.get('/runs', getPaymentRuns);
router.post('/runs', authorize('super_admin', 'finance_manager'), createPaymentRun);
router.get('/runs/:id', getPaymentRun);
router.put('/runs/:id/submit', authorize('super_admin', 'finance_manager'), submitPaymentRun);
router.put('/runs/:id/approve', authorize('super_admin', 'finance_manager'), approvePaymentRun);
router.put('/runs/:id/reject', authorize('super_admin', 'finance_manager'), rejectPaymentRun);
router.put('/runs/:id/execute', authorize('super_admin', 'finance_manager'), executePaymentRun);
router.get('/runs/:id/export', exportPaymentRunCSV);

export default router;