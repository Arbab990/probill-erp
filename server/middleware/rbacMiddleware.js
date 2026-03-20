export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, error: 'Not authorized' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Role '${req.user.role}' cannot perform this action.`,
            });
        }
        next();
    };
};

export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    FINANCE_MANAGER: 'finance_manager',
    PROCUREMENT_OFFICER: 'procurement_officer',
    SALES_EXECUTIVE: 'sales_executive',
    AUDITOR: 'auditor',
    VIEWER: 'viewer',
};