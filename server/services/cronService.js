import cron from 'node-cron';
import Invoice from '../models/Invoice.js';
import { notifyCompany } from './notificationService.js';

// ── Helper: clone an invoice as a new draft ───────────────────────────────────
const cloneInvoice = async (invoice) => {
    const nextIssue = new Date();
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 30); // default 30-day payment term

    const clone = await Invoice.create({
        type: invoice.type,
        vendor: invoice.vendor,
        customer: invoice.customer,
        lineItems: invoice.lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            total: item.total,
        })),
        subtotal: invoice.subtotal,
        totalTax: invoice.totalTax,
        total: invoice.total,
        issueDate: nextIssue,
        dueDate: nextDue,
        notes: invoice.notes ? `${invoice.notes} (Auto-generated recurring)` : 'Auto-generated recurring invoice',
        isRecurring: true,
        recurringConfig: invoice.recurringConfig,
        company: invoice.company,
        createdBy: invoice.createdBy,
        status: 'draft',
    });

    return clone;
};

// ── Helper: calculate next recurrence date ────────────────────────────────────
const getNextDate = (currentDate, frequency) => {
    const next = new Date(currentDate);
    switch (frequency) {
        case 'weekly':   next.setDate(next.getDate() + 7); break;
        case 'monthly':  next.setMonth(next.getMonth() + 1); break;
        case 'quarterly':next.setMonth(next.getMonth() + 3); break;
        case 'yearly':   next.setFullYear(next.getFullYear() + 1); break;
        default:         next.setMonth(next.getMonth() + 1); // default monthly
    }
    return next;
};

// ── Recurring invoice job — runs daily at 6 AM ────────────────────────────────
const runRecurringInvoiceJob = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all recurring invoices due today or overdue
        const dueInvoices = await Invoice.find({
            isRecurring: true,
            'recurringConfig.nextDate': { $lte: today },
        });

        if (!dueInvoices.length) return;

        console.log(`[CRON] Processing ${dueInvoices.length} recurring invoice(s)...`);
        let generated = 0;

        for (const invoice of dueInvoices) {
            try {
                // Clone into a new draft invoice
                const clone = await cloneInvoice(invoice);

                // Update the nextDate on the source invoice
                const nextDate = getNextDate(
                    invoice.recurringConfig.nextDate,
                    invoice.recurringConfig.frequency || 'monthly'
                );
                await Invoice.findByIdAndUpdate(invoice._id, {
                    'recurringConfig.nextDate': nextDate,
                });

                // Notify finance team
                await notifyCompany({
                    company: invoice.company,
                    roles: ['super_admin', 'finance_manager'],
                    title: 'Recurring Invoice Generated',
                    message: `${clone.invoiceNo} auto-generated from recurring template`,
                    type: 'info',
                    module: 'invoices',
                    link: `/billing/${clone._id}`,
                    sourceRef: clone.invoiceNo,
                });

                generated++;
            } catch (err) {
                console.error(`[CRON] Failed to process recurring invoice ${invoice._id}:`, err.message);
            }
        }

        console.log(`[CRON] Recurring invoices: ${generated} generated successfully`);
    } catch (err) {
        console.error('[CRON] Recurring invoice job error:', err.message);
    }
};

// ── Overdue invoice check — runs daily at midnight ────────────────────────────
const runOverdueCheckJob = async () => {
    try {
        const now = new Date();
        const result = await Invoice.updateMany(
            {
                status: { $in: ['sent', 'partially_paid'] },
                dueDate: { $lt: now },
            },
            { $set: { status: 'overdue' } }
        );

        if (result.modifiedCount > 0) {
            console.log(`[CRON] Marked ${result.modifiedCount} invoice(s) as overdue`);
        }
    } catch (err) {
        console.error('[CRON] Overdue check error:', err.message);
    }
};

// ── Start all cron jobs ───────────────────────────────────────────────────────
export const startCronJobs = () => {
    // Recurring invoices — every day at 6:00 AM
    cron.schedule('0 6 * * *', () => {
        console.log('[CRON] Running recurring invoice job...');
        runRecurringInvoiceJob();
    });

    // Overdue check — every day at midnight
    cron.schedule('0 0 * * *', () => {
        console.log('[CRON] Running overdue invoice check...');
        runOverdueCheckJob();
    });

    console.log('✅ Cron jobs started: recurring invoices (06:00) + overdue check (00:00)');
};