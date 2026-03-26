import express from 'express';
import { getFiscalPeriods, lockPeriod, unlockPeriod } from '../controllers/fiscalPeriodController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/', getFiscalPeriods);
router.put('/:id/lock', authorize('super_admin', 'finance_manager'), lockPeriod);
router.put('/:id/unlock', authorize('super_admin', 'finance_manager'), unlockPeriod);

export default router;