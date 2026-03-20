import User from '../models/User.js';
import Company from '../models/Company.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { logAudit } from '../services/auditService.js';

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
        if (company) { company.createdBy = user._id; await company.save(); }
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