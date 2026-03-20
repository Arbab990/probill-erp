import PurchaseRequisition from '../models/PurchaseRequisition.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import GoodsReceipt from '../models/GoodsReceipt.js';
import { logAudit } from '../services/auditService.js';
import { notifyCompany } from '../services/notificationService.js';

// ════════════════════════════════════════════════
// PURCHASE REQUISITIONS
// ════════════════════════════════════════════════

// GET /api/purchase/requisitions
export const getRequisitions = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status = '' } = req.query;
        const query = { company: req.user.company };
        if (status) query.status = status;

        const total = await PurchaseRequisition.countDocuments(query);
        const prs = await PurchaseRequisition.find(query)
            .populate('requestedBy', 'name')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({ success: true, data: prs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
};

// GET /api/purchase/requisitions/:id
export const getRequisition = async (req, res, next) => {
    try {
        const pr = await PurchaseRequisition.findOne({ _id: req.params.id, company: req.user.company })
            .populate('requestedBy', 'name email')
            .populate('approvedBy', 'name email')
            .populate('poLinked', 'poNumber status totalAmount');
        if (!pr) return res.status(404).json({ success: false, error: 'Requisition not found' });
        res.json({ success: true, data: pr });
    } catch (err) { next(err); }
};

// POST /api/purchase/requisitions
export const createRequisition = async (req, res, next) => {
    try {
        const { items = [], ...rest } = req.body;
        const totalEstimated = items.reduce((s, i) => s + ((i.quantity || 0) * (i.estimatedUnitPrice || 0)), 0);
        const pr = await PurchaseRequisition.create({
            ...rest, items, totalEstimated,
            requestedBy: req.user._id,
            company: req.user.company,
        });
        await logAudit({ action: 'PR_CREATED', module: 'purchase', description: `Purchase Requisition ${pr.prNumber} created (${items.length} item(s), est. total: ${totalEstimated})`, performedBy: req.user._id, performedByName: req.user.name, targetId: pr._id, targetRef: 'PurchaseRequisition', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'New Purchase Requisition', message: `${pr.prNumber} created by ${req.user.name}`, type: 'info', module: 'purchase', link: `/purchase/requisitions/${pr._id}`, sourceRef: pr.prNumber });
        res.status(201).json({ success: true, message: 'Purchase requisition created', data: pr });
    } catch (err) { next(err); }
};

// PUT /api/purchase/requisitions/:id/submit
export const submitRequisition = async (req, res, next) => {
    try {
        const pr = await PurchaseRequisition.findOne({ _id: req.params.id, company: req.user.company });
        if (!pr) return res.status(404).json({ success: false, error: 'Requisition not found' });
        if (pr.status !== 'draft') return res.status(400).json({ success: false, error: 'Only draft PRs can be submitted' });
        pr.status = 'submitted';
        await pr.save();
        await logAudit({ action: 'PR_SUBMITTED', module: 'purchase', description: `PR ${pr.prNumber} submitted for approval`, performedBy: req.user._id, performedByName: req.user.name, targetId: pr._id, targetRef: 'PurchaseRequisition', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'PR Awaiting Approval', message: `${pr.prNumber} submitted for approval by ${req.user.name}`, type: 'warning', module: 'purchase', link: `/purchase/requisitions/${pr._id}`, sourceRef: pr.prNumber });
        res.json({ success: true, message: 'Requisition submitted for approval', data: pr });
    } catch (err) { next(err); }
};

// PUT /api/purchase/requisitions/:id/approve
export const approveRequisition = async (req, res, next) => {
    try {
        const pr = await PurchaseRequisition.findOne({ _id: req.params.id, company: req.user.company });
        if (!pr) return res.status(404).json({ success: false, error: 'Requisition not found' });
        if (pr.status !== 'submitted') return res.status(400).json({ success: false, error: 'Only submitted PRs can be approved' });
        pr.status = 'approved';
        pr.approvedBy = req.user._id;
        pr.approvedAt = new Date();
        await pr.save();
        await logAudit({ action: 'PR_APPROVED', module: 'purchase', description: `PR ${pr.prNumber} approved`, performedBy: req.user._id, performedByName: req.user.name, targetId: pr._id, targetRef: 'PurchaseRequisition', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'PR Approved', message: `${pr.prNumber} approved by ${req.user.name}`, type: 'success', module: 'purchase', link: `/purchase/requisitions/${pr._id}`, sourceRef: pr.prNumber });
        res.json({ success: true, message: 'Requisition approved', data: pr });
    } catch (err) { next(err); }
};

// PUT /api/purchase/requisitions/:id/reject
export const rejectRequisition = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const pr = await PurchaseRequisition.findOne({ _id: req.params.id, company: req.user.company });
        if (!pr) return res.status(404).json({ success: false, error: 'Requisition not found' });
        if (pr.status !== 'submitted') return res.status(400).json({ success: false, error: 'Only submitted PRs can be rejected' });
        pr.status = 'rejected';
        pr.rejectionReason = reason || 'No reason provided';
        await pr.save();
        await logAudit({ action: 'PR_REJECTED', module: 'purchase', description: `PR ${pr.prNumber} rejected — "${pr.rejectionReason}"`, performedBy: req.user._id, performedByName: req.user.name, targetId: pr._id, targetRef: 'PurchaseRequisition', severity: 'warning', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'PR Rejected', message: `${pr.prNumber} rejected by ${req.user.name}`, type: 'danger', module: 'purchase', link: `/purchase/requisitions/${pr._id}`, sourceRef: pr.prNumber });
        res.json({ success: true, message: 'Requisition rejected', data: pr });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// PURCHASE ORDERS
// ════════════════════════════════════════════════

// GET /api/purchase/orders
export const getPurchaseOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status = '' } = req.query;
        const query = { company: req.user.company };
        if (status) query.status = status;

        const total = await PurchaseOrder.countDocuments(query);
        const pos = await PurchaseOrder.find(query)
            .populate('vendor', 'name email')
            .populate('pr', 'prNumber')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({ success: true, data: pos, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
};

// GET /api/purchase/orders/:id
export const getPurchaseOrder = async (req, res, next) => {
    try {
        const po = await PurchaseOrder.findOne({ _id: req.params.id, company: req.user.company })
            .populate('vendor', 'name email phone gstin bankDetails address')
            .populate('pr', 'prNumber status')
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name')
            .populate('grnLinked', 'grnNumber status receivedDate')
            .populate('invoiceLinked', 'invoiceNo status total');
        if (!po) return res.status(404).json({ success: false, error: 'Purchase order not found' });
        res.json({ success: true, data: po });
    } catch (err) { next(err); }
};

// POST /api/purchase/orders
export const createPurchaseOrder = async (req, res, next) => {
    try {
        const { items = [], prId, ...rest } = req.body;

        const calculatedItems = items.map(item => {
            const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
            const taxAmount = (subtotal * (item.taxRate || 0)) / 100;
            return { ...item, taxAmount, total: subtotal + taxAmount };
        });

        const subtotal = calculatedItems.reduce((s, i) => s + ((i.quantity || 0) * (i.unitPrice || 0)), 0);
        const totalTax = calculatedItems.reduce((s, i) => s + (i.taxAmount || 0), 0);

        const po = await PurchaseOrder.create({
            ...rest,
            items: calculatedItems,
            subtotal, totalTax,
            totalAmount: subtotal + totalTax,
            pr: prId || undefined,
            company: req.user.company,
            createdBy: req.user._id,
        });

        // If created from PR — mark PR as converted
        if (prId) {
            await PurchaseRequisition.findByIdAndUpdate(prId, { status: 'converted', poLinked: po._id });
        }

        await logAudit({ action: 'PO_CREATED', module: 'purchase', description: `Purchase Order ${po.poNumber} created (total: ${po.totalAmount})`, performedBy: req.user._id, performedByName: req.user.name, targetId: po._id, targetRef: 'PurchaseOrder', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Purchase Order Created', message: `${po.poNumber} created by ${req.user.name}`, type: 'info', module: 'purchase', link: `/purchase/orders/${po._id}`, sourceRef: po.poNumber });
        res.status(201).json({ success: true, message: 'Purchase order created', data: po });
    } catch (err) { next(err); }
};

// PUT /api/purchase/orders/:id/status
export const updatePOStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const allowed = ['draft', 'sent', 'acknowledged', 'partially_received', 'received', 'invoiced', 'closed', 'cancelled'];
        if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });
        const po = await PurchaseOrder.findOneAndUpdate(
            { _id: req.params.id, company: req.user.company },
            { status },
            { new: true }
        );
        if (!po) return res.status(404).json({ success: false, error: 'PO not found' });
        await logAudit({ action: 'PO_STATUS_CHANGED', module: 'purchase', description: `PO ${po.poNumber} status changed to "${status}"`, performedBy: req.user._id, performedByName: req.user.name, targetId: po._id, targetRef: 'PurchaseOrder', severity: status === 'cancelled' ? 'warning' : 'info', company: req.user.company, req });
        res.json({ success: true, message: `PO status updated to ${status}`, data: po });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// GOODS RECEIPT NOTES
// ════════════════════════════════════════════════

// GET /api/purchase/grn
export const getGRNs = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const query = { company: req.user.company };
        const total = await GoodsReceipt.countDocuments(query);
        const grns = await GoodsReceipt.find(query)
            .populate('po', 'poNumber')
            .populate('vendor', 'name')
            .populate('receivedBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        res.json({ success: true, data: grns, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
};

// POST /api/purchase/grn
export const createGRN = async (req, res, next) => {
    try {
        const { poId, items, notes } = req.body;
        const po = await PurchaseOrder.findOne({ _id: poId, company: req.user.company });
        if (!po) return res.status(404).json({ success: false, error: 'Purchase order not found' });

        // Build GRN items with ordered quantities from PO
        const grnItems = items.map((item, idx) => ({
            description: po.items[idx]?.description || item.description,
            orderedQty: po.items[idx]?.quantity || 0,
            receivedQty: item.receivedQty,
            condition: item.condition || 'good',
            notes: item.notes || '',
        }));

        // Find discrepancies
        const discrepancies = grnItems
            .filter(i => i.receivedQty !== i.orderedQty)
            .map(i => ({
                itemDescription: i.description,
                orderedQty: i.orderedQty,
                receivedQty: i.receivedQty,
                reason: i.receivedQty < i.orderedQty ? 'Short delivery' : 'Over delivery',
            }));

        const grn = await GoodsReceipt.create({
            po: poId,
            vendor: po.vendor,
            items: grnItems,
            discrepancies,
            status: discrepancies.length > 0 ? 'discrepancy' : 'confirmed',
            receivedBy: req.user._id,
            notes,
            company: req.user.company,
        });

        // Update PO — link GRN and update status
        const allReceived = grnItems.every(i => i.receivedQty >= i.orderedQty);
        await PurchaseOrder.findByIdAndUpdate(poId, {
            $push: { grnLinked: grn._id },
            status: allReceived ? 'received' : 'partially_received',
        });

        // Run 3-way match check
        await runThreeWayMatch(poId);

        await logAudit({ action: 'GRN_CREATED', module: 'purchase', description: `GRN ${grn.grnNumber} created for PO — ${discrepancies.length > 0 ? `${discrepancies.length} discrepancy(ies) found` : 'all items confirmed'}`, performedBy: req.user._id, performedByName: req.user.name, targetId: grn._id, targetRef: 'GoodsReceipt', severity: discrepancies.length > 0 ? 'warning' : 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: discrepancies.length > 0 ? 'GRN Created with Discrepancies' : 'Goods Receipt Confirmed', message: `${grn.grnNumber} confirmed by ${req.user.name}${discrepancies.length > 0 ? ` — ${discrepancies.length} discrepancy(ies)` : ''}`, type: discrepancies.length > 0 ? 'warning' : 'success', module: 'purchase', sourceRef: grn.grnNumber });
        res.status(201).json({ success: true, message: 'GRN created', data: grn });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// 3-WAY MATCH
// ════════════════════════════════════════════════

const runThreeWayMatch = async (poId) => {
    const po = await PurchaseOrder.findById(poId).populate('grnLinked').populate('invoiceLinked');
    if (!po) return;

    // Need: PO exists + at least one GRN + invoice linked
    if (!po.grnLinked?.length) return;

    const totalOrdered = po.items.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalReceived = po.grnLinked.reduce((sum, grn) =>
        sum + grn.items.reduce((s, i) => s + (i.receivedQty || 0), 0), 0);

    const qtyMatch = totalReceived >= totalOrdered;
    const hasDiscrepancy = po.grnLinked.some(g => g.status === 'discrepancy');

    po.threeWayMatchStatus = (qtyMatch && !hasDiscrepancy) ? 'matched' : 'discrepancy';
    await po.save();
};

// GET /api/purchase/three-way-match/:poId
export const getThreeWayMatch = async (req, res, next) => {
    try {
        const po = await PurchaseOrder.findOne({ _id: req.params.poId, company: req.user.company })
            .populate('vendor', 'name')
            .populate('grnLinked')
            .populate('invoiceLinked', 'invoiceNo total status');

        if (!po) return res.status(404).json({ success: false, error: 'PO not found' });

        const totalOrdered = po.items.reduce((s, i) => s + (i.quantity || 0), 0);
        const totalReceived = po.grnLinked?.reduce((sum, grn) =>
            sum + grn.items.reduce((s, i) => s + (i.receivedQty || 0), 0), 0) || 0;

        const match = {
            po: { number: po.poNumber, amount: po.totalAmount, items: po.items.length },
            grn: { count: po.grnLinked?.length || 0, totalReceived },
            invoice: po.invoiceLinked ? { number: po.invoiceLinked.invoiceNo, amount: po.invoiceLinked.total, status: po.invoiceLinked.status } : null,
            status: po.threeWayMatchStatus,
            qtyMatch: totalReceived >= totalOrdered,
            amountMatch: po.invoiceLinked ? Math.abs(po.invoiceLinked.total - po.totalAmount) < 1 : false,
        };

        res.json({ success: true, data: match });
    } catch (err) { next(err); }
};