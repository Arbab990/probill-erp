import User from '../models/User.js';
import Company from '../models/Company.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../services/auditService.js';
import bcrypt from 'bcryptjs';


// ════════════════════════════════════════════════
// COMPANY SETTINGS
// ════════════════════════════════════════════════

// GET /api/settings/company
export const getCompanySettings = async (req, res, next) => {
    try {
        const company = await Company.findById(req.user.company);
        if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
        res.json({ success: true, data: company });
    } catch (err) { next(err); }
};

// PUT /api/settings/company
export const updateCompanySettings = async (req, res, next) => {
    try {
        const allowed = [
            'name', 'email', 'phone', 'website', 'address',
            'gstin', 'pan', 'tan', 'cin',
            'bankDetails', 'fiscalYearStart', 'currency', 'timezone',
            'invoicePrefix', 'invoiceFooter', 'logo',
        ];

        const updates = {};
        allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

        const company = await Company.findByIdAndUpdate(
            req.user.company,
            { $set: updates },
            { new: true, runValidators: true }
        );

        await logAudit({
            action: 'COMPANY_SETTINGS_UPDATED',
            module: 'settings',
            description: 'Company settings updated',
            performedBy: req.user._id,
            performedByName: req.user.name,
            company: req.user.company,
            severity: 'info',
            req,
        });

        res.json({ success: true, message: 'Company settings updated', data: company });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════

// GET /api/settings/users
export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find({ company: req.user.company })
            .select('-password')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (err) { next(err); }
};

// POST /api/settings/users/invite
export const inviteUser = async (req, res, next) => {
    try {
        const { name, email, role } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ success: false, error: 'Name, email and role are required' });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ success: false, error: 'Email already registered' });

        const validRoles = ['finance_manager', 'procurement_officer', 'sales_executive', 'auditor', 'viewer'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        // Create user with temp password
        const tempPassword = `ProBill@${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: tempPassword,  // plain text — pre-save hook will hash it
            role,
            company: req.user.company,
            isActive: true,
        });
        await logAudit({
            action: 'USER_INVITED',
            module: 'settings',
            description: `New user invited: ${name} (${role})`,
            performedBy: req.user._id,
            performedByName: req.user.name,
            targetId: user._id,
            targetRef: email,
            severity: 'warning',
            company: req.user.company,
            req,
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { ...user.toObject(), password: undefined },
            tempPassword, // In production this would be emailed
        });
    } catch (err) { next(err); }
};

// PUT /api/settings/users/:id/role
export const updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const targetUser = await User.findOne({ _id: req.params.id, company: req.user.company });
        if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });
        if (targetUser._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, error: 'Cannot change your own role' });
        }

        const oldRole = targetUser.role;
        targetUser.role = role;
        await targetUser.save();

        await logAudit({
            action: 'USER_ROLE_CHANGED',
            module: 'settings',
            description: `${targetUser.name}'s role changed from ${oldRole} to ${role}`,
            performedBy: req.user._id,
            performedByName: req.user.name,
            targetId: targetUser._id,
            targetRef: targetUser.email,
            changes: { before: { role: oldRole }, after: { role } },
            severity: 'warning',
            company: req.user.company,
            req,
        });

        res.json({ success: true, message: 'Role updated', data: targetUser });
    } catch (err) { next(err); }
};

// PUT /api/settings/users/:id/toggle-active
export const toggleUserActive = async (req, res, next) => {
    try {
        const targetUser = await User.findOne({ _id: req.params.id, company: req.user.company });
        if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });
        if (targetUser._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, error: 'Cannot deactivate yourself' });
        }

        targetUser.isActive = !targetUser.isActive;
        await targetUser.save();

        await logAudit({
            action: targetUser.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
            module: 'settings',
            description: `${targetUser.name} was ${targetUser.isActive ? 'activated' : 'deactivated'}`,
            performedBy: req.user._id,
            performedByName: req.user.name,
            targetId: targetUser._id,
            targetRef: targetUser.email,
            severity: 'warning',
            company: req.user.company,
            req,
        });

        res.json({ success: true, message: `User ${targetUser.isActive ? 'activated' : 'deactivated'}`, data: targetUser });
    } catch (err) { next(err); }
};

// PUT /api/settings/users/:id/reset-password
export const resetUserPassword = async (req, res, next) => {
    try {
        const targetUser = await User.findOne({ _id: req.params.id, company: req.user.company });
        if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });

        const tempPassword = `ProBill@${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        targetUser.password = tempPassword;  // plain text — pre-save hook will hash it
        await targetUser.save();

        await logAudit({
            action: 'USER_PASSWORD_RESET',
            module: 'settings',
            description: `Password reset for ${targetUser.name}`,
            performedBy: req.user._id,
            performedByName: req.user.name,
            targetId: targetUser._id,
            targetRef: targetUser.email,
            severity: 'warning',
            company: req.user.company,
            req,
        });

        res.json({ success: true, message: 'Password reset', tempPassword });
    } catch (err) { next(err); }
};

// PUT /api/settings/profile  (current user updates own profile)
export const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select('+password');

        if (name) user.name = name;
        if (phone) user.phone = phone;

        if (newPassword) {
            if (!currentPassword) return res.status(400).json({ success: false, error: 'Current password required' });
            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) return res.status(400).json({ success: false, error: 'Current password is incorrect' });
            user.password = await bcrypt.hash(newPassword, 12);
        }

        await user.save();
        res.json({ success: true, message: 'Profile updated', data: { ...user.toObject(), password: undefined } });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// AUDIT LOG
// ════════════════════════════════════════════════

// GET /api/settings/audit-log
export const getAuditLog = async (req, res, next) => {
    try {
        const { page = 1, limit = 30, module = '', severity = '', search = '' } = req.query;
        const query = { company: req.user.company };
        if (module) query.module = module;
        if (severity) query.severity = severity;
        if (search) query.$or = [
            { action: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { performedByName: { $regex: search, $options: 'i' } },
            { targetRef: { $regex: search, $options: 'i' } },
        ];

        const total = await AuditLog.countDocuments(query);
        const logs = await AuditLog.find(query)
            .populate('performedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: logs,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        });
    } catch (err) { next(err); }
};