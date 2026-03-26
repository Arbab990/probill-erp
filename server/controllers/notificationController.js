import Notification from '../models/Notification.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Company from '../models/Company.js';
import { notifyCompany } from '../services/notificationService.js';
import { sendDunningEmail } from '../services/emailService.js';

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

        // Find invoices that are past due but not yet marked overdue
        const nowOverdue = await Invoice.find({
            company,
            status: { $in: ['sent', 'partially_paid'] },
            dueDate: { $lt: new Date() },
        }).populate('customer', 'name email latePaymentCount paymentTerms')
          .populate('vendor', 'name email');

        if (!nowOverdue.length) {
            return res.json({ success: true, message: 'No invoices to mark overdue', count: 0 });
        }

        // Mark all as overdue
        await Invoice.updateMany(
            { company, status: { $in: ['sent', 'partially_paid'] }, dueDate: { $lt: new Date() } },
            { $set: { status: 'overdue' } }
        );

        // Fetch company details for email branding
        const companyDoc = await Company.findById(company);

        // FIX #24: Send dunning email to each customer + increment latePaymentCount
        let emailsSent = 0;
        const customerLatePaymentUpdates = new Map(); // customerId → count to increment

        for (const invoice of nowOverdue) {
            if (invoice.type !== 'sales' || !invoice.customer) continue;

            const daysOverdue = invoice.dueDate
                ? Math.floor((Date.now() - new Date(invoice.dueDate)) / 86400000)
                : 0;
            const totalPaid = invoice.paymentHistory?.reduce((s, p) => s + p.amount, 0) || 0;
            const balanceDue = invoice.total - totalPaid;

            // Send dunning email to customer
            if (invoice.customer?.email) {
                try {
                    await sendDunningEmail({
                        to: invoice.customer.email,
                        customerName: invoice.customer.name,
                        invoiceNo: invoice.invoiceNo,
                        balanceDue,
                        daysOverdue,
                        dueDate: invoice.dueDate,
                        companyName: companyDoc?.name || 'Your Supplier',
                    });
                    emailsSent++;
                } catch (emailErr) {
                    console.error(`Dunning email failed for invoice ${invoice.invoiceNo}:`, emailErr.message);
                }
            }

            // Track which customers need latePaymentCount incremented (once per customer)
            const custId = invoice.customer._id?.toString();
            if (custId && !customerLatePaymentUpdates.has(custId)) {
                customerLatePaymentUpdates.set(custId, true);
            }
        }

        // Increment latePaymentCount once per unique overdue customer
        for (const customerId of customerLatePaymentUpdates.keys()) {
            await Customer.findByIdAndUpdate(customerId, {
                $inc: { latePaymentCount: 1 },
            });
        }

        // Internal finance team notification
        await notifyCompany({
            company,
            roles: ['super_admin', 'finance_manager'],
            title: `${nowOverdue.length} Overdue Invoice${nowOverdue.length > 1 ? 's' : ''}`,
            message: `${nowOverdue.length} invoice${nowOverdue.length > 1 ? 's have' : ' has'} passed their due date. ${emailsSent} dunning email${emailsSent !== 1 ? 's' : ''} sent to customers.`,
            type: 'danger',
            module: 'invoices',
            link: '/billing?status=overdue',
        });

        res.json({
            success: true,
            message: `${nowOverdue.length} invoices marked overdue · ${emailsSent} dunning emails sent`,
            count: nowOverdue.length,
            emailsSent,
        });
    } catch (err) { next(err); }
};