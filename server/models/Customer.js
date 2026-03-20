import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
    {
        customerCode: { type: String },  // unique per company — no global index needed
        name: { type: String, required: [true, 'Customer name is required'], trim: true },
        email: { type: String, lowercase: true, trim: true },
        phone: String,
        gstin: { type: String, trim: true, uppercase: true },
        pan: { type: String, trim: true, uppercase: true },
        creditLimit: { type: Number, default: 0 },
        outstandingBalance: { type: Number, default: 0 },
        paymentTerms: { type: Number, default: 30 },
        status: {
            type: String,
            enum: ['active', 'inactive', 'blocked'],
            default: 'active',
        },
        latePaymentCount: { type: Number, default: 0 },
        address: { street: String, city: String, state: String, pincode: String },
        notes: String,
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

customerSchema.pre('save', async function (next) {
    if (this.customerCode) return next();
    const last = await mongoose.model('Customer')
        .findOne({ company: this.company })
        .sort({ customerCode: -1 }).select('customerCode');
    let nextNum = 1;
    if (last?.customerCode) {
        const lastNum = parseInt(last.customerCode.replace('CUST-', ''), 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    this.customerCode = `CUST-${String(nextNum).padStart(4, '0')}`;
    next();
});

export default mongoose.model('Customer', customerSchema);