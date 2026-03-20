import PaymentRun from '../models/PaymentRun.js';
import Invoice from '../models/Invoice.js';
import { createObjectCsvStringifier } from 'csv-writer';
import { logAudit } from '../services/auditService.js';
import { notifyCompany } from '../services/notificationService.js';

// ── Helper: push to audit log ─────────────────────────────────────────────────
const audit = (run, userId, action, detail = '') => {
    run.auditLog.push({ action, performedBy: userId, detail });
};

// ── Helper: calculate early-payment discount ─────────────────────────────────
// Simple rule: 2% if paid within 10 days of invoice date, else 0
const calcDiscount = (invoice, captureDiscounts) => {
    if (!captureDiscounts) return { discountAmount: 0, discountDeadline: null };
    const discountDeadline = new Date(invoice.issueDate);
    discountDeadline.setDate(discountDeadline.getDate() + 10);
    const canCapture = new Date() <= discountDeadline;
    const totalPaid = invoice.paymentHistory?.reduce((s, p) => s + p.amount, 0) || 0;
    const balance = invoice.total - totalPaid;
    return {
        discountAmount: canCapture ? parseFloat((balance * 0.02).toFixed(2)) : 0,
        discountDeadline,
        discountCaptured: canCapture,
    };
};

// ════════════════════════════════════════════════════════════════════════
// PROPOSAL GENERATION  (SAP-style: separate from execution)
// POST /api/payments/runs/propose
// ════════════════════════════════════════════════════════════════════════
export const generateProposal = async (req, res, next) => {
    try {
        const {
            name, paymentMethod, houseBank,
            dueDateUpTo, captureDiscounts = true,
            vendorIds = [], invoiceType = 'purchase',
            scheduledDate, notes,
        } = req.body;

        // Build query for eligible invoices
        const query = {
            company: req.user.company,
            type: invoiceType,
            status: { $in: ['sent', 'overdue', 'partially_paid'] },
        };
        if (dueDateUpTo) query.dueDate = { $lte: new Date(dueDateUpTo) };
        if (vendorIds.length) query.vendor = { $in: vendorIds };

        const invoices = await Invoice.find(query)
            .populate('vendor', 'name bankDetails email')
            .populate('customer', 'name')
            .sort({ dueDate: 1 }); // oldest due date first — SAP default

        if (!invoices.length) {
            return res.status(400).json({ success: false, error: 'No eligible invoices found for the given criteria' });
        }

        // Build proposal entries
        const entries = invoices.map(inv => {
            const totalPaid = inv.paymentHistory?.reduce((s, p) => s + p.amount, 0) || 0;
            const balance = inv.total - totalPaid;
            const { discountAmount, discountDeadline, discountCaptured } = calcDiscount(inv, captureDiscounts);
            const netPayable = parseFloat((balance - discountAmount).toFixed(2));

            return {
                invoice: inv._id,
                vendor: inv.vendor?._id || undefined,
                customer: inv.customer?._id || undefined,
                amount: netPayable,
                discountAmount,
                discountDeadline,
                discountCaptured,
                reference: `${inv.invoiceNo}-${Date.now()}`,
                status: 'pending',
                blocked: false,
            };
        });

        const totalAmount = entries.reduce((s, e) => s + (e.amount + e.discountAmount), 0);
        const totalDiscount = entries.reduce((s, e) => s + e.discountAmount, 0);
        const netAmount = entries.reduce((s, e) => s + e.amount, 0);

        const run = await PaymentRun.create({
            name,
            paymentMethod,
            houseBank,
            selectionCriteria: { dueDateUpTo, captureDiscounts, vendorIds, invoiceTypes: [invoiceType] },
            entries,
            totalAmount,
            totalDiscount,
            netAmount,
            entryCount: entries.length,
            scheduledDate,
            notes,
            status: 'proposal',
            proposalStatus: 'generated',
            proposalGeneratedAt: new Date(),
            company: req.user.company,
            createdBy: req.user._id,
            auditLog: [{
                action: 'PROPOSAL_GENERATED',
                performedBy: req.user._id,
                detail: `${entries.length} invoices · ₹${netAmount.toLocaleString('en-IN')} net · ₹${totalDiscount.toLocaleString('en-IN')} discounts captured`,
            }],
        });

        await logAudit({ action: 'PAYMENT_PROPOSAL_GENERATED', module: 'payments', description: `Payment proposal ${run.runNumber} generated — ${entries.length} invoices, ₹${netAmount.toLocaleString('en-IN')} net`, performedBy: req.user._id, performedByName: req.user.name, targetId: run._id, targetRef: 'PaymentRun', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Payment Proposal Generated', message: `${run.runNumber} generated by ${req.user.name} — ${entries.length} invoices`, type: 'info', module: 'payments', link: `/payments/runs/${run._id}`, sourceRef: run.runNumber });
        res.status(201).json({ success: true, message: `Proposal generated: ${entries.length} invoices`, data: run });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════════════
// BLOCK / UNBLOCK individual entry  (SAP: accountant edits proposal)
// PUT /api/payments/runs/:id/entries/:entryIndex/block
// ════════════════════════════════════════════════════════════════════════
export const toggleEntryBlock = async (req, res, next) => {
    try {
        const { entryIndex } = req.params;
        const { blocked, blockReason } = req.body;
        const run = await PaymentRun.findOne({ _id: req.params.id, company: req.user.company });
        if (!run) return res.status(404).json({ success: false, error: 'Payment run not found' });
        if (!['proposal', 'draft'].includes(run.status)) {
            return res.status(400).json({ success: false, error: 'Can only edit entries in proposal/draft status' });
        }

        const entry = run.entries[parseInt(entryIndex)];
        if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });

        entry.blocked = blocked;
        entry.blockReason = blocked ? (blockReason || 'Manually blocked') : '';
        entry.status = blocked ? 'blocked' : 'pending';

        // Recalculate totals excluding blocked
        const active = run.entries.filter(e => !e.blocked);
        run.totalAmount = active.reduce((s, e) => s + (e.amount + e.discountAmount), 0);
        run.totalDiscount = active.reduce((s, e) => s + e.discountAmount, 0);
        run.netAmount = active.reduce((s, e) => s + e.amount, 0);
        run.blockedCount = run.entries.filter(e => e.blocked).length;
        run.proposalStatus = 'edited';

        audit(run, req.user._id, blocked ? 'ENTRY_BLOCKED' : 'ENTRY_UNBLOCKED',
            `Entry ${entryIndex}: ${blockReason || ''}`);

        await run.save();
        res.json({ success: true, message: `Entry ${blocked ? 'blocked' : 'unblocked'}`, data: run });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════════════
// CONFIRM PROPOSAL  (SAP: locks proposal, ready for approval)
// PUT /api/payments/runs/:id/confirm-proposal
// ════════════════════════════════════════════════════════════════════════
export const confirmProposal = async (req, res, next) => {
    try {
        const run = await PaymentRun.findOne({ _id: req.params.id, company: req.user.company });
        if (!run) return res.status(404).json({ success: false, error: 'Not found' });
        if (run.status !== 'proposal') return res.status(400).json({ success: false, error: 'Only proposals can be confirmed' });

        run.proposalStatus = 'confirmed';
        run.proposalConfirmedAt = new Date();
        audit(run, req.user._id, 'PROPOSAL_CONFIRMED',
            `${run.entryCount - run.blockedCount} active entries · ₹${run.netAmount.toLocaleString('en-IN')}`);
        await run.save();

        res.json({ success: true, message: 'Proposal confirmed', data: run });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════════════
// EXISTING CRUD (unchanged logic, audit logs added)
// ════════════════════════════════════════════════════════════════════════

export const getPaymentRuns = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status = '' } = req.query;
        const query = { company: req.user.company };
        if (status) query.status = status;
        const total = await PaymentRun.countDocuments(query);
        const runs = await PaymentRun.find(query)
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        res.json({ success: true, data: runs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
};

export const getPaymentRun = async (req, res, next) => {
    try {
        const run = await PaymentRun.findOne({ _id: req.params.id, company: req.user.company })
            .populate('createdBy', 'name email')
            .populate('submittedBy', 'name')
            .populate('approvedBy', 'name')
            .populate('executedBy', 'name')
            .populate('auditLog.performedBy', 'name')
            .populate('entries.invoice', 'invoiceNo total dueDate issueDate')
            .populate('entries.vendor', 'name bankDetails')
            .populate('entries.customer', 'name');
        if (!run) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: run });
    } catch (err) { next(err); }
};

// Keep original createPaymentRun for direct (non-proposal) creation
export const createPaymentRun = async (req, res, next) => {
    try {
        const { name, type, paymentMethod, houseBank, invoiceIds, scheduledDate, notes } = req.body;
        const invoices = await Invoice.find({
            _id: { $in: invoiceIds },
            company: req.user.company,
            status: { $in: ['sent', 'overdue', 'partially_paid'] },
        }).populate('vendor', 'name bankDetails').populate('customer', 'name');

        if (!invoices.length) return res.status(400).json({ success: false, error: 'No valid invoices selected' });

        const entries = invoices.map(inv => {
            const totalPaid = inv.paymentHistory?.reduce((s, p) => s + p.amount, 0) || 0;
            const balance = inv.total - totalPaid;
            return { invoice: inv._id, vendor: inv.vendor?._id, customer: inv.customer?._id, amount: balance, reference: `${inv.invoiceNo}-${Date.now()}`, status: 'pending' };
        });

        const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
        const run = await PaymentRun.create({
            name, type, paymentMethod, houseBank, entries, totalAmount, netAmount: totalAmount,
            entryCount: entries.length, scheduledDate, notes,
            company: req.user.company, createdBy: req.user._id,
            auditLog: [{ action: 'RUN_CREATED', performedBy: req.user._id, detail: `${entries.length} invoices manually selected` }],
        });
        await logAudit({ action: 'PAYMENT_RUN_CREATED', module: 'payments', description: `Payment run ${run.runNumber} created with ${entries.length} invoices`, performedBy: req.user._id, performedByName: req.user.name, targetId: run._id, targetRef: 'PaymentRun', severity: 'info', company: req.user.company, req });
        res.status(201).json({ success: true, message: 'Payment run created', data: run });
    } catch (err) { next(err); }
};

export const submitPaymentRun = async (req, res, next) => {
    try {
        const run = await PaymentRun.findOne({ _id: req.params.id, company: req.user.company });
        if (!run) return res.status(404).json({ success: false, error: 'Not found' });
        if (!['draft', 'proposal'].includes(run.status)) return res.status(400).json({ success: false, error: 'Only draft/proposal runs can be submitted' });
        run.status = 'submitted';
        run.submittedBy = req.user._id;
        run.submittedAt = new Date();
        audit(run, req.user._id, 'SUBMITTED', `₹${run.netAmount.toLocaleString('en-IN')}`);
        await run.save();
        await logAudit({ action: 'PAYMENT_RUN_SUBMITTED', module: 'payments', description: `Payment run ${run.runNumber} submitted for approval — ₹${run.netAmount?.toLocaleString('en-IN')}`, performedBy: req.user._id, performedByName: req.user.name, targetId: run._id, targetRef: 'PaymentRun', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Payment Run Awaiting Approval', message: `${run.runNumber} submitted for approval by ${req.user.name}`, type: 'warning', module: 'payments', link: `/payments/runs/${run._id}`, sourceRef: run.runNumber });
        res.json({ success: true, message: 'Submitted for approval', data: run });
    } catch (err) { next(err); }
};

export const approvePaymentRun = async (req, res, next) => {
    try {
        const run = await PaymentRun.findOne({ _id: req.params.id, company: req.user.company });
        if (!run) return res.status(404).json({ success: false, error: 'Not found' });
        if (run.status !== 'submitted') return res.status(400).json({ success: false, error: 'Only submitted runs can be approved' });
        run.status = 'approved';
        run.approvedBy = req.user._id;
        run.approvedAt = new Date();
        audit(run, req.user._id, 'APPROVED');
        await run.save();
        await logAudit({ action: 'PAYMENT_RUN_APPROVED', module: 'payments', description: `Payment run ${run.runNumber} approved`, performedBy: req.user._id, performedByName: req.user.name, targetId: run._id, targetRef: 'PaymentRun', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Payment Run Approved', message: `${run.runNumber} approved by ${req.user.name}`, type: 'success', module: 'payments', link: `/payments/runs/${run._id}`, sourceRef: run.runNumber });
        res.json({ success: true, message: 'Payment run approved', data: run });
    } catch (err) { next(err); }
};

export const rejectPaymentRun = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const run = await PaymentRun.findOne({ _id: req.params.id, company: req.user.company });
        if (!run) return res.status(404).json({ success: false, error: 'Not found' });
        if (run.status !== 'submitted') return res.status(400).json({ success: false, error: 'Only submitted runs can be rejected' });
        run.status = 'rejected';
        run.rejectionReason = reason || 'No reason provided';
        audit(run, req.user._id, 'REJECTED', reason);
        await run.save();
        await logAudit({ action: 'PAYMENT_RUN_REJECTED', module: 'payments', description: `Payment run ${run.runNumber} rejected — "${run.rejectionReason}"`, performedBy: req.user._id, performedByName: req.user.name, targetId: run._id, targetRef: 'PaymentRun', severity: 'warning', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Payment Run Rejected', message: `${run.runNumber} rejected by ${req.user.name}`, type: 'danger', module: 'payments', link: `/payments/runs/${run._id}`, sourceRef: run.runNumber });
        res.json({ success: true, message: 'Payment run rejected', data: run });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════════════
// EXECUTE — with idempotency guard + GL clearing stub
// ════════════════════════════════════════════════════════════════════════
export const executePaymentRun = async (req, res, next) => {
    try {
        const run = await PaymentRun.findOne({ _id: req.params.id, company: req.user.company })
            .populate('entries.invoice');
        if (!run) return res.status(404).json({ success: false, error: 'Not found' });
        if (run.status !== 'approved') return res.status(400).json({ success: false, error: 'Only approved runs can be executed' });

        // ── Idempotency guard ── if somehow already executing (crash recovery)
        if (run.status === 'executing') {
            return res.status(409).json({ success: false, error: 'Run is already executing. Check entries and resume carefully.' });
        }

        run.status = 'executing';
        audit(run, req.user._id, 'EXECUTION_STARTED');
        await run.save();

        let processedCount = 0;
        let failedCount = 0;

        for (const entry of run.entries) {
            // Skip already processed (idempotency — safe to re-run after crash)
            if (entry.status === 'processed') { processedCount++; continue; }
            if (entry.blocked || entry.status === 'blocked') { entry.status = 'skipped'; continue; }

            try {
                const invoice = await Invoice.findById(entry.invoice._id || entry.invoice);
                if (!invoice) throw new Error('Invoice not found');

                // ── Record payment on invoice ──
                invoice.paymentHistory.push({
                    amount: entry.amount,
                    method: run.paymentMethod,
                    reference: entry.reference,
                });
                const totalPaid = invoice.paymentHistory.reduce((s, p) => s + p.amount, 0);
                invoice.status = totalPaid >= invoice.total ? 'paid' : 'partially_paid';
                await invoice.save();

                // ── GL clearing stub ──
                // When Phase 7 (General Ledger) is built, replace this with a real
                // JournalEntry: Dr Accounts Payable / Cr Bank Account
                // entry.glEntryId = createdJournalEntry._id;
                entry.glPosted = false; // will be true after Phase 7
                entry.clearingRef = `CLR-${run.runNumber}-${String(processedCount + 1).padStart(3, '0')}`;
                entry.status = 'processed';
                processedCount++;
            } catch (err) {
                entry.status = 'failed';
                entry.failureReason = err.message;
                failedCount++;
            }
        }

        run.status = failedCount > 0 && processedCount === 0 ? 'partial' : failedCount > 0 ? 'partial' : 'completed';
        run.executedBy = req.user._id;
        run.executedAt = new Date();
        audit(run, req.user._id, 'EXECUTION_COMPLETED',
            `${processedCount} processed · ${failedCount} failed`);
        await run.save();

        // ── Phase 7 GL Integration — post clearing entry ──
        try {
            const { postPaymentRunGL } = await import('./glController.js');
            const glEntry = await postPaymentRunGL(req.user.company, req.user._id, run);
            if (glEntry) {
                // Update all processed entries with GL reference
                for (const entry of run.entries) {
                    if (entry.status === 'processed') {
                        entry.glPosted = true;
                        entry.glEntryId = glEntry._id;
                    }
                }
                await run.save();
            }
        } catch (glErr) {
            console.error('GL posting failed (non-critical):', glErr.message);
        }

        await logAudit({ action: 'PAYMENT_RUN_EXECUTED', module: 'payments', description: `Payment run ${run.runNumber} executed — ${processedCount} processed, ${failedCount} failed`, performedBy: req.user._id, performedByName: req.user.name, targetId: run._id, targetRef: 'PaymentRun', severity: failedCount > 0 ? 'warning' : 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: `Payment Run ${failedCount > 0 ? 'Completed with Errors' : 'Executed'}`, message: `${run.runNumber} executed by ${req.user.name} — ${processedCount} paid${failedCount > 0 ? `, ${failedCount} failed` : ''}`, type: failedCount > 0 ? 'warning' : 'success', module: 'payments', link: `/payments/runs/${run._id}`, sourceRef: run.runNumber });
        res.json({
            success: true,
            message: `Payment run ${run.status}: ${processedCount} processed, ${failedCount} failed`,
            data: run,
        });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════════════
// CSV EXPORT — NEFT/RTGS bank format
// ════════════════════════════════════════════════════════════════════════
export const exportPaymentRunCSV = async (req, res, next) => {
    try {
        const run = await PaymentRun.findOne({ _id: req.params.id, company: req.user.company })
            .populate('entries.invoice', 'invoiceNo')
            .populate('entries.vendor', 'name bankDetails')
            .populate('entries.customer', 'name');
        if (!run) return res.status(404).json({ success: false, error: 'Not found' });

        const rows = run.entries
            .filter(e => e.status !== 'blocked' && e.status !== 'skipped')
            .map((entry, idx) => ({
                'Sr No': idx + 1,
                'Payment Method': run.paymentMethod.toUpperCase(),
                'Beneficiary Name': entry.vendor?.name || entry.customer?.name || 'Unknown',
                'Account Number': entry.vendor?.bankDetails?.accountNo || '',
                'IFSC Code': entry.vendor?.bankDetails?.ifsc || '',
                'Bank Name': entry.vendor?.bankDetails?.bankName || '',
                'Gross Amount': (entry.amount + entry.discountAmount).toFixed(2),
                'Discount': entry.discountAmount?.toFixed(2) || '0.00',
                'Net Amount': entry.amount.toFixed(2),
                'Discount Captured': entry.discountCaptured ? 'Yes' : 'No',
                'Reference': entry.reference || '',
                'Invoice No': entry.invoice?.invoiceNo || '',
                'Clearing Ref': entry.clearingRef || '',
                'Status': entry.status,
            }));

        const csvStringifier = createObjectCsvStringifier({
            header: Object.keys(rows[0] || {}).map(k => ({ id: k, title: k })),
        });

        const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(rows);
        res.set({
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${run.runNumber}-bank-export.csv"`,
        });
        res.send(csv);
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════════════
// PENDING INVOICES for manual selection
// ════════════════════════════════════════════════════════════════════════
export const getPendingInvoices = async (req, res, next) => {
    try {
        const { type = 'purchase' } = req.query;
        const invoices = await Invoice.find({
            company: req.user.company, type,
            status: { $in: ['sent', 'overdue', 'partially_paid'] },
        })
            .populate('vendor', 'name bankDetails')
            .populate('customer', 'name')
            .sort({ dueDate: 1 });

        const data = invoices.map(inv => {
            const totalPaid = inv.paymentHistory?.reduce((s, p) => s + p.amount, 0) || 0;
            const balance = inv.total - totalPaid;
            const daysOverdue = inv.dueDate ? Math.max(0, Math.floor((Date.now() - new Date(inv.dueDate)) / 86400000)) : 0;
            const discountDeadline = new Date(inv.issueDate);
            discountDeadline.setDate(discountDeadline.getDate() + 10);
            const discountAvailable = new Date() <= discountDeadline ? parseFloat((balance * 0.02).toFixed(2)) : 0;
            return { ...inv.toObject(), balance, daysOverdue, discountAvailable, discountDeadline };
        });

        res.json({ success: true, data });
    } catch (err) { next(err); }
};