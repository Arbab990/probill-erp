import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Trash2, Send, Download } from 'lucide-react';
import { invoiceService } from '../../services/invoiceService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Table from '../../components/common/Table.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import usePermission from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const InvoiceList = () => {
    const navigate = useNavigate();
    const { can } = usePermission();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await invoiceService.getAll({ page, limit: 10, search, type: typeFilter, status: statusFilter });
            setInvoices(res.data.data);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load invoices'); }
        finally { setLoading(false); }
    }, [page, search, typeFilter, statusFilter]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await invoiceService.delete(deleteTarget._id);
            toast.success('Invoice deleted');
            setDeleteTarget(null);
            fetchInvoices();
        } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
        finally { setDeleting(false); }
    };

    const handleDownload = async (invoice) => {
        try {
            const res = await invoiceService.downloadPDF(invoice._id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoice.invoiceNo}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { toast.error('Failed to download PDF'); }
    };

    const columns = [
        { key: 'invoiceNo', label: 'Invoice #', render: r => <span className="font-mono text-primary-light text-sm">{r.invoiceNo}</span> },
        { key: 'type', label: 'Type', render: r => <Badge type="custom" status={r.type === 'sales' ? 'badge-info' : 'badge-warning'} label={r.type === 'sales' ? 'Sales' : 'Purchase'} /> },
        {
            key: 'party', label: 'Party', render: r => (
                <div>
                    <p className="font-medium text-slate-200">{r.vendor?.name || r.customer?.name || '—'}</p>
                    <p className="text-xs text-slate-500">{r.vendor?.email || r.customer?.email || ''}</p>
                </div>
            )
        },
        { key: 'total', label: 'Amount', render: r => <span className="font-mono font-medium">{formatCurrency(r.total)}</span> },
        { key: 'dueDate', label: 'Due Date', render: r => formatDate(r.dueDate) },
        { key: 'status', label: 'Status', render: r => <Badge type="invoice" status={r.status} /> },
        {
            key: 'actions', label: 'Actions', render: r => (
                <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/billing/${r._id}`)} className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="View"><Eye size={14} /></button>
                    <button onClick={() => handleDownload(r)} className="p-1.5 rounded text-slate-400 hover:text-secondary hover:bg-secondary/10 transition-colors" title="Download PDF"><Download size={14} /></button>
                    {can('billing', 'write') && r.status === 'draft' && (
                        <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors" title="Delete"><Trash2 size={14} /></button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Invoices"
                subtitle="Manage sales and purchase invoices"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices' }]}
                actions={can('billing', 'write') && (
                    <Button icon={Plus} onClick={() => navigate('/billing/new')}>New Invoice</Button>
                )}
            />

            <div className="flex flex-col sm:flex-row gap-3">
                <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by invoice number..." className="flex-1" />
                <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[140px]">
                    <option value="">All Types</option>
                    <option value="sales">Sales</option>
                    <option value="purchase">Purchase</option>
                </select>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[160px]">
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="partially_paid">Partial</option>
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                <Table columns={columns} data={invoices} loading={loading} emptyMessage="No invoices found. Create your first invoice." />
                <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={10} onPageChange={setPage} />
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title="Delete Invoice"
                message={`Delete invoice "${deleteTarget?.invoiceNo}"? This cannot be undone.`}
                confirmLabel="Delete Invoice"
            />
        </div>
    );
};

export default InvoiceList;