export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    FINANCE_MANAGER: 'finance_manager',
    PROCUREMENT_OFFICER: 'procurement_officer',
    SALES_EXECUTIVE: 'sales_executive',
    AUDITOR: 'auditor',
    VIEWER: 'viewer',
};

export const ROLE_LABELS = {
    super_admin: 'Super Admin',
    finance_manager: 'Finance Manager',
    procurement_officer: 'Procurement Officer',
    sales_executive: 'Sales Executive',
    auditor: 'Auditor',
    viewer: 'Viewer',
};

export const PERMISSIONS = {
    vendors: { read: ['super_admin', 'finance_manager', 'procurement_officer', 'sales_executive', 'auditor', 'viewer'], write: ['super_admin', 'procurement_officer', 'finance_manager'], delete: ['super_admin'] },
    purchase: { read: ['super_admin', 'finance_manager', 'procurement_officer', 'auditor'], write: ['super_admin', 'finance_manager', 'procurement_officer'], pr_create: ['super_admin', 'finance_manager', 'procurement_officer', 'sales_executive'] },
    orders: { read: ['super_admin', 'finance_manager', 'sales_executive', 'auditor'], write: ['super_admin', 'finance_manager', 'sales_executive'] },
    payments: { read: ['super_admin', 'finance_manager', 'auditor'], write: ['super_admin', 'finance_manager'], approve: ['super_admin', 'finance_manager'] },
    finance: { read: ['super_admin', 'finance_manager', 'auditor'], write: ['super_admin', 'finance_manager'] },
    billing: { read: ['super_admin', 'finance_manager', 'procurement_officer', 'sales_executive', 'auditor'], write: ['super_admin', 'finance_manager', 'procurement_officer', 'sales_executive'] },
    reports: { read: ['super_admin', 'finance_manager', 'procurement_officer', 'sales_executive', 'auditor'] },
    admin: { read: ['super_admin'], write: ['super_admin'] },
};

export const INVOICE_STATUS_COLORS = {
    draft: 'badge-muted', sent: 'badge-info', partially_paid: 'badge-warning',
    paid: 'badge-success', overdue: 'badge-danger', disputed: 'badge-danger', cancelled: 'badge-muted',
};

export const VENDOR_STATUS_COLORS = {
    pending: 'badge-warning', under_review: 'badge-info', verified: 'badge-success', blacklisted: 'badge-danger',
};

export const NAV_SECTIONS = [
    {
        label: 'Overview',
        items: [
            { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', roles: null },
        ]
    },
    {
        label: 'Finance',
        items: [
            { label: 'Invoices', path: '/billing', icon: 'FileText', roles: ['super_admin', 'finance_manager', 'procurement_officer', 'sales_executive', 'auditor'] },
            { label: 'Payment Runs', path: '/payments', icon: 'CreditCard', roles: ['super_admin', 'finance_manager', 'auditor'] },
            { label: 'Record to Report', path: '/finance', icon: 'BookOpen', roles: ['super_admin', 'finance_manager', 'auditor'] },
        ]
    },
    {
        label: 'Procurement',
        items: [
            { label: 'Vendors', path: '/vendors', icon: 'Building2', roles: null },
            { label: 'Procure to Pay', path: '/purchase', icon: 'ShoppingCart', roles: ['super_admin', 'finance_manager', 'procurement_officer', 'auditor'] },
        ]
    },
    {
        label: 'Sales',
        items: [
            { label: 'Order to Cash', path: '/orders', icon: 'TrendingUp', roles: ['super_admin', 'finance_manager', 'sales_executive', 'auditor'] },
        ]
    },
    {
        label: 'General Ledger',
        items: [
            { label: 'Chart of Accounts', path: '/gl/accounts', icon: 'List', roles: ['super_admin', 'finance_manager', 'auditor'] },
            { label: 'Journal Entries', path: '/gl/journal', icon: 'FileText', roles: ['super_admin', 'finance_manager', 'auditor'] },
            { label: 'Financial Reports', path: '/gl/reports', icon: 'BarChart2', roles: ['super_admin', 'finance_manager', 'auditor'] },
        ]
    },
    {
        label: 'Analytics',
        items: [
            { label: 'KPI Trends', path: '/analytics/kpi', icon: 'TrendingUp', roles: ['super_admin', 'finance_manager', 'auditor'] },
            { label: 'Cash Flow', path: '/analytics/cash-flow', icon: 'DollarSign', roles: ['super_admin', 'finance_manager', 'auditor'] },
            { label: 'Vendor Analytics', path: '/analytics/vendors', icon: 'Package', roles: ['super_admin', 'finance_manager', 'auditor'] },
            { label: 'Customer Analytics', path: '/analytics/customers', icon: 'Users', roles: ['super_admin', 'finance_manager', 'sales_executive', 'auditor'] },
            { label: 'Export Center', path: '/analytics/export', icon: 'Download', roles: null },
        ]
    },
    {
        label: 'System',
        items: [
            { label: 'Admin Panel', path: '/admin', icon: 'Settings', roles: ['super_admin'] },
        ]
    },
];