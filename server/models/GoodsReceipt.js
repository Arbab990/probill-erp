import mongoose from 'mongoose';

const grnSchema = new mongoose.Schema(
    {
        grnNumber: { type: String },  // unique per company — enforced by compound index below
        po: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        receivedDate: { type: Date, default: Date.now },
        items: [
            {
                description: String,
                orderedQty: Number,
                receivedQty: { type: Number, required: true, min: 0 },
                condition: {
                    type: String,
                    enum: ['good', 'damaged', 'partial'],
                    default: 'good',
                },
                notes: String,
            },
        ],
        status: {
            type: String,
            enum: ['draft', 'confirmed', 'discrepancy'],
            default: 'draft',
        },
        discrepancies: [
            {
                itemDescription: String,
                orderedQty: Number,
                receivedQty: Number,
                reason: String,
            },
        ],
        notes: String,
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    },
    { timestamps: true }
);

grnSchema.pre('save', async function (next) {
    if (this.grnNumber) return next();
    const year = new Date().getFullYear();
    const last = await mongoose.model('GoodsReceipt')
        .findOne({ company: this.company, grnNumber: { $regex: `^GRN-${year}-` } })
        .sort({ grnNumber: -1 })
        .select('grnNumber');
    let nextNum = 1;
    if (last?.grnNumber) {
        const parts = last.grnNumber.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    this.grnNumber = `GRN-${year}-${String(nextNum).padStart(4, '0')}`;
    next();
});

grnSchema.index({ company: 1, grnNumber: 1 }, { unique: true, sparse: true });

export default mongoose.model('GoodsReceipt', grnSchema);