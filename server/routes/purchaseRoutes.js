import express from 'express';
import {
    getRequisitions, getRequisition, createRequisition, submitRequisition,
    approveRequisition, rejectRequisition,
    getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePOStatus,
    getGRNs, createGRN, getThreeWayMatch,
} from '../controllers/purchaseController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();
router.use(protect);

// PRs
router.get('/requisitions', getRequisitions);
router.post('/requisitions', createRequisition);
router.get('/requisitions/:id', getRequisition);
router.put('/requisitions/:id/submit', submitRequisition);
router.put('/requisitions/:id/approve', authorize('super_admin', 'finance_manager', 'procurement_officer'), approveRequisition);
router.put('/requisitions/:id/reject', authorize('super_admin', 'finance_manager', 'procurement_officer'), rejectRequisition);

// POs
router.get('/orders', getPurchaseOrders);
router.post('/orders', authorize('super_admin', 'finance_manager', 'procurement_officer'), createPurchaseOrder);
router.get('/orders/:id', getPurchaseOrder);
router.put('/orders/:id/status', authorize('super_admin', 'finance_manager', 'procurement_officer'), updatePOStatus);

// GRN
router.get('/grn', getGRNs);
router.post('/grn', authorize('super_admin', 'finance_manager', 'procurement_officer'), createGRN);

// 3-Way Match
router.get('/three-way-match/:poId', getThreeWayMatch);

export default router;