import express from 'express';
import {
    getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
    getSalesOrders, getSalesOrder, createSalesOrder, updateSOStatus, createInvoiceFromSO,
    getARAgingReport,
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();
router.use(protect);

// Customers
router.get('/customers', getCustomers);
router.post('/customers', authorize('super_admin', 'finance_manager', 'sales_executive'), createCustomer);
router.get('/customers/:id', getCustomer);
router.put('/customers/:id', authorize('super_admin', 'finance_manager', 'sales_executive'), updateCustomer);
router.delete('/customers/:id', authorize('super_admin', 'finance_manager'), deleteCustomer);

// Sales Orders
router.get('/sales', getSalesOrders);
router.post('/sales', authorize('super_admin', 'finance_manager', 'sales_executive'), createSalesOrder);
router.get('/sales/:id', getSalesOrder);
router.put('/sales/:id/status', authorize('super_admin', 'finance_manager', 'sales_executive'), updateSOStatus);
router.post('/sales/:id/invoice', authorize('super_admin', 'finance_manager', 'sales_executive'), createInvoiceFromSO);

// AR Aging
router.get('/ar-aging', getARAgingReport);

export default router;