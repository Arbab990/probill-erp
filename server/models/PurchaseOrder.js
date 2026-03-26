import mongoose from 'mongoose';

const poSchema = new mongoose.Schema(
    {
        poNumber: { type: String },  // unique per company — enforced by compound index below
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
        pr: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequisition' },
        items: [
            {
                description: { type: String, required: true },
                quantity: { type: Number, required: true, min: 1 },
                unitPrice: { type: Number, required: true, min: 0 },
                taxRate: { type: Number, default: 0 },
                taxAmount: { type: Number, default: 0 },
                total: { type: Number, default: 0 },
                unit: { type: String, default: 'pcs' },
            },
        ],
        subtotal: { type: Number, default: 0 },
        totalTax: { type: Number, default: 0 },
        totalAmount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['draft', 'sent', 'acknowledged', 'partially_received', 'received', 'invoiced', 'closed', 'cancelled'],
            default: 'draft',
        },
        deliveryDate: Date,
        deliveryAddress: String,
        paymentTerms: { type: Number, default: 30 },
        notes: String,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        grnLinked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GoodsReceipt' }],
        invoiceLinked: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        threeWayMatchStatus: {
            type: String,
            enum: ['pending', 'matched', 'discrepancy'],
            default: 'pending',
        },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

poSchema.pre('save', async function (next) {
    if (this.poNumber) return next();
    const year = new Date().getFullYear();
    const last = await mongoose.model('PurchaseOrder')
        .findOne({ company: this.company, poNumber: { $regex: `^PO-${year}-` } })
        .sort({ poNumber: -1 })
        .select('poNumber');
    let nextNum = 1;
    if (last?.poNumber) {
        const parts = last.poNumber.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    this.poNumber = `PO-${year}-${String(nextNum).padStart(4, '0')}`;
    next();
});

poSchema.index({ company: 1, poNumber: 1 }, { unique: true, sparse: true });

export default mongoose.model('PurchaseOrder', poSchema);