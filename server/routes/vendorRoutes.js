import express from 'express';
import { getVendors, getVendor, createVendor, updateVendor, deleteVendor, updateVendorStatus } from '../controllers/vendorController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getVendors);
router.post('/', authorize('super_admin', 'procurement_officer'), createVendor);
router.get('/:id', getVendor);
router.put('/:id', authorize('super_admin', 'procurement_officer'), updateVendor);
router.delete('/:id', authorize('super_admin'), deleteVendor);
router.put('/:id/status', authorize('super_admin', 'procurement_officer', 'finance_manager'), updateVendorStatus);

export default router;