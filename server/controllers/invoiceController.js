import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import Company from '../models/Company.js';
import Customer from '../models/Customer.js';
import SalesOrder from '../models/SalesOrder.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';
import JournalEntry from '../models/JournalEntry.js';
import { generateInvoicePDF } from '../services/pdfService.js';
import { sendInvoiceEmail } from '../services/emailService.js';
import { logAudit } from '../services/auditService.js';
import { notifyCompany } from '../services/notificationService.js';

// ── GL auto-posting helper ────────────────────────────────────────────────────
// Creates a balanced journal entry when an invoice is sent or paid.
// Non-critical — if accounts are not seeded yet, it logs and continues silently.
const autoPostInvoiceGL = async ({ invoice, company, userId, eventType }) => {
    try {
        const [arAccount, apAccount, revenueAccount, bankAccount, expenseAccount] = await Promise.all([
            ChartOfAccounts.findOne({ company, accountCode: '1100' }), // Accounts Receivable
            ChartOfAccounts.findOne({ company, accountCode: '2000' }), // Accounts Payable
            ChartOfAccounts.findOne({ company, accountCode: '4000' }), // Sales Revenue
            ChartOfAccounts.findOne({ company, accountCode: '1010' }), // Bank Account
            ChartOfAccounts.findOne({ company, accountCode: '5000' }), // Cost of Goods / Expense
        ]);

        let lines = [];
        let narration = '';

        if (eventType === 'send') {
            if (invoice.type === 'sales' && arAccount && revenueAccount) {
                // Sales invoice sent → Dr Accounts Receivable / Cr Sales Revenue
                narration = `Sales Invoice ${invoice.invoiceNo} posted`;
                lines = [
                    { account: arAccount._id, accountCode: arAccount.accountCode, accountName: arAccount.accountName, debit: invoice.total, credit: 0, description: `Invoice ${invoice.invoiceNo}` },
                    { account: revenueAccount._id, accountCode: revenueAccount.accountCode, accountName: revenueAccount.accountName, debit: 0, credit: invoice.total, description: `Revenue from ${invoice.invoiceNo}` },
                ];
            } else if (invoice.type === 'purchase' && expenseAccount && apAccount) {
                // Purchase invoice sent → Dr Expense / Cr Accounts Payable
                narration = `Purchase Invoice ${invoice.invoiceNo} recorded`;
                lines = [
                    { account: expenseAccount._id, accountCode: expenseAccount.accountCode, accountName: expenseAccount.accountName, debit: invoice.total, credit: 0, description: `Purchase ${invoice.invoiceNo}` },
                    { account: apAccount._id, accountCode: apAccount.accountCode, accountName: apAccount.accountName, debit: 0, credit: invoice.total, description: `Payable for ${invoice.invoiceNo}` },
                ];
            }
        } else if (eventType === 'paid') {
            if (invoice.type === 'sales' && bankAccount && arAccount) {
                // Sales invoice paid → Dr Bank / Cr Accounts Receivable (clearing)
                narration = `Payment received for Invoice ${invoice.invoiceNo}`;
                lines = [
                    { account: bankAccount._id, accountCode: bankAccount.accountCode, accountName: bankAccount.accountName, debit: invoice.total, credit: 0, description: `Payment for ${invoice.invoiceNo}` },
                    { account: arAccount._id, accountCode: arAccount.accountCode, accountName: arAccount.accountName, debit: 0, credit: invoice.total, description: `AR clearing ${invoice.invoiceNo}` },
                ];
            } else if (invoice.type === 'purchase' && apAccount && bankAccount) {
                // Purchase invoice paid → Dr Accounts Payable / Cr Bank (clearing)
                narration = `Payment made for Invoice ${invoice.invoiceNo}`;
                lines = [
                    { account: apAccount._id, accountCode: apAccount.accountCode, accountName: apAccount.accountName, debit: invoice.total, credit: 0, description: `AP clearing ${invoice.invoiceNo}` },
                    { account: bankAccount._id, accountCode: bankAccount.accountCode, accountName: bankAccount.accountName, debit: 0, credit: invoice.total, description: `Payment for ${invoice.invoiceNo}` },
                ];
            }
        }

        // If required accounts not seeded yet — skip silently, never block the operation
        if (!lines.length) return null;

        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

        const entry = await JournalEntry.create({
            date: new Date(),
            narration,
            lines,
            totalDebit,
            totalCredit,
            isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
            sourceType: 'invoice',
            sourceId: invoice._id,
            sourceRef: invoice.invoiceNo,
            status: 'posted',
            postedBy: userId,
            postedAt: new Date(),
            company,
        });

        // Update running balance on each affected account
        for (const line of lines) {
            const account = await ChartOfAccounts.findById(line.account);
            if (!account) continue;
            const balanceChange = account.normalBalance === 'debit'
                ? (line.debit - line.credit)
                : (line.credit - line.debit);
            await ChartOfAccounts.findByIdAndUpdate(line.account, {
                $inc: { currentBalance: balanceChange },
            });
        }

        return entry;
    } catch (err) {
        // Non-critical — log but never block the invoice operation
        console.error('Auto GL posting error (non-critical):', err.message);
        return null;
    }
};

// ════════════════════════════════════════════════
// GET /api/invoices
// ════════════════════════════════════════════════
export const getInvoices = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, type = '', status = '', search = '' } = req.query;
        const query = { company: req.user.company };
        if (type) query.type = type;
        if (status) query.status = status;
        if (search) query.invoiceNo = { $regex: search, $options: 'i' };

        const total = await Invoice.countDocuments(query);
        const invoices = await Invoice.find(query)
            .populate('vendor', 'name email')
            .populate('customer', 'name email')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: invoices,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// GET /api/invoices/:id
// ════════════════════════════════════════════════
export const getInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company })
            .populate('vendor', 'name email phone gstin address bankDetails')
            .populate('customer', 'name email phone gstin address')
            .populate('createdBy', 'name email');
        if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
        res.json({ success: true, data: invoice });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// POST /api/invoices
// ════════════════════════════════════════════════
export const createInvoice = async (req, res, next) => {
    try {
        const { lineItems = [], ...rest } = req.body;

        const calculatedItems = lineItems.map(item => {
            const subtotal = item.quantity * item.unitPrice;
            const taxAmount = (subtotal * (item.taxRate || 0)) / 100;
            return { ...item, taxAmount, total: subtotal + taxAmount };
        });

        const subtotal = calculatedItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
        const totalTax = calculatedItems.reduce((sum, i) => sum + i.taxAmount, 0);
        const total = subtotal + totalTax;

        const invoice = await Invoice.create({
            ...rest,
            lineItems: calculatedItems,
            subtotal,
            totalTax,
            total,
            company: req.user.company,
            createdBy: req.user._id,
        });

        await logAudit({ action: 'INVOICE_CREATED', module: 'invoices', description: `Invoice ${invoice.invoiceNo} (${invoice.type}) created — ₹${invoice.total}`, performedBy: req.user._id, performedByName: req.user.name, targetId: invoice._id, targetRef: 'Invoice', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'New Invoice Created', message: `${invoice.invoiceNo} (${invoice.type}) created by ${req.user.name}`, type: 'info', module: 'invoices', link: `/billing/${invoice._id}`, sourceRef: invoice.invoiceNo });
        res.status(201).json({ success: true, message: 'Invoice created', data: invoice });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// PUT /api/invoices/:id
// ════════════════════════════════════════════════
export const updateInvoice = async (req, res, next) => {
    try {
        const existing = await Invoice.findOne({ _id: req.params.id, company: req.user.company });
        if (!existing) return res.status(404).json({ success: false, error: 'Invoice not found' });
        if (existing.status !== 'draft') return res.status(400).json({ success: false, error: 'Only draft invoices can be edited' });

        const { lineItems = [], ...rest } = req.body;
        const calculatedItems = lineItems.map(item => {
            const subtotal = item.quantity * item.unitPrice;
            const taxAmount = (subtotal * (item.taxRate || 0)) / 100;
            return { ...item, taxAmount, total: subtotal + taxAmount };
        });

        const subtotal = calculatedItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
        const totalTax = calculatedItems.reduce((sum, i) => sum + i.taxAmount, 0);

        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            { ...rest, lineItems: calculatedItems, subtotal, totalTax, total: subtotal + totalTax },
            { new: true, runValidators: true }
        );
        await logAudit({ action: 'INVOICE_UPDATED', module: 'invoices', description: `Invoice ${invoice.invoiceNo} updated`, performedBy: req.user._id, performedByName: req.user.name, targetId: invoice._id, targetRef: 'Invoice', severity: 'info', company: req.user.company, req });
        res.json({ success: true, message: 'Invoice updated', data: invoice });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// DELETE /api/invoices/:id
// ════════════════════════════════════════════════
export const deleteInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company });
        if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
        if (invoice.status !== 'draft') return res.status(400).json({ success: false, error: 'Only draft invoices can be deleted' });
        await invoice.deleteOne();
        await logAudit({ action: 'INVOICE_DELETED', module: 'invoices', description: `Invoice ${invoice.invoiceNo} deleted`, performedBy: req.user._id, performedByName: req.user.name, targetId: invoice._id, targetRef: 'Invoice', severity: 'warning', company: req.user.company, req });
        res.json({ success: true, message: 'Invoice deleted' });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// PUT /api/invoices/:id/status
// ════════════════════════════════════════════════
export const updateInvoiceStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const invoice = await Invoice.findOneAndUpdate(
            { _id: req.params.id, company: req.user.company },
            { status },
            { new: true }
        );
        if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
        await logAudit({ action: 'INVOICE_STATUS_CHANGED', module: 'invoices', description: `Invoice ${invoice.invoiceNo} status changed to "${status}"`, performedBy: req.user._id, performedByName: req.user.name, targetId: invoice._id, targetRef: 'Invoice', severity: status === 'cancelled' ? 'warning' : 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Invoice Status Changed', message: `${invoice.invoiceNo} marked as ${status} by ${req.user.name}`, type: status === 'cancelled' ? 'danger' : status === 'paid' ? 'success' : 'warning', module: 'invoices', link: `/billing/${invoice._id}`, sourceRef: invoice.invoiceNo });
        res.json({ success: true, message: `Invoice marked as ${status}`, data: invoice });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// POST /api/invoices/:id/send
// FIX #2  — Guard against re-sending paid/cancelled invoices
// FIX #11 — Auto-post GL journal entry on first send (draft → sent only)
// ════════════════════════════════════════════════
export const sendInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company })
            .populate('vendor', 'name email phone gstin address')
            .populate('customer', 'name email phone gstin');
        if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

        // FIX #2: Never revert a paid or cancelled invoice back to 'sent'
        if (['paid', 'cancelled'].includes(invoice.status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot send a ${invoice.status} invoice. Only draft or sent/overdue invoices can be emailed.`,
            });
        }

        const company = await Company.findById(req.user.company);
        const pdfBuffer = await generateInvoicePDF(invoice, company);
        const party = invoice.vendor || invoice.customer;

        if (party?.email) {
            await sendInvoiceEmail({
                to: party.email,
                invoiceNo: invoice.invoiceNo,
                companyName: company.name,
                total: invoice.total,
                dueDate: invoice.dueDate,
                pdfBuffer,
            });
        }

        // Only move status to 'sent' when currently draft
        // Re-sending an overdue/partially_paid invoice preserves its status
        const wasDraft = invoice.status === 'draft';
        if (wasDraft) {
            await Invoice.findByIdAndUpdate(invoice._id, { status: 'sent' });
        }

        // FIX #11: Auto-post GL entry on first send only (draft → sent)
        // Sales:    Dr Accounts Receivable (1100) / Cr Sales Revenue (4000)
        // Purchase: Dr Expense (5000)            / Cr Accounts Payable (2000)
        if (wasDraft) {
            await autoPostInvoiceGL({
                invoice,
                company: req.user.company,
                userId: req.user._id,
                eventType: 'send',
            });
        }

        await logAudit({ action: 'INVOICE_SENT', module: 'invoices', description: `Invoice ${invoice.invoiceNo} sent to ${party?.email || 'recipient'}`, performedBy: req.user._id, performedByName: req.user.name, targetId: invoice._id, targetRef: 'Invoice', severity: 'info', company: req.user.company, req });
        res.json({ success: true, message: `Invoice sent to ${party?.email || 'recipient'}` });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// GET /api/invoices/:id/pdf
// ════════════════════════════════════════════════
export const downloadInvoicePDF = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company })
            .populate('vendor', 'name email phone gstin address')
            .populate('customer', 'name email phone gstin');
        if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

        const company = await Company.findById(req.user.company);
        const pdfBuffer = await generateInvoicePDF(invoice, company);

        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${invoice.invoiceNo}.pdf"` });
        res.send(pdfBuffer);
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// POST /api/invoices/:id/payment
// FIX #4  — Validate amount > 0, guard against double-payment
// FIX #4  — Decrement customer outstandingBalance when fully paid
// FIX #11 — Auto-post GL clearing entry when invoice becomes fully paid
// ════════════════════════════════════════════════
export const recordPayment = async (req, res, next) => {
    try {
        const { amount, method, reference } = req.body;

        // FIX #4: Reject zero or missing amount
        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, error: 'Payment amount must be greater than zero' });
        }

        const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company });
        if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
        if (invoice.status === 'paid') {
            return res.status(400).json({ success: false, error: 'Invoice is already fully paid' });
        }

        invoice.paymentHistory.push({ amount: parseFloat(amount), method, reference });
        const totalPaid = invoice.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
        const wasAlreadyPaid = invoice.status === 'paid';
        invoice.status = totalPaid >= invoice.total ? 'paid' : 'partially_paid';
        await invoice.save();

        // FIX #4: Decrement customer outstandingBalance when sales invoice is fully paid
        if (invoice.type === 'sales' && invoice.status === 'paid' && !wasAlreadyPaid && invoice.customer) {
            await Customer.findByIdAndUpdate(invoice.customer, {
                $inc: { outstandingBalance: -invoice.total },
            });
        }

        // FIX #11: Auto-post GL clearing entry when invoice becomes fully paid
        // Sales paid:    Dr Bank (1010)             / Cr Accounts Receivable (1100)
        // Purchase paid: Dr Accounts Payable (2000) / Cr Bank (1010)
        if (invoice.status === 'paid' && !wasAlreadyPaid) {
            await autoPostInvoiceGL({
                invoice,
                company: req.user.company,
                userId: req.user._id,
                eventType: 'paid',
            });
        }

        // Update linked Sales Order status when sales invoice is fully paid
        if (invoice.type === 'sales' && invoice.status === 'paid') {
            const linkedSO = await SalesOrder.findOne({ invoiceLinked: invoice._id, company: req.user.company });
            if (linkedSO && linkedSO.status !== 'paid') {
                linkedSO.status = 'paid';
                await linkedSO.save();
                await logAudit({ action: 'SO_STATUS_CHANGED', module: 'orders', description: `Sales Order ${linkedSO.soNumber} marked as paid due to full invoice payment`, performedBy: req.user._id, performedByName: req.user.name, targetId: linkedSO._id, targetRef: 'SalesOrder', severity: 'success', company: req.user.company, req });
            }
        }

        await logAudit({ action: 'PAYMENT_RECORDED', module: 'invoices', description: `Payment of ₹${amount} recorded on invoice ${invoice.invoiceNo} via ${method}`, performedBy: req.user._id, performedByName: req.user.name, targetId: invoice._id, targetRef: 'Invoice', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Payment Recorded', message: `₹${amount} payment recorded on ${invoice.invoiceNo} by ${req.user.name}`, type: 'success', module: 'invoices', link: `/billing/${invoice._id}`, sourceRef: invoice.invoiceNo });
        res.json({ success: true, message: 'Payment recorded', data: invoice });
    } catch (err) { next(err); }
};