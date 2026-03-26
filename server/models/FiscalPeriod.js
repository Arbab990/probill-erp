import mongoose from 'mongoose';

const fiscalPeriodSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },      // e.g. "April 2024"
    year: { type: Number, required: true },       // e.g. 2024
    month: { type: Number, required: true, min: 1, max: 12 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['open', 'locked'], default: 'open' },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date },
}, { timestamps: true });

fiscalPeriodSchema.index({ company: 1, year: 1, month: 1 }, { unique: true });

export default mongoose.model('FiscalPeriod', fiscalPeriodSchema);