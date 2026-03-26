import express from 'express';
import { getDashboardStats, getAPAgingReport } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/dashboard', getDashboardStats);
router.get('/ap-aging', getAPAgingReport);

export default router;