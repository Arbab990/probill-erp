import express from 'express';
import { financialSummary, vendorRisk, invoiceDescription } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.post('/financial-summary', financialSummary);
router.post('/vendor-risk', vendorRisk);
router.post('/invoice-description', invoiceDescription);

export default router;