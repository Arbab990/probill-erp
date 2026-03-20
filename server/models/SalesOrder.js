import mongoose from 'mongoose';

const salesOrderSchema = new mongoose.Schema(
    {
        soNumber: { type: String },  // unique per company — no global index needed
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
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
            enum: ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'invoiced', 'paid', 'cancelled'],
            default: 'draft',
        },
        deliveryDate: Date,
        deliveryAddress: String,
        notes: String,
        invoiceLinked: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

salesOrderSchema.pre('save', async function (next) {
    if (this.soNumber) return next();
    const year = new Date().getFullYear();
    const last = await mongoose.model('SalesOrder')
        .findOne({ company: this.company, soNumber: { $regex: `^SO-${year}-` } })
        .sort({ soNumber: -1 }).select('soNumber');
    let nextNum = 1;
    if (last?.soNumber) {
        const parts = last.soNumber.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    this.soNumber = `SO-${year}-${String(nextNum).padStart(4, '0')}`;
    next();
});

export default mongoose.model('SalesOrder', salesOrderSchema);