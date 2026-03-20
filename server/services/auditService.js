import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({ action, module, description, performedBy, performedByName, targetId, targetRef, changes, severity = 'info', company, req }) => {
    try {
        await AuditLog.create({
            action,
            module,
            description,
            performedBy,
            performedByName,
            targetId,
            targetRef,
            ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '',
            changes,
            severity,
            company,
        });
    } catch (err) {
        console.error('Audit log error (non-critical):', err.message);
    }
};