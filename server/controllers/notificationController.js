import Notification from '../models/Notification.js';
import Invoice from '../models/Invoice.js';
import { notifyCompany } from '../services/notificationService.js';

// GET /api/notifications
export const getNotifications = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const query = { recipient: req.user._id, company: req.user.company };
        if (unreadOnly === 'true') query.isRead = false;

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ ...query, isRead: false });
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        });
    } catch (err) { next(err); }
};

// GET /api/notifications/count
export const getUnreadCount = async (req, res, next) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user._id,
            company: req.user.company,
            isRead: false,
        });
        res.json({ success: true, count });
    } catch (err) { next(err); }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req, res, next) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true, readAt: new Date() }
        );
        res.json({ success: true });
    } catch (err) { next(err); }
};

// PUT /api/notifications/read-all
export const markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, company: req.user.company, isRead: false },
            { isRead: true, readAt: new Date() }
        );
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) { next(err); }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req, res, next) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
        res.json({ success: true });
    } catch (err) { next(err); }
};

// DELETE /api/notifications/clear-all
export const clearAll = async (req, res, next) => {
    try {
        await Notification.deleteMany({ recipient: req.user._id, company: req.user.company, isRead: true });
        res.json({ success: true, message: 'Read notifications cleared' });
    } catch (err) { next(err); }
};

// POST /api/notifications/trigger-overdue-check
// Scans for overdue invoices and notifies finance team
export const triggerOverdueCheck = async (req, res, next) => {
    try {
        const company = req.user.company;
        const overdue = await Invoice.find({
            company,
            status: { $in: ['sent', 'partially_paid'] },
            dueDate: { $lt: new Date() },
        }).populate('vendor', 'name').populate('customer', 'name');

        if (overdue.length > 0) {
            // Update status to overdue
            await Invoice.updateMany(
                { company, status: { $in: ['sent', 'partially_paid'] }, dueDate: { $lt: new Date() } },
                { status: 'overdue' }
            );

            await notifyCompany({
                company,
                roles: ['super_admin', 'finance_manager'],
                title: `${overdue.length} Overdue Invoice${overdue.length > 1 ? 's' : ''}`,
                message: `${overdue.length} invoice${overdue.length > 1 ? 's have' : ' has'} passed their due date and marked overdue.`,
                type: 'danger',
                module: 'invoices',
                link: '/billing?status=overdue',
            });
        }

        res.json({ success: true, message: `${overdue.length} invoices marked overdue`, count: overdue.length });
    } catch (err) { next(err); }
};