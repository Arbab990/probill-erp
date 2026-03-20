import express from 'express';
import { getDashboardStats } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/dashboard', getDashboardStats);

export default router;