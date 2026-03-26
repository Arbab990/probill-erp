import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
});

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNo: { type: String },  // unique per company — enforced by compound index below
        type: { type: String, enum: ['sales', 'purchase'], required: true },
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
        lineItems: [lineItemSchema],
        subtotal: { type: Number, default: 0 },
        totalTax: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'disputed', 'cancelled'],
            default: 'draft',
        },
        issueDate: { type: Date, default: Date.now },
        dueDate: { type: Date },
        notes: String,
        pdfUrl: String,
        paymentHistory: [
            {
                amount: Number,
                date: { type: Date, default: Date.now },
                method: String,
                reference: String,
            },
        ],
        isRecurring: { type: Boolean, default: false },
        recurringConfig: { frequency: String, nextDate: Date },
        poReference: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

invoiceSchema.pre('save', async function (next) {
    if (this.invoiceNo) return next();
    const year = new Date().getFullYear();
    const last = await mongoose.model('Invoice')
        .findOne({ company: this.company, invoiceNo: { $regex: `^INV-${year}-` } })
        .sort({ invoiceNo: -1 }).select('invoiceNo');
    let nextNum = 1;
    if (last?.invoiceNo) {
        const parts = last.invoiceNo.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    this.invoiceNo = `INV-${year}-${String(nextNum).padStart(5, '0')}`;
    next();
});

invoiceSchema.index({ company: 1, invoiceNo: 1 }, { unique: true, sparse: true });

export default mongoose.model('Invoice', invoiceSchema);