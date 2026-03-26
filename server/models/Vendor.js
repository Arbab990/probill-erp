import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
    {
        vendorCode: { type: String },  // unique per company — enforced by compound index below
        name: { type: String, required: [true, 'Vendor name is required'], trim: true },
        email: { type: String, lowercase: true, trim: true },
        phone: { type: String, trim: true },
        gstin: { type: String, trim: true, uppercase: true },
        pan: { type: String, trim: true, uppercase: true },
        bankDetails: {
            bankName: String,
            accountNo: String,
            ifsc: { type: String, uppercase: true },
            branch: String,
        },
        category: { type: String, enum: ['goods', 'services', 'both'], default: 'services' },
        status: {
            type: String,
            enum: ['pending', 'under_review', 'verified', 'blacklisted'],
            default: 'pending',
        },
        riskScore: { type: Number, min: 0, max: 100, default: null },
        riskReason: String,
        paymentTerms: { type: Number, default: 30 },
        address: { street: String, city: String, state: String, pincode: String },
        documents: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
        notes: String,
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);


// Auto-generate vendor code before saving
vendorSchema.pre('save', async function (next) {
    if (this.vendorCode) return next();
    const last = await mongoose.model('Vendor')
        .findOne({ company: this.company })
        .sort({ vendorCode: -1 })   // sort by code string desc — VND-0010 > VND-0009
        .select('vendorCode');
    let nextNum = 1;
    if (last?.vendorCode) {
        const lastNum = parseInt(last.vendorCode.replace('VND-', ''), 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    this.vendorCode = `VND-${String(nextNum).padStart(4, '0')}`;
    next();
});
vendorSchema.index({ company: 1, vendorCode: 1 }, { unique: true, sparse: true });

export default mongoose.model('Vendor', vendorSchema);