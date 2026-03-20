import mongoose from 'mongoose';

const journalLineSchema = new mongoose.Schema({
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccounts', required: true },
    accountCode: String,   // denormalized for performance
    accountName: String,   // denormalized for performance
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    description: String,
}, { _id: false });

const journalEntrySchema = new mongoose.Schema(
    {
        entryNo: { type: String },  // unique per company — no global index needed
        date: { type: Date, default: Date.now, required: true },
        narration: { type: String, required: true, trim: true },
        lines: [journalLineSchema],

        // Must always balance: sum(debits) === sum(credits)
        totalDebit: { type: Number, default: 0 },
        totalCredit: { type: Number, default: 0 },
        isBalanced: { type: Boolean, default: false },

        // Source document references
        sourceType: {
            type: String,
            enum: ['manual', 'invoice', 'payment', 'payment_run', 'sales_order', 'adjustment'],
            default: 'manual',
        },
        sourceId: { type: mongoose.Schema.Types.ObjectId },
        sourceRef: String,   // human-readable e.g. "INV-2026-00001"

        status: {
            type: String,
            enum: ['draft', 'posted', 'reversed'],
            default: 'draft',
        },
        reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
        reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },

        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        postedAt: Date,

        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

journalEntrySchema.pre('save', async function (next) {
    if (this.entryNo) return next();
    const year = new Date().getFullYear();
    const last = await mongoose.model('JournalEntry')
        .findOne({ company: this.company, entryNo: { $regex: `^JE-${year}-` } })
        .sort({ entryNo: -1 }).select('entryNo');
    let nextNum = 1;
    if (last?.entryNo) {
        const parts = last.entryNo.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    this.entryNo = `JE-${year}-${String(nextNum).padStart(5, '0')}`;
    next();
});

export default mongoose.model('JournalEntry', journalEntrySchema);