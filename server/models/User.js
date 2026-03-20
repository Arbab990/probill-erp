import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 8, select: false },
        role: {
            type: String,
            enum: ['super_admin', 'finance_manager', 'procurement_officer', 'sales_executive', 'auditor', 'viewer'],
            default: 'viewer',
        },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
        isActive: { type: Boolean, default: true },
        lastLogin: Date,
        resetPasswordToken: String,
        resetPasswordExpire: Date,
    },
    { timestamps: true }
);

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);