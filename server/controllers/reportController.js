import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';

// GET /api/reports/dashboard
export const getDashboardStats = async (req, res, next) => {
    try {
        const companyId = req.user.company;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // ── Revenue this month (paid sales invoices) ──
        const revenueThisMonth = await Invoice.aggregate([
            { $match: { company: companyId, type: 'sales', status: 'paid', updatedAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$total' } } },
        ]);

        // ── Total outstanding (sent + overdue sales) ──
        const outstanding = await Invoice.aggregate([
            { $match: { company: companyId, type: 'sales', status: { $in: ['sent', 'overdue', 'partially_paid'] } } },
            { $group: { _id: null, total: { $sum: '$total' } } },
        ]);

        // ── Overdue invoices count ──
        const overdueCount = await Invoice.countDocuments({ company: companyId, status: 'overdue' });

        // ── Total invoices this month ──
        const invoicesThisMonth = await Invoice.countDocuments({ company: companyId, createdAt: { $gte: startOfMonth } });

        // ── Vendor counts by status ──
        const vendorStats = await Vendor.aggregate([
            { $match: { company: companyId } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const totalVendors = vendorStats.reduce((s, v) => s + v.count, 0);
        const verifiedVendors = vendorStats.find(v => v._id === 'verified')?.count || 0;

        // ── Invoice status breakdown (for pie chart) ──
        const invoiceStatusBreakdown = await Invoice.aggregate([
            { $match: { company: companyId } },
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
        ]);

        // ── Revenue trend — last 6 months ──
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const revenueTrend = await Invoice.aggregate([
            { $match: { company: companyId, type: 'sales', status: 'paid', issueDate: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$issueDate' }, month: { $month: '$issueDate' } }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // ── Purchase trend — last 6 months ──
        const purchaseTrend = await Invoice.aggregate([
            { $match: { company: companyId, type: 'purchase', issueDate: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$issueDate' }, month: { $month: '$issueDate' } }, spend: { $sum: '$total' } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // Merge trends into 6-month labels
        const months = [];
        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const yr = d.getFullYear(); const mo = d.getMonth() + 1;
            const rev = revenueTrend.find(r => r._id.year === yr && r._id.month === mo);
            const pur = purchaseTrend.find(r => r._id.year === yr && r._id.month === mo);
            months.push({ month: MONTH_NAMES[d.getMonth()], revenue: rev?.revenue || 0, spend: pur?.spend || 0 });
        }

        // ── Recent invoices ──
        const recentInvoices = await Invoice.find({ company: companyId })
            .populate('vendor', 'name')
            .populate('customer', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            data: {
                kpis: {
                    revenueThisMonth: revenueThisMonth[0]?.total || 0,
                    outstanding: outstanding[0]?.total || 0,
                    overdueCount,
                    invoicesThisMonth,
                    totalVendors,
                    verifiedVendors,
                },
                invoiceStatusBreakdown,
                revenueTrend: months,
                recentInvoices,
            },
        });
    } catch (err) { next(err); }
};