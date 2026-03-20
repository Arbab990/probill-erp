import { VENDOR_STATUS_COLORS, INVOICE_STATUS_COLORS } from '../../utils/constants.js';

const Badge = ({ type, status, label, className = '' }) => {
    let colorClass = 'badge-muted';
    if (type === 'vendor') colorClass = VENDOR_STATUS_COLORS[status] || 'badge-muted';
    else if (type === 'invoice') colorClass = INVOICE_STATUS_COLORS[status] || 'badge-muted';
    else if (type === 'custom') colorClass = status;

    const text = label || (status ? status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '');
    return <span className={`badge ${colorClass} ${className}`}>{text}</span>;
};

export default Badge;