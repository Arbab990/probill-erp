import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import Company from '../models/Company.js';
import { generateInvoicePDF } from '../services/pdfService.js';
import { sendInvoiceEmail } from '../services/emailService.js';
import { logAudit } from '../services/auditService.js';
import { notifyCompany } from '../services/notificationService.js';

// GET /api/invoices
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

// GET /api/invoices/:id
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

// POST /api/invoices
export const createInvoice = async (req, res, next) => {
    try {
        const { lineItems = [], ...rest } = req.body;

        // Calculate totals
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

// PUT /api/invoices/:id
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

// DELETE /api/invoices/:id
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

// PUT /api/invoices/:id/status
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

// POST /api/invoices/:id/send  — generate PDF + email
export const sendInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company })
            .populate('vendor', 'name email phone gstin address')
            .populate('customer', 'name email phone gstin');
        if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

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

        await Invoice.findByIdAndUpdate(invoice._id, { status: 'sent' });
        await logAudit({ action: 'INVOICE_SENT', module: 'invoices', description: `Invoice ${invoice.invoiceNo} sent to ${party?.email || 'recipient'}`, performedBy: req.user._id, performedByName: req.user.name, targetId: invoice._id, targetRef: 'Invoice', severity: 'info', company: req.user.company, req });
        res.json({ success: true, message: `Invoice sent to ${party?.email || 'recipient'}` });
    } catch (err) { next(err); }
};

// GET /api/invoices/:id/pdf
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

// ... (keep exact same imports and initial logic)
import SalesOrder from '../models/SalesOrder.js';

// POST /api/invoices/:id/payment
export const recordPayment = async (req, res, next) => {
    try {
        const { amount, method, reference } = req.body;
        const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company });
        if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

        invoice.paymentHistory.push({ amount, method, reference });
        const totalPaid = invoice.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
        invoice.status = totalPaid >= invoice.total ? 'paid' : 'partially_paid';
        await invoice.save();

        // If this is a fully paid sales invoice, update the corresponding Sales Order status
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