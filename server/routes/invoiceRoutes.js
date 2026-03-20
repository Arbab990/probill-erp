import express from 'express';
import { getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, updateInvoiceStatus, sendInvoice, downloadInvoicePDF, recordPayment } from '../controllers/invoiceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getInvoices);
router.post('/', authorize('super_admin', 'finance_manager', 'procurement_officer', 'sales_executive'), createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', authorize('super_admin', 'finance_manager', 'procurement_officer', 'sales_executive'), updateInvoice);
router.delete('/:id', authorize('super_admin', 'finance_manager'), deleteInvoice);
router.put('/:id/status', authorize('super_admin', 'finance_manager'), updateInvoiceStatus);
router.post('/:id/send', authorize('super_admin', 'finance_manager', 'sales_executive'), sendInvoice);
router.get('/:id/pdf', downloadInvoicePDF);
router.post('/:id/payment', authorize('super_admin', 'finance_manager'), recordPayment);

export default router;