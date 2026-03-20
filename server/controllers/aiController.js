import { getFinancialSummary, getVendorRiskScore, getPaymentTimingAdvice, draftInvoiceDescription, detectJournalAnomalies } from '../services/geminiService.js';
import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';

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

        const vendorData = {
            name: vendor.name, status: vendor.status, paymentTerms: vendor.paymentTerms,
            category: vendor.category, hasBankDetails: !!vendor.bankDetails?.bankName,
            hasGstin: !!vendor.gstin, daysSinceAdded: Math.floor((Date.now() - vendor.createdAt) / 86400000),
        };

        const result = await getVendorRiskScore(vendorData);
        await Vendor.findByIdAndUpdate(vendorId, { riskScore: result.score, riskReason: result.reason });
        res.json({ success: true, data: result });
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