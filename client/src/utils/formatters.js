import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export const formatCurrency = (amount, currency = 'INR') => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
};

export const formatDate = (date, fmt = 'dd MMM yyyy') => {
    if (!date) return '—';
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, fmt);
};

export const formatDateTime = (date) => formatDate(date, 'dd MMM yyyy, hh:mm a');

export const formatRelativeTime = (date) => {
    if (!date) return '—';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '—';
};

export const formatCompact = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
};

export const truncate = (str, length = 40) => !str ? '—' : str.length > length ? `${str.substring(0, length)}...` : str;
export const capitalize = (str) => !str ? '' : str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();