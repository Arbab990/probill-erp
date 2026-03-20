import express from 'express';
import {
    getNotifications, getUnreadCount, markAsRead,
    markAllAsRead, deleteNotification, clearAll, triggerOverdueCheck,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/', getNotifications);
router.get('/count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.delete('/clear-all', clearAll);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.post('/trigger-overdue-check', triggerOverdueCheck);

export default router;