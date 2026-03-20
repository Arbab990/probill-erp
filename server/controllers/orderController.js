import Customer from '../models/Customer.js';
import SalesOrder from '../models/SalesOrder.js';
import Invoice from '../models/Invoice.js';
import { logAudit } from '../services/auditService.js';
import { notifyCompany } from '../services/notificationService.js';

// ════════════════════════════════════════════════
// CUSTOMERS
// ════════════════════════════════════════════════

// GET /api/orders/customers
export const getCustomers = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search = '', status = '' } = req.query;
        const query = { company: req.user.company };
        if (search) query.name = { $regex: search, $options: 'i' };
        if (status) query.status = status;

        const total = await Customer.countDocuments(query);
        const customers = await Customer.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            success: true, data: customers,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        });
    } catch (err) { next(err); }
};

// GET /api/orders/customers/:id
export const getCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.findOne({ _id: req.params.id, company: req.user.company });
        if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
        res.json({ success: true, data: customer });
    } catch (err) { next(err); }
};

// POST /api/orders/customers
export const createCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.create({ ...req.body, company: req.user.company, createdBy: req.user._id });
        await logAudit({ action: 'CUSTOMER_CREATED', module: 'orders', description: `Customer "${customer.name}" (${customer.customerCode}) created`, performedBy: req.user._id, performedByName: req.user.name, targetId: customer._id, targetRef: 'Customer', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'New Customer Added', message: `${customer.name} added by ${req.user.name}`, type: 'info', module: 'orders', link: `/orders/customers/${customer._id}`, sourceRef: customer.customerCode });
        res.status(201).json({ success: true, message: 'Customer created', data: customer });
    } catch (err) { next(err); }
};

// PUT /api/orders/customers/:id
export const updateCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.findOneAndUpdate(
            { _id: req.params.id, company: req.user.company },
            req.body,
            { new: true, runValidators: true }
        );
        if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
        await logAudit({ action: 'CUSTOMER_UPDATED', module: 'orders', description: `Customer "${customer.name}" updated`, performedBy: req.user._id, performedByName: req.user.name, targetId: customer._id, targetRef: 'Customer', severity: 'info', company: req.user.company, req });
        res.json({ success: true, message: 'Customer updated', data: customer });
    } catch (err) { next(err); }
};

// DELETE /api/orders/customers/:id
export const deleteCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.findOneAndDelete({ _id: req.params.id, company: req.user.company });
        if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
        await logAudit({ action: 'CUSTOMER_DELETED', module: 'orders', description: `Customer "${customer.name}" (${customer.customerCode}) deleted`, performedBy: req.user._id, performedByName: req.user.name, targetId: customer._id, targetRef: 'Customer', severity: 'warning', company: req.user.company, req });
        res.json({ success: true, message: 'Customer deleted' });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// SALES ORDERS
// ════════════════════════════════════════════════

// GET /api/orders/sales
export const getSalesOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status = '', customerId = '' } = req.query;
        const query = { company: req.user.company };
        if (status) query.status = status;
        if (customerId) query.customer = customerId;

        const total = await SalesOrder.countDocuments(query);
        const orders = await SalesOrder.find(query)
            .populate('customer', 'name email')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            success: true, data: orders,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        });
    } catch (err) { next(err); }
};

// GET /api/orders/sales/:id
export const getSalesOrder = async (req, res, next) => {
    try {
        const order = await SalesOrder.findOne({ _id: req.params.id, company: req.user.company })
            .populate('customer', 'name email phone gstin address creditLimit outstandingBalance')
            .populate('createdBy', 'name')
            .populate('invoiceLinked', 'invoiceNo status total');
        if (!order) return res.status(404).json({ success: false, error: 'Sales order not found' });
        res.json({ success: true, data: order });
    } catch (err) { next(err); }
};

// POST /api/orders/sales
export const createSalesOrder = async (req, res, next) => {
    try {
        const { items = [], ...rest } = req.body;

        const calculatedItems = items.map(item => {
            const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
            const taxAmount = (subtotal * (item.taxRate || 0)) / 100;
            return { ...item, taxAmount, total: subtotal + taxAmount };
        });

        const subtotal = calculatedItems.reduce((s, i) => s + ((i.quantity || 0) * (i.unitPrice || 0)), 0);
        const totalTax = calculatedItems.reduce((s, i) => s + (i.taxAmount || 0), 0);

        const order = await SalesOrder.create({
            ...rest, items: calculatedItems,
            subtotal, totalTax,
            totalAmount: subtotal + totalTax,
            company: req.user.company,
            createdBy: req.user._id,
        });

        // Update customer outstanding balance
        await Customer.findByIdAndUpdate(rest.customer, {
            $inc: { outstandingBalance: subtotal + totalTax },
        });

        await logAudit({ action: 'SO_CREATED', module: 'orders', description: `Sales Order ${order.soNumber} created — ₹${order.totalAmount}`, performedBy: req.user._id, performedByName: req.user.name, targetId: order._id, targetRef: 'SalesOrder', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'New Sales Order', message: `${order.soNumber} created by ${req.user.name}`, type: 'info', module: 'orders', link: `/orders/sales/${order._id}`, sourceRef: order.soNumber });
        res.status(201).json({ success: true, message: 'Sales order created', data: order });
    } catch (err) { next(err); }
};

// PUT /api/orders/sales/:id/status
export const updateSOStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const allowed = ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'invoiced', 'paid', 'cancelled'];
        if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });

        const order = await SalesOrder.findOneAndUpdate(
            { _id: req.params.id, company: req.user.company },
            { status },
            { new: true }
        ).populate('customer', 'name');

        if (!order) return res.status(404).json({ success: false, error: 'Sales order not found' });
        await logAudit({ action: 'SO_STATUS_CHANGED', module: 'orders', description: `Sales Order ${order.soNumber} status changed to "${status}"`, performedBy: req.user._id, performedByName: req.user.name, targetId: order._id, targetRef: 'SalesOrder', severity: status === 'cancelled' ? 'warning' : 'info', company: req.user.company, req });
        res.json({ success: true, message: `Order status updated to ${status}`, data: order });
    } catch (err) { next(err); }
};

// POST /api/orders/sales/:id/invoice
// Convert SO → Invoice
export const createInvoiceFromSO = async (req, res, next) => {
    try {
        const order = await SalesOrder.findOne({ _id: req.params.id, company: req.user.company })
            .populate('customer');
        if (!order) return res.status(404).json({ success: false, error: 'Sales order not found' });
        if (order.invoiceLinked) return res.status(400).json({ success: false, error: 'Invoice already created for this order' });

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (order.customer?.paymentTerms || 30));

        const invoice = await Invoice.create({
            type: 'sales',
            customer: order.customer._id,
            lineItems: order.items.map(i => ({
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                taxRate: i.taxRate,
                taxAmount: i.taxAmount,
                total: i.total,
            })),
            subtotal: order.subtotal,
            totalTax: order.totalTax,
            total: order.totalAmount,
            dueDate,
            notes: `Generated from Sales Order ${order.soNumber}`,
            company: req.user.company,
            createdBy: req.user._id,
        });

        // Link invoice to SO and update status
        await SalesOrder.findByIdAndUpdate(order._id, {
            invoiceLinked: invoice._id,
            status: 'invoiced',
        });

        await logAudit({ action: 'INVOICE_FROM_SO', module: 'orders', description: `Invoice ${invoice.invoiceNo} created from Sales Order ${order.soNumber}`, performedBy: req.user._id, performedByName: req.user.name, targetId: invoice._id, targetRef: 'Invoice', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Invoice Generated from SO', message: `${invoice.invoiceNo} generated from ${order.soNumber} by ${req.user.name}`, type: 'info', module: 'orders', link: `/billing/${invoice._id}`, sourceRef: invoice.invoiceNo });
        res.status(201).json({ success: true, message: 'Invoice created from sales order', data: invoice });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// AR AGING REPORT
// ════════════════════════════════════════════════

// GET /api/orders/ar-aging
export const getARAgingReport = async (req, res, next) => {
    try {
        const now = new Date();
        const invoices = await Invoice.find({
            company: req.user.company,
            type: 'sales',
            status: { $in: ['sent', 'overdue', 'partially_paid'] },
        }).populate('customer', 'name email');

        const buckets = { current: [], days30: [], days60: [], days90: [], over90: [] };
        let totals = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };

        invoices.forEach(inv => {
            const daysOverdue = inv.dueDate
                ? Math.floor((now - new Date(inv.dueDate)) / 86400000)
                : 0;
            const totalPaid = inv.paymentHistory?.reduce((s, p) => s + p.amount, 0) || 0;
            const balance = inv.total - totalPaid;

            const entry = {
                invoiceNo: inv.invoiceNo,
                customer: inv.customer?.name || 'Unknown',
                customerEmail: inv.customer?.email || '',
                total: inv.total,
                balance,
                dueDate: inv.dueDate,
                daysOverdue: Math.max(0, daysOverdue),
                status: inv.status,
            };

            if (daysOverdue <= 0) { buckets.current.push(entry); totals.current += balance; }
            else if (daysOverdue <= 30) { buckets.days30.push(entry); totals.days30 += balance; }
            else if (daysOverdue <= 60) { buckets.days60.push(entry); totals.days60 += balance; }
            else if (daysOverdue <= 90) { buckets.days90.push(entry); totals.days90 += balance; }
            else { buckets.over90.push(entry); totals.over90 += balance; }
        });

        const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

        res.json({ success: true, data: { buckets, totals, grandTotal } });
    } catch (err) { next(err); }
};