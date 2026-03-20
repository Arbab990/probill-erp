import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
    {
        action: { type: String, required: true },   // e.g. 'INVOICE_CREATED'
        module: { type: String, required: true },   // e.g. 'invoices'
        description: { type: String },              // human-readable
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedByName: String,                    // denormalized
        targetId: { type: mongoose.Schema.Types.ObjectId },
        targetRef: String,                          // e.g. 'INV-2026-00001'
        ipAddress: String,
        changes: mongoose.Schema.Types.Mixed,       // before/after snapshot
        severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    },
    { timestamps: true }
);

auditLogSchema.index({ company: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, company: 1 });

export default mongoose.model('AuditLog', auditLogSchema);