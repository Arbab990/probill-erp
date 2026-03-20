import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import Customer from '../models/Customer.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import PaymentRun from '../models/PaymentRun.js';
import JournalEntry from '../models/JournalEntry.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';
import { getFinancialSummary } from '../services/geminiService.js';
import ExcelJS from 'exceljs';

// ── Helper: get date N months ago ──────────────────────────────────────
const monthsAgo = (n) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

const formatMonth = (date) =>
    new Date(date).toLocaleString('en-IN', { month: 'short', year: '2-digit' });

// ════════════════════════════════════════════════
// CASH FLOW STATEMENT
// GET /api/analytics/cash-flow
// ════════════════════════════════════════════════
export const getCashFlow = async (req, res, next) => {
    try {
        const { months = 6 } = req.query;
        const company = req.user.company;
        const from = monthsAgo(parseInt(months));

        // Operating: payments received (sales invoices paid)
        const salesPaid = await Invoice.aggregate([
            { $match: { company, type: 'sales', status: 'paid', updatedAt: { $gte: from } } },
            { $unwind: '$paymentHistory' },
            {
                $group: {
                    _id: {
                        year: { $year: '$paymentHistory.date' },
                        month: { $month: '$paymentHistory.date' },
                    },
                    inflow: { $sum: '$paymentHistory.amount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // Operating: payments made (purchase invoices paid via payment runs)
        const purchasePaid = await PaymentRun.aggregate([
            { $match: { company, status: 'completed', executedAt: { $gte: from } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$executedAt' },
                        month: { $month: '$executedAt' },
                    },
                    outflow: { $sum: '$netAmount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // Build month-by-month series
        const monthMap = {};
        for (let i = parseInt(months) - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            monthMap[key] = { month: formatMonth(d), inflow: 0, outflow: 0, net: 0 };
        }

        salesPaid.forEach(r => {
            const key = `${r._id.year}-${r._id.month}`;
            if (monthMap[key]) monthMap[key].inflow = r.inflow;
        });

        purchasePaid.forEach(r => {
            const key = `${r._id.year}-${r._id.month}`;
            if (monthMap[key]) monthMap[key].outflow = r.outflow;
        });

        const series = Object.values(monthMap).map(m => ({
            ...m,
            net: m.inflow - m.outflow,
        }));

        const totalInflow = series.reduce((s, m) => s + m.inflow, 0);
        const totalOutflow = series.reduce((s, m) => s + m.outflow, 0);
        const netCashFlow = totalInflow - totalOutflow;

        res.json({ success: true, data: { series, totalInflow, totalOutflow, netCashFlow } });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// VENDOR ANALYTICS
// GET /api/analytics/vendors
// ════════════════════════════════════════════════
export const getVendorAnalytics = async (req, res, next) => {
    try {
        const company = req.user.company;

        // Top vendors by spend
        const topVendors = await Invoice.aggregate([
            { $match: { company, type: 'purchase' } },
            { $group: { _id: '$vendor', totalSpend: { $sum: '$total' }, invoiceCount: { $sum: 1 } } },
            { $sort: { totalSpend: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
            { $unwind: '$vendor' },
            { $project: { name: '$vendor.name', vendorCode: '$vendor.vendorCode', category: '$vendor.category', totalSpend: 1, invoiceCount: 1 } },
        ]);

        // Spend by category
        const spendByCategory = await Invoice.aggregate([
            { $match: { company, type: 'purchase' } },
            { $lookup: { from: 'vendors', localField: 'vendor', foreignField: '_id', as: 'vendor' } },
            { $unwind: '$vendor' },
            { $group: { _id: '$vendor.category', total: { $sum: '$total' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]);

        // Vendor status breakdown
        const statusBreakdown = await Vendor.aggregate([
            { $match: { company } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        // Payment performance (avg days to pay)
        const paymentPerf = await Invoice.aggregate([
            { $match: { company, type: 'purchase', status: 'paid' } },
            { $unwind: '$paymentHistory' },
            {
                $project: {
                    daysToPayment: {
                        $divide: [
                            { $subtract: ['$paymentHistory.date', '$issueDate'] },
                            1000 * 60 * 60 * 24,
                        ],
                    },
                },
            },
            { $group: { _id: null, avgDays: { $avg: '$daysToPayment' }, minDays: { $min: '$daysToPayment' }, maxDays: { $max: '$daysToPayment' } } },
        ]);

        res.json({
            success: true,
            data: {
                topVendors,
                spendByCategory,
                statusBreakdown,
                paymentPerformance: paymentPerf[0] || { avgDays: 0, minDays: 0, maxDays: 0 },
            },
        });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// CUSTOMER ANALYTICS
// GET /api/analytics/customers
// ════════════════════════════════════════════════
export const getCustomerAnalytics = async (req, res, next) => {
    try {
        const company = req.user.company;

        // Top customers by revenue
        const topCustomers = await Invoice.aggregate([
            { $match: { company, type: 'sales' } },
            { $group: { _id: '$customer', totalRevenue: { $sum: '$total' }, invoiceCount: { $sum: 1 } } },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
            { $unwind: '$customer' },
            { $project: { name: '$customer.name', customerCode: '$customer.customerCode', totalRevenue: 1, invoiceCount: 1, outstanding: '$customer.outstandingBalance' } },
        ]);

        // Revenue by month (last 6)
        const revenueByMonth = await Invoice.aggregate([
            { $match: { company, type: 'sales', createdAt: { $gte: monthsAgo(6) } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    revenue: { $sum: '$total' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // Outstanding vs paid
        const arSummary = await Invoice.aggregate([
            { $match: { company, type: 'sales' } },
            {
                $group: {
                    _id: '$status',
                    total: { $sum: '$total' },
                    count: { $sum: 1 },
                },
            },
        ]);

        // Customer status breakdown
        const customerStatus = await Customer.aggregate([
            { $match: { company } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        res.json({
            success: true,
            data: { topCustomers, revenueByMonth, arSummary, customerStatus },
        });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// KPI TRENDS
// GET /api/analytics/kpi-trends
// ════════════════════════════════════════════════
export const getKPITrends = async (req, res, next) => {
    try {
        const company = req.user.company;
        const months = 6;

        const monthLabels = [];
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            monthLabels.push({ label: formatMonth(d), year: d.getFullYear(), month: d.getMonth() + 1 });
        }

        // Revenue per month
        const revenue = await Invoice.aggregate([
            { $match: { company, type: 'sales', createdAt: { $gte: monthsAgo(months) } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, value: { $sum: '$total' } } },
        ]);

        // Spend per month
        const spend = await Invoice.aggregate([
            { $match: { company, type: 'purchase', createdAt: { $gte: monthsAgo(months) } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, value: { $sum: '$total' } } },
        ]);

        // New vendors per month
        const newVendors = await Vendor.aggregate([
            { $match: { company, createdAt: { $gte: monthsAgo(months) } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, value: { $sum: 1 } } },
        ]);

        // POs per month
        const newPOs = await PurchaseOrder.aggregate([
            { $match: { company, createdAt: { $gte: monthsAgo(months) } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, value: { $sum: 1 } } },
        ]);

        const buildSeries = (agg) => monthLabels.map(m => {
            const found = agg.find(r => r._id.year === m.year && r._id.month === m.month);
            return { month: m.label, value: found?.value || 0 };
        });

        res.json({
            success: true,
            data: {
                revenue: buildSeries(revenue),
                spend: buildSeries(spend),
                newVendors: buildSeries(newVendors),
                newPOs: buildSeries(newPOs),
            },
        });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// AI ANALYTICS SUMMARY
// POST /api/analytics/ai-summary
// ════════════════════════════════════════════════
export const getAISummary = async (req, res, next) => {
    try {
        const company = req.user.company;

        // Gather snapshot data for Gemini
        const [totalRevenue, totalSpend, overdueCount, vendorCount, customerCount] = await Promise.all([
            Invoice.aggregate([{ $match: { company, type: 'sales' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
            Invoice.aggregate([{ $match: { company, type: 'purchase' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
            Invoice.countDocuments({ company, status: 'overdue' }),
            Vendor.countDocuments({ company, status: 'verified' }),
            Customer.countDocuments({ company }),
        ]);

        const snapshot = {
            totalRevenue: totalRevenue[0]?.total || 0,
            totalSpend: totalSpend[0]?.total || 0,
            overdueInvoices: overdueCount,
            activeVendors: vendorCount,
            totalCustomers: customerCount,
            grossMargin: totalRevenue[0]?.total
                ? (((totalRevenue[0].total - (totalSpend[0]?.total || 0)) / totalRevenue[0].total) * 100).toFixed(1)
                : 0,
        };

        const summary = await getFinancialSummary(snapshot);

        res.json({ success: true, data: { summary, snapshot } });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// EXCEL EXPORT ENGINE
// GET /api/analytics/export/:reportType
// ════════════════════════════════════════════════
export const exportToExcel = async (req, res, next) => {
    try {
        const { reportType } = req.params;
        const company = req.user.company;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ProBill ERP';
        workbook.created = new Date();

        // ── Shared styling helpers ──────────────────
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: { bottom: { style: 'medium', color: { argb: 'FF3B82F6' } } },
        };
        const subHeaderStyle = {
            font: { bold: true, size: 10, color: { argb: 'FF1E40AF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } },
        };
        const currencyFmt = '₹#,##0.00';
        const addRow = (ws, values, style = {}) => {
            const row = ws.addRow(values);
            if (style.font) row.font = style.font;
            if (style.fill) row.fill = style.fill;
            if (style.alignment) row.alignment = style.alignment;
            return row;
        };

        // ══════════════════════════════════════════════
        if (reportType === 'invoices') {
            const ws = workbook.addWorksheet('Invoices');
            ws.columns = [
                { header: 'Invoice #', key: 'invoiceNo', width: 18 },
                { header: 'Type', key: 'type', width: 12 },
                { header: 'Party', key: 'party', width: 25 },
                { header: 'Issue Date', key: 'issueDate', width: 14 },
                { header: 'Due Date', key: 'dueDate', width: 14 },
                { header: 'Subtotal', key: 'subtotal', width: 15 },
                { header: 'Tax', key: 'tax', width: 12 },
                { header: 'Total', key: 'total', width: 15 },
                { header: 'Status', key: 'status', width: 14 },
            ];
            ws.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
            ws.getRow(1).height = 28;

            const invoices = await Invoice.find({ company })
                .populate('vendor', 'name').populate('customer', 'name')
                .sort({ createdAt: -1 });

            invoices.forEach((inv, i) => {
                const row = ws.addRow({
                    invoiceNo: inv.invoiceNo,
                    type: inv.type,
                    party: inv.vendor?.name || inv.customer?.name || '—',
                    issueDate: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-IN') : '',
                    dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '',
                    subtotal: inv.subtotal || 0,
                    tax: inv.taxAmount || 0,
                    total: inv.total || 0,
                    status: inv.status,
                });
                if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                ['subtotal', 'tax', 'total'].forEach(key => {
                    row.getCell(key).numFmt = currencyFmt;
                });
                // Color status cell
                const statusColors = { paid: 'FF16A34A', overdue: 'FFDC2626', sent: 'FF2563EB', draft: 'FF6B7280' };
                const statusCell = row.getCell('status');
                statusCell.font = { bold: true, color: { argb: statusColors[inv.status] || 'FF6B7280' } };
            });

            // Totals row
            ws.addRow([]);
            const totalsRow = ws.addRow(['', '', '', '', 'TOTAL', '', '', { formula: `SUM(H2:H${invoices.length + 1})` }, '']);
            totalsRow.font = { bold: true };
            totalsRow.getCell(8).numFmt = currencyFmt;

            // ══════════════════════════════════════════════
        } else if (reportType === 'vendors') {
            const ws = workbook.addWorksheet('Vendors');
            ws.columns = [
                { header: 'Vendor Code', key: 'vendorCode', width: 14 },
                { header: 'Name', key: 'name', width: 28 },
                { header: 'Email', key: 'email', width: 26 },
                { header: 'Category', key: 'category', width: 16 },
                { header: 'GSTIN', key: 'gstin', width: 18 },
                { header: 'Status', key: 'status', width: 14 },
                { header: 'Payment Terms (Days)', key: 'paymentTerms', width: 22 },
                { header: 'Risk Score', key: 'riskScore', width: 14 },
            ];
            ws.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
            ws.getRow(1).height = 28;

            const vendors = await Vendor.find({ company }).sort({ vendorCode: 1 });
            vendors.forEach((v, i) => {
                const row = ws.addRow({
                    vendorCode: v.vendorCode,
                    name: v.name,
                    email: v.email,
                    category: v.category,
                    gstin: v.gstin || '—',
                    status: v.status,
                    paymentTerms: v.paymentTerms,
                    riskScore: v.riskScore || 'N/A',
                });
                if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            });

            // ══════════════════════════════════════════════
        } else if (reportType === 'trial-balance') {
            const ws = workbook.addWorksheet('Trial Balance');
            ws.mergeCells('A1:E1');
            const titleCell = ws.getCell('A1');
            titleCell.value = 'TRIAL BALANCE';
            titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
            titleCell.alignment = { horizontal: 'center' };
            ws.getRow(1).height = 30;

            ws.addRow([]);
            ws.columns = [
                { key: 'code', width: 12 },
                { key: 'name', width: 30 },
                { key: 'type', width: 14 },
                { key: 'debit', width: 18 },
                { key: 'credit', width: 18 },
            ];
            const headerRow = ws.addRow(['Code', 'Account Name', 'Type', 'Debit (Dr)', 'Credit (Cr)']);
            headerRow.eachCell(cell => Object.assign(cell, headerStyle));
            headerRow.height = 24;

            const accounts = await ChartOfAccounts.find({ company, isActive: true, currentBalance: { $ne: 0 } }).sort({ accountCode: 1 });
            let totalDr = 0, totalCr = 0;

            accounts.forEach((acc, i) => {
                const debit = acc.normalBalance === 'debit' && acc.currentBalance > 0 ? acc.currentBalance : 0;
                const credit = acc.normalBalance === 'credit' && acc.currentBalance > 0 ? acc.currentBalance : 0;
                totalDr += debit;
                totalCr += credit;

                const row = ws.addRow([acc.accountCode, acc.accountName, acc.accountType, debit || null, credit || null]);
                if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                row.getCell(4).numFmt = currencyFmt;
                row.getCell(5).numFmt = currencyFmt;
            });

            ws.addRow([]);
            const totRow = ws.addRow(['', 'TOTAL', '', totalDr, totalCr]);
            totRow.font = { bold: true };
            totRow.getCell(4).numFmt = currencyFmt;
            totRow.getCell(5).numFmt = currencyFmt;
            totRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };

            // ══════════════════════════════════════════════
        } else if (reportType === 'payment-runs') {
            const ws = workbook.addWorksheet('Payment Runs');
            ws.columns = [
                { header: 'Run #', key: 'runNumber', width: 16 },
                { header: 'Name', key: 'name', width: 28 },
                { header: 'Method', key: 'paymentMethod', width: 12 },
                { header: 'Entries', key: 'entryCount', width: 10 },
                { header: 'Total Amount', key: 'totalAmount', width: 16 },
                { header: 'Discount', key: 'totalDiscount', width: 14 },
                { header: 'Net Amount', key: 'netAmount', width: 16 },
                { header: 'Status', key: 'status', width: 14 },
                { header: 'Executed At', key: 'executedAt', width: 18 },
            ];
            ws.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
            ws.getRow(1).height = 28;

            const runs = await PaymentRun.find({ company }).sort({ createdAt: -1 });
            runs.forEach((r, i) => {
                const row = ws.addRow({
                    runNumber: r.runNumber,
                    name: r.name,
                    paymentMethod: r.paymentMethod?.toUpperCase(),
                    entryCount: r.entryCount,
                    totalAmount: r.totalAmount,
                    totalDiscount: r.totalDiscount || 0,
                    netAmount: r.netAmount || r.totalAmount,
                    status: r.status,
                    executedAt: r.executedAt ? new Date(r.executedAt).toLocaleDateString('en-IN') : '—',
                });
                if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                ['totalAmount', 'totalDiscount', 'netAmount'].forEach(k => row.getCell(k).numFmt = currencyFmt);
            });

            // ══════════════════════════════════════════════
        } else if (reportType === 'ar-aging') {
            const ws = workbook.addWorksheet('AR Aging');
            ws.mergeCells('A1:G1');
            ws.getCell('A1').value = `AR AGING REPORT — Generated ${new Date().toLocaleDateString('en-IN')}`;
            ws.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF1E40AF' } };
            ws.getCell('A1').alignment = { horizontal: 'center' };
            ws.getRow(1).height = 28;
            ws.addRow([]);

            ws.columns = [
                { key: 'invoiceNo', width: 18 },
                { key: 'customer', width: 26 },
                { key: 'issueDate', width: 14 },
                { key: 'dueDate', width: 14 },
                { key: 'total', width: 16 },
                { key: 'balance', width: 16 },
                { key: 'bucket', width: 16 },
            ];
            const hRow = ws.addRow(['Invoice #', 'Customer', 'Issue Date', 'Due Date', 'Total', 'Balance', 'Aging Bucket']);
            hRow.eachCell(cell => Object.assign(cell, headerStyle));
            hRow.height = 24;

            const salesInvoices = await Invoice.find({
                company, type: 'sales', status: { $in: ['sent', 'overdue', 'partially_paid'] },
            }).populate('customer', 'name').sort({ dueDate: 1 });

            const getBucket = (dueDate) => {
                if (!dueDate) return 'Unknown';
                const days = Math.floor((Date.now() - new Date(dueDate)) / 86400000);
                if (days <= 0) return 'Current';
                if (days <= 30) return '1-30 Days';
                if (days <= 60) return '31-60 Days';
                if (days <= 90) return '61-90 Days';
                return 'Over 90 Days';
            };

            const bucketColors = {
                'Current': 'FF16A34A', '1-30 Days': 'FFCA8A04',
                '31-60 Days': 'FFEA580C', '61-90 Days': 'FFDC2626', 'Over 90 Days': 'FF7F1D1D',
            };

            salesInvoices.forEach((inv, i) => {
                const totalPaid = inv.paymentHistory?.reduce((s, p) => s + p.amount, 0) || 0;
                const balance = inv.total - totalPaid;
                const bucket = getBucket(inv.dueDate);
                const row = ws.addRow({
                    invoiceNo: inv.invoiceNo,
                    customer: inv.customer?.name || '—',
                    issueDate: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-IN') : '',
                    dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '',
                    total: inv.total,
                    balance,
                    bucket,
                });
                if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                row.getCell('total').numFmt = currencyFmt;
                row.getCell('balance').numFmt = currencyFmt;
                row.getCell('bucket').font = { bold: true, color: { argb: bucketColors[bucket] || 'FF6B7280' } };
            });
        }

        // ── Send file ──────────────────────────────────
        const filename = `ProBill-${reportType}-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) { next(err); }
};