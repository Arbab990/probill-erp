import express from 'express';
import {
    getCompanySettings, updateCompanySettings,
    getUsers, inviteUser, updateUserRole, toggleUserActive,
    resetUserPassword, updateProfile, getAuditLog,
} from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();
router.use(protect);

// Company
router.get('/company', getCompanySettings);
router.put('/company', authorize('super_admin'), updateCompanySettings);

// Users
router.get('/users', authorize('super_admin'), getUsers);
router.post('/users/invite', authorize('super_admin'), inviteUser);
router.put('/users/:id/role', authorize('super_admin'), updateUserRole);
router.put('/users/:id/toggle-active', authorize('super_admin'), toggleUserActive);
router.put('/users/:id/reset-password', authorize('super_admin'), resetUserPassword);

// Own profile
router.put('/profile', updateProfile);

// Audit log
router.get('/audit-log', authorize('super_admin', 'auditor'), getAuditLog);

export default router;