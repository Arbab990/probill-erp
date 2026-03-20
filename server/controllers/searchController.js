import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import Customer from '../models/Customer.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import PurchaseRequisition from '../models/PurchaseRequisition.js';
import SalesOrder from '../models/SalesOrder.js';
import PaymentRun from '../models/PaymentRun.js';

// GET /api/search?q=query
export const globalSearch = async (req, res, next) => {
    try {
        const { q = '' } = req.query;
        if (q.trim().length < 2) {
            return res.json({ success: true, data: [] });
        }

        const company = req.user.company;
        const regex = { $regex: q, $options: 'i' };
        const limit = 5;

        const [invoices, vendors, customers, pos, prs, sos, paymentRuns] = await Promise.all([
            Invoice.find({ company, $or: [{ invoiceNo: regex }, { notes: regex }] })
                .populate('vendor', 'name').populate('customer', 'name')
                .select('invoiceNo type status total vendor customer').limit(limit),

            Vendor.find({ company, $or: [{ name: regex }, { vendorCode: regex }, { email: regex }, { gstin: regex }] })
                .select('name vendorCode status category').limit(limit),

            Customer.find({ company, $or: [{ name: regex }, { customerCode: regex }, { email: regex }] })
                .select('name customerCode status').limit(limit),

            PurchaseOrder.find({ company, $or: [{ poNumber: regex }, { notes: regex }] })
                .populate('vendor', 'name')
                .select('poNumber status totalAmount vendor').limit(limit),

            PurchaseRequisition.find({ company, $or: [{ prNumber: regex }, { notes: regex }] })
                .select('prNumber status').limit(limit),

            SalesOrder.find({ company, $or: [{ soNumber: regex }, { notes: regex }] })
                .populate('customer', 'name')
                .select('soNumber status totalAmount customer').limit(limit),

            PaymentRun.find({ company, $or: [{ runNumber: regex }, { name: regex }] })
                .select('runNumber name status totalAmount').limit(limit),
        ]);

        const results = [
            ...invoices.map(i => ({
                type: 'Invoice', id: i._id, ref: i.invoiceNo,
                title: i.invoiceNo,
                subtitle: `${i.vendor?.name || i.customer?.name || '—'} · ₹${(i.total || 0).toLocaleString('en-IN')}`,
                status: i.status, link: `/billing/${i._id}`,
            })),
            ...vendors.map(v => ({
                type: 'Vendor', id: v._id, ref: v.vendorCode,
                title: v.name,
                subtitle: `${v.vendorCode} · ${v.category}`,
                status: v.status, link: `/vendors/${v._id}`,
            })),
            ...customers.map(c => ({
                type: 'Customer', id: c._id, ref: c.customerCode,
                title: c.name,
                subtitle: `${c.customerCode}`,
                status: c.status, link: `/orders/customers/${c._id}`,
            })),
            ...pos.map(p => ({
                type: 'Purchase Order', id: p._id, ref: p.poNumber,
                title: p.poNumber,
                subtitle: `${p.vendor?.name || '—'} · ₹${(p.totalAmount || 0).toLocaleString('en-IN')}`,
                status: p.status, link: `/purchase/orders/${p._id}`,
            })),
            ...prs.map(p => ({
                type: 'PR', id: p._id, ref: p.prNumber,
                title: p.prNumber,
                subtitle: `Requisition`,
                status: p.status, link: `/purchase/requisitions/${p._id}`,
            })),
            ...sos.map(s => ({
                type: 'Sales Order', id: s._id, ref: s.soNumber,
                title: s.soNumber,
                subtitle: `${s.customer?.name || '—'} · ₹${(s.totalAmount || 0).toLocaleString('en-IN')}`,
                status: s.status, link: `/orders/sales/${s._id}`,
            })),
            ...paymentRuns.map(p => ({
                type: 'Payment Run', id: p._id, ref: p.runNumber,
                title: p.runNumber,
                subtitle: `${p.name} · ₹${(p.totalAmount || 0).toLocaleString('en-IN')}`,
                status: p.status, link: `/payments/runs/${p._id}`,
            })),
        ];

        res.json({ success: true, data: results, total: results.length });
    } catch (err) { next(err); }
};