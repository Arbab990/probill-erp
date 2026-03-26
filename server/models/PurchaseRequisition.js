import mongoose from 'mongoose';

const prSchema = new mongoose.Schema(
    {
        prNumber: { type: String },  // unique per company — enforced by compound index below
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        department: { type: String, trim: true },
        items: [
            {
                description: { type: String, required: true },
                quantity: { type: Number, required: true, min: 1 },
                estimatedUnitPrice: { type: Number, default: 0 },
                unit: { type: String, default: 'pcs' },
            },
        ],
        totalEstimated: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['draft', 'submitted', 'approved', 'rejected', 'converted'],
            default: 'draft',
        },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        rejectionReason: String,
        poLinked: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
        notes: String,
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    },
    { timestamps: true }
);

prSchema.pre('save', async function (next) {
    if (this.prNumber) return next();
    const year = new Date().getFullYear();
    const last = await mongoose.model('PurchaseRequisition')
        .findOne({ company: this.company, prNumber: { $regex: `^PR-${year}-` } })
        .sort({ prNumber: -1 })
        .select('prNumber');
    let nextNum = 1;
    if (last?.prNumber) {
        const parts = last.prNumber.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    this.prNumber = `PR-${year}-${String(nextNum).padStart(4, '0')}`;
    next();
});

prSchema.index({ company: 1, prNumber: 1 }, { unique: true, sparse: true });

export default mongoose.model('PurchaseRequisition', prSchema);