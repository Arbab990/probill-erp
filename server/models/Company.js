import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        address: { street: String, city: String, state: String, pincode: String, country: { type: String, default: 'India' } },
        gstin: String,
        pan: String,
        tan: String,
        cin: String,
        website: String,
        logo: String,
        phone: String,
        email: String,
        taxSlabs: [{ name: String, rate: Number }],
        currency: { type: String, default: 'INR' },
        fiscalYearStart: { type: String, default: 'April' },
        timezone: { type: String, default: 'Asia/Kolkata' },
        invoicePrefix: { type: String, default: 'INV' },
        invoiceFooter: String,
        bankDetails: {
            bankName: String,
            accountNo: String,
            ifsc: String,
            branch: String,
            accountType: String,
        },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

export default mongoose.model('Company', companySchema);