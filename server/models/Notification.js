import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: {
            type: String,
            enum: ['info', 'success', 'warning', 'danger'],
            default: 'info',
        },
        module: {
            type: String,
            enum: ['invoices', 'vendors', 'purchase', 'orders', 'payments', 'gl', 'settings', 'system'],
            default: 'system',
        },
        link: String,           // frontend route to navigate to
        sourceRef: String,      // e.g. 'INV-2026-00001'
        isRead: { type: Boolean, default: false },
        readAt: Date,
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    },
    { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);