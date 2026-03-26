import { getFinancialSummary, getVendorRiskScore, getPaymentTimingAdvice, draftInvoiceDescription, detectJournalAnomalies, predictLatePayers, naturalLanguageQuery } from '../services/geminiService.js';
import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import JournalEntry from '../models/JournalEntry.js';
import Customer from '../models/Customer.js';

// POST /api/ai/financial-summary
export const financialSummary = async (req, res, next) => {
    try {
        const { kpis } = req.body;
        if (!kpis) return res.status(400).json({ success: false, error: 'KPIs are required' });
        const summary = await getFinancialSummary(kpis);
        res.json({ success: true, data: { summary } });
    } catch (err) {
        // Graceful fallback if Gemini not configured
        if (err.message?.includes('not configured') || err.message?.includes('API key')) {
            return res.json({ success: true, data: { summary: 'AI insights unavailable — add your Gemini API key to .env to enable this feature.', fallback: true } });
        }
        next(err);
    }
};

// POST /api/ai/vendor-risk
export const vendorRisk = async (req, res, next) => {
    try {
        const { vendorId } = req.body;
        const vendor = await Vendor.findOne({ _id: vendorId, company: req.user.company });
        if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

        // Enrich with real transaction history from Invoice collection
        const invoices = await Invoice.find({
            vendor: vendor._id,
            company: req.user.company,
            type: 'purchase',
        }).select('total status dueDate paymentHistory invoiceNo').lean();

        const totalInvoices = invoices.length;
        const totalSpend = invoices.reduce((s, inv) => s + (inv.total || 0), 0);
        const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
        const disputedInvoices = invoices.filter(inv => inv.status === 'cancelled').length;

        // Calculate average days late across paid invoices
        const paidLate = invoices.filter(inv => {
            if (inv.status !== 'paid' || !inv.dueDate || !inv.paymentHistory?.length) return false;
            const lastPayment = inv.paymentHistory[inv.paymentHistory.length - 1];
            return lastPayment?.date && new Date(lastPayment.date) > new Date(inv.dueDate);
        });
        const avgDaysLate = paidLate.length > 0
            ? Math.round(paidLate.reduce((s, inv) => {
                const lastPayment = inv.paymentHistory[inv.paymentHistory.length - 1];
                return s + Math.floor((new Date(lastPayment.date) - new Date(inv.dueDate)) / 86400000);
            }, 0) / paidLate.length)
            : 0;

        const vendorData = {
            name: vendor.name,
            status: vendor.status,
            paymentTerms: vendor.paymentTerms,
            category: vendor.category,
            hasBankDetails: !!vendor.bankDetails?.bankName,
            hasGstin: !!vendor.gstin,
            daysSinceAdded: Math.floor((Date.now() - vendor.createdAt) / 86400000),
            // Real transaction history
            totalInvoices,
            totalSpend: Math.round(totalSpend),
            overdueInvoices,
            disputedInvoices,
            latePaymentCount: paidLate.length,
            avgDaysLate,
            disputeRate: totalInvoices > 0 ? Math.round((disputedInvoices / totalInvoices) * 100) : 0,
            overdueRate: totalInvoices > 0 ? Math.round((overdueInvoices / totalInvoices) * 100) : 0,
        };

        const result = await getVendorRiskScore(vendorData);
        await Vendor.findByIdAndUpdate(vendorId, { riskScore: result.score, riskReason: result.reason });
        // Include transaction meta so the client can show what data drove the score
        res.json({
            success: true,
            data: {
                ...result,
                meta: {
                    totalInvoices,
                    totalSpend: Math.round(totalSpend),
                    overdueRate: totalInvoices > 0 ? Math.round((overdueInvoices / totalInvoices) * 100) : 0,
                    latePaymentCount: paidLate.length,
                    disputeRate: totalInvoices > 0 ? Math.round((disputedInvoices / totalInvoices) * 100) : 0,
                },
            },
        });
    } catch (err) {
        if (err.message?.includes('not configured') || err.message?.includes('API key')) {
            return res.json({ success: true, data: { score: null, reason: 'AI not configured', recommendation: 'Add Gemini API key to enable risk scoring', fallback: true } });
        }
        next(err);
    }
};

// POST /api/ai/invoice-description
export const invoiceDescription = async (req, res, next) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });
        const description = await draftInvoiceDescription(prompt);
        res.json({ success: true, data: { description } });
    } catch (err) {
        if (err.message?.includes('not configured') || err.message?.includes('API key')) {
            return res.json({ success: true, data: { description: prompt, fallback: true } });
        }
        next(err);
    }
};

// POST /api/ai/payment-timing
export const paymentTiming = async (req, res, next) => {
    try {
        const { cashBalance = 0 } = req.body;
        const invoices = await Invoice.find({
            company: req.user.company,
            type: 'purchase',
            status: { $in: ['sent', 'overdue', 'partially_paid'] },
        }).populate('vendor', 'name').sort({ dueDate: 1 }).limit(20);

        if (!invoices.length) {
            return res.json({ success: true, data: { recommendation: 'No pending invoices to optimize.', priorityInvoiceIds: [], estimatedSavings: '₹0', fallback: false } });
        }

        const enriched = invoices.map(inv => {
            const totalPaid = inv.paymentHistory?.reduce((s, p) => s + p.amount, 0) || 0;
            const daysOverdue = inv.dueDate ? Math.max(0, Math.floor((Date.now() - new Date(inv.dueDate)) / 86400000)) : 0;
            return { _id: inv._id, vendor: inv.vendor, total: inv.total, balance: inv.total - totalPaid, dueDate: inv.dueDate, daysOverdue };
        });

        const result = await getPaymentTimingAdvice(enriched, cashBalance);
        res.json({ success: true, data: result });
    } catch (err) {
        if (err.message?.includes('not configured') || err.message?.includes('API key')) {
            return res.json({ success: true, data: { recommendation: 'AI not configured. Add Gemini API key to enable payment timing advice.', priorityInvoiceIds: [], estimatedSavings: '₹0', fallback: true } });
        }
        next(err);
    }
};

// POST /api/ai/journal-anomaly
export const journalAnomaly = async (req, res, next) => {
    try {
        const entries = await JournalEntry.find({
            company: req.user.company,
            status: 'posted',
        }).sort({ createdAt: -1 }).limit(30);

        if (!entries.length) {
            return res.json({ success: true, data: { flaggedEntries: [], summary: 'No posted journal entries to analyze.', fallback: false } });
        }

        const result = await detectJournalAnomalies(entries);
        res.json({ success: true, data: result });
    } catch (err) {
        if (err.message?.includes('not configured') || err.message?.includes('API key')) {
            return res.json({ success: true, data: { flaggedEntries: [], summary: 'AI not configured. Add Gemini API key to enable anomaly detection.', fallback: true } });
        }
        next(err);
    }
};

// POST /api/ai/predict-late-payers
export const predictLatePayersHandler = async (req, res, next) => {
    try {
        const customers = await Customer.find({
            company: req.user.company,
            status: 'active',
        }).sort({ outstandingBalance: -1 }).limit(20);

        if (!customers.length) {
            return res.json({ success: true, data: { predictions: [], summary: 'No active customers to analyze.', fallback: false } });
        }

        const result = await predictLatePayers(customers);
        res.json({ success: true, data: result });
    } catch (err) {
        if (err.message?.includes('not configured') || err.message?.includes('API key')) {
            return res.json({ success: true, data: { predictions: [], summary: 'AI not configured. Add Gemini API key to enable late payer prediction.', fallback: true } });
        }
        next(err);
    }
};

// POST /api/ai/nl-query
export const nlQuery = async (req, res, next) => {
    try {
        const { query, module: mod = 'invoices' } = req.body;
        if (!query?.trim()) return res.status(400).json({ success: false, error: 'Query text is required' });

        const fieldMap = {
            invoices: ['invoiceNo', 'type', 'status', 'total', 'dueDate', 'issueDate', 'vendor', 'customer'],
            vendors: ['name', 'vendorCode', 'status', 'category', 'paymentTerms', 'riskScore'],
            purchase: ['poNumber', 'status', 'totalAmount', 'deliveryDate', 'threeWayMatchStatus'],
            orders: ['soNumber', 'status', 'totalAmount', 'deliveryDate'],
        };

        const fields = fieldMap[mod] || fieldMap.invoices;
        const filter = await naturalLanguageQuery(query, fields);

        // Always scope to current company
        filter.company = req.user.company;

        res.json({ success: true, data: { filter, module: mod, query } });
    } catch (err) {
        if (err.message?.includes('not configured') || err.message?.includes('API key')) {
            return res.json({ success: true, data: { filter: {}, module: mod, query, fallback: true } });
        }
        next(err);
    }
};