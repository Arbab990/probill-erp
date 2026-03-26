import crypto from 'crypto';
import User from '../models/User.js';
import Company from '../models/Company.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { logAudit } from '../services/auditService.js';
import { sendForgotPasswordEmail } from '../services/emailService.js';

// Default chart of accounts seeded for every new company
const DEFAULT_ACCOUNTS = [
    { accountCode: '1000', accountName: 'Cash and Cash Equivalents', accountType: 'asset', accountSubType: 'cash', normalBalance: 'debit', isSystemAccount: true },
    { accountCode: '1010', accountName: 'Bank Account', accountType: 'asset', accountSubType: 'bank', normalBalance: 'debit', isSystemAccount: true },
    { accountCode: '1100', accountName: 'Accounts Receivable', accountType: 'asset', accountSubType: 'accounts_receivable', normalBalance: 'debit', isSystemAccount: true },
    { accountCode: '1200', accountName: 'Inventory', accountType: 'asset', accountSubType: 'current_asset', normalBalance: 'debit', isSystemAccount: false },
    { accountCode: '1500', accountName: 'Fixed Assets', accountType: 'asset', accountSubType: 'fixed_asset', normalBalance: 'debit', isSystemAccount: false },
    { accountCode: '2000', accountName: 'Accounts Payable', accountType: 'liability', accountSubType: 'accounts_payable', normalBalance: 'credit', isSystemAccount: true },
    { accountCode: '2100', accountName: 'GST Payable', accountType: 'liability', accountSubType: 'current_liability', normalBalance: 'credit', isSystemAccount: true },
    { accountCode: '2200', accountName: 'TDS Payable', accountType: 'liability', accountSubType: 'current_liability', normalBalance: 'credit', isSystemAccount: false },
    { accountCode: '2500', accountName: 'Long Term Loans', accountType: 'liability', accountSubType: 'long_term_liability', normalBalance: 'credit', isSystemAccount: false },
    { accountCode: '3000', accountName: 'Owner Equity', accountType: 'equity', accountSubType: 'equity', normalBalance: 'credit', isSystemAccount: true },
    { accountCode: '3100', accountName: 'Retained Earnings', accountType: 'equity', accountSubType: 'retained_earnings', normalBalance: 'credit', isSystemAccount: true },
    { accountCode: '4000', accountName: 'Sales Revenue', accountType: 'revenue', accountSubType: 'operating_revenue', normalBalance: 'credit', isSystemAccount: true },
    { accountCode: '4100', accountName: 'Service Revenue', accountType: 'revenue', accountSubType: 'operating_revenue', normalBalance: 'credit', isSystemAccount: false },
    { accountCode: '4900', accountName: 'Other Income', accountType: 'revenue', accountSubType: 'other_revenue', normalBalance: 'credit', isSystemAccount: false },
    { accountCode: '5000', accountName: 'Cost of Goods Sold', accountType: 'expense', accountSubType: 'cost_of_goods', normalBalance: 'debit', isSystemAccount: true },
    { accountCode: '5100', accountName: 'Operating Expenses', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystemAccount: false },
    { accountCode: '5200', accountName: 'Salaries & Wages', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystemAccount: false },
    { accountCode: '5300', accountName: 'Rent Expense', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystemAccount: false },
    { accountCode: '5400', accountName: 'GST Input Credit', accountType: 'expense', accountSubType: 'tax_expense', normalBalance: 'debit', isSystemAccount: true },
    { accountCode: '5900', accountName: 'Depreciation', accountType: 'expense', accountSubType: 'depreciation', normalBalance: 'debit', isSystemAccount: false },
];

export const register = async (req, res, next) => {
    try {
        const { name, email, password, companyName } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide name, email, and password' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, error: 'Email already registered' });

        let company = null;
        let role = 'viewer';

        if (companyName) {
            company = await Company.create({
                name: companyName,
                taxSlabs: [
                    { name: 'GST 5%', rate: 5 },
                    { name: 'GST 12%', rate: 12 },
                    { name: 'GST 18%', rate: 18 },
                    { name: 'GST 28%', rate: 28 },
                ],
            });
            role = 'super_admin';
        }

        const user = await User.create({ name, email, password, role, company: company?._id });
        if (company) {
            company.createdBy = user._id;
            await company.save();

            // Auto-seed Chart of Accounts for the new company
            try {
                const accounts = DEFAULT_ACCOUNTS.map(a => ({ ...a, company: company._id }));
                await ChartOfAccounts.insertMany(accounts, { ordered: false });
            } catch (seedErr) {
                // Non-critical — GL can be seeded manually if this fails
                console.error('Auto COA seed failed (non-critical):', seedErr.message);
            }
        }
        await logAudit({ action: 'USER_REGISTERED', module: 'auth', description: `New user "${user.name}" (${user.email}) registered${company ? ` with company "${company.name}"` : ''}`, performedBy: user._id, performedByName: user.name, targetId: user._id, targetRef: 'User', severity: 'info', company: company?._id, req });
        const token = generateToken(user._id);
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                token,
                user: {
                    _id: user._id, name: user.name, email: user.email, role: user.role,
                    company: company ? { _id: company._id, name: company.name } : null
                },
            },
        });
    } catch (error) { next(error); }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, error: 'Please provide email and password' });

        const user = await User.findOne({ email }).select('+password').populate('company', 'name logo');
        if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password' });
        if (!user.isActive) return res.status(401).json({ success: false, error: 'Account deactivated' });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid email or password' });

        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        await logAudit({ action: 'USER_LOGIN', module: 'auth', description: `User "${user.name}" (${user.email}) logged in`, performedBy: user._id, performedByName: user.name, targetId: user._id, targetRef: 'User', severity: 'info', company: user.company?._id || user.company, req });
        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: { _id: user._id, name: user.name, email: user.email, role: user.role, company: user.company, lastLogin: user.lastLogin },
            },
        });
    } catch (error) { next(error); }
};

export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).populate('company', 'name logo address gstin currency');
        res.status(200).json({
            success: true,
            data: { _id: user._id, name: user.name, email: user.email, role: user.role, company: user.company, isActive: user.isActive, lastLogin: user.lastLogin },
        });
    } catch (error) { next(error); }
};

export const logout = async (req, res) => {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'Provide current and new password' });
        if (newPassword.length < 8) return res.status(400).json({ success: false, error: 'Password must be 8+ characters' });

        const user = await User.findById(req.user._id).select('+password');
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) return res.status(400).json({ success: false, error: 'Current password is incorrect' });

        user.password = newPassword;
        await user.save();
        await logAudit({ action: 'PASSWORD_CHANGED', module: 'auth', description: `User "${user.name}" changed their password`, performedBy: user._id, performedByName: user.name, targetId: user._id, targetRef: 'User', severity: 'warning', company: req.user.company, req });
        const token = generateToken(user._id);
        res.status(200).json({ success: true, message: 'Password updated', data: { token } });
    } catch (error) { next(error); }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

        const user = await User.findOne({ email: email.toLowerCase() });

        // Always return success — never reveal whether email exists
        if (!user) {
            return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
        }

        // Generate a secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save({ validateBeforeSave: false });

        // Send email with plain token (not hashed)
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
        try {
            await sendForgotPasswordEmail({ to: user.email, name: user.name, resetUrl });
        } catch (emailErr) {
            // Roll back token if email fails
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ success: false, error: 'Email could not be sent. Please try again.' });
        }

        await logAudit({ action: 'PASSWORD_RESET_REQUESTED', module: 'auth', description: `Password reset requested for ${user.email}`, performedBy: user._id, performedByName: user.name, targetId: user._id, targetRef: 'User', severity: 'warning', company: user.company, req });
        res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    } catch (error) { next(error); }
};

// PUT /api/auth/reset-password/:token
export const resetPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        }

        // Hash the incoming token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: new Date() }, // not expired
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Reset link is invalid or has expired. Please request a new one.' });
        }

        // Set new password and clear reset fields
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        await logAudit({ action: 'PASSWORD_RESET_COMPLETED', module: 'auth', description: `Password reset completed for ${user.email}`, performedBy: user._id, performedByName: user.name, targetId: user._id, targetRef: 'User', severity: 'warning', company: user.company, req });
        const token = generateToken(user._id);
        res.json({ success: true, message: 'Password reset successfully. You can now log in.', data: { token } });
    } catch (error) { next(error); }
};