import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    action: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    detail: String,
}, { _id: false });

const paymentRunSchema = new mongoose.Schema(
    {
        runNumber: { type: String },  // unique per company — no global index needed
        name: { type: String, required: true, trim: true },
        type: { type: String, enum: ['outgoing', 'incoming'], default: 'outgoing' },
        paymentMethod: {
            type: String,
            enum: ['neft', 'rtgs', 'imps', 'upi', 'cheque'],
            default: 'neft',
        },

        // ── SAP-style: House Bank (which bank account is paying) ──
        houseBank: {
            bankName: String,
            accountNo: String,
            ifsc: String,
            branch: String,
        },

        // ── SAP-style: Selection criteria used to build proposal ──
        selectionCriteria: {
            dueDateUpTo: Date,          // only invoices due on or before this date
            captureDiscounts: { type: Boolean, default: true },
            vendorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
            invoiceTypes: [String],     // ['purchase','sales']
        },

        // ── SAP-style: Proposal phase (separate from execution) ──
        proposalStatus: {
            type: String,
            enum: ['none', 'generated', 'edited', 'confirmed'],
            default: 'none',
        },
        proposalGeneratedAt: Date,
        proposalConfirmedAt: Date,

        entries: [
            {
                invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
                vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
                customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
                amount: { type: Number, required: true },

                // SAP-style discount capture
                discountAmount: { type: Number, default: 0 },
                discountDeadline: Date,
                discountCaptured: { type: Boolean, default: false },

                reference: String,

                // SAP-style: block flag — accountant can block individual entries
                blocked: { type: Boolean, default: false },
                blockReason: String,

                status: {
                    type: String,
                    enum: ['pending', 'processing', 'processed', 'failed', 'skipped', 'blocked'],
                    default: 'pending',
                },
                failureReason: String,

                // SAP-style: idempotency — track if GL entry was posted
                glPosted: { type: Boolean, default: false },
                glEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },

                // Clearing reference (SAP calls this "clearing document")
                clearingRef: String,
            },
        ],

        totalAmount: { type: Number, default: 0 },
        totalDiscount: { type: Number, default: 0 },
        netAmount: { type: Number, default: 0 },   // totalAmount - totalDiscount
        entryCount: { type: Number, default: 0 },
        blockedCount: { type: Number, default: 0 },

        // ── Main status flow ──
        status: {
            type: String,
            enum: [
                'draft',        // being configured
                'proposal',     // proposal generated, under review
                'submitted',    // submitted for approval
                'approved',     // approved, ready to execute
                'executing',    // mid-execution (idempotency guard)
                'completed',    // all entries processed
                'partial',      // some entries failed
                'rejected',     // rejected by approver
                'cancelled',
            ],
            default: 'draft',
        },

        submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        submittedAt: Date,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        executedAt: Date,
        rejectionReason: String,
        scheduledDate: Date,
        notes: String,

        // ── SAP-style: full audit log of every change ──
        auditLog: [auditLogSchema],

        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

paymentRunSchema.pre('save', async function (next) {
    if (this.runNumber) return next();
    const year = new Date().getFullYear();
    const last = await mongoose.model('PaymentRun')
        .findOne({ company: this.company, runNumber: { $regex: `^PAY-${year}-` } })
        .sort({ runNumber: -1 }).select('runNumber');
    let nextNum = 1;
    if (last?.runNumber) {
        const parts = last.runNumber.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    this.runNumber = `PAY-${year}-${String(nextNum).padStart(4, '0')}`;
    next();
});

export default mongoose.model('PaymentRun', paymentRunSchema);