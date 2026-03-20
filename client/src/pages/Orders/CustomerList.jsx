import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { orderService } from '../../services/orderService.js';
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

const CUSTOMER_STATUS_COLORS = {
    active: 'badge-success',
    inactive: 'badge-muted',
    blocked: 'badge-danger',
};

const CustomerList = () => {
    const navigate = useNavigate();
    const { can } = usePermission();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await orderService.getCustomers({ page, limit: 10, search, status: statusFilter });
            setCustomers(res.data.data);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load customers'); }
        finally { setLoading(false); }
    }, [page, search, statusFilter]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await orderService.deleteCustomer(deleteTarget._id);
            toast.success('Customer deleted');
            setDeleteTarget(null);
            fetch();
        } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
        finally { setDeleting(false); }
    };

    const columns = [
        { key: 'customerCode', label: 'Code', width: '110px', render: r => <span className="font-mono text-xs text-slate-400">{r.customerCode}</span> },
        {
            key: 'name', label: 'Customer', render: r => (
                <div>
                    <p className="font-medium text-slate-200">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.email || '—'}</p>
                </div>
            )
        },
        { key: 'creditLimit', label: 'Credit Limit', render: r => <span className="font-mono">{formatCurrency(r.creditLimit)}</span> },
        {
            key: 'outstandingBalance', label: 'Outstanding', render: r => (
                <span className={`font-mono font-medium ${r.outstandingBalance > 0 ? 'text-warning' : 'text-slate-400'}`}>
                    {formatCurrency(r.outstandingBalance)}
                </span>
            )
        },
        { key: 'paymentTerms', label: 'Terms', render: r => `Net ${r.paymentTerms} days` },
        { key: 'status', label: 'Status', render: r => <Badge type="custom" status={CUSTOMER_STATUS_COLORS[r.status] || 'badge-muted'} label={r.status} /> },
        {
            key: 'actions', label: 'Actions', render: r => (
                <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/orders/customers/${r._id}`)} className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="View"><Eye size={14} /></button>
                    {can('orders', 'write') && (
                        <button onClick={() => navigate(`/orders/customers/${r._id}/edit`)} className="p-1.5 rounded text-slate-400 hover:text-warning hover:bg-warning/10 transition-colors" title="Edit"><Pencil size={14} /></button>
                    )}
                    {can('orders', 'write') && (
                        <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors" title="Delete"><Trash2 size={14} /></button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Customers"
                subtitle="Manage your customer accounts"
                breadcrumbs={[{ label: 'Order to Cash', href: '/orders' }, { label: 'Customers' }]}
                actions={can('orders', 'write') && (
                    <Button icon={Plus} onClick={() => navigate('/orders/customers/new')}>Add Customer</Button>
                )}
            />

            <div className="flex flex-col sm:flex-row gap-3">
                <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search customers..." className="flex-1" />
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[150px]">
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                <Table columns={columns} data={customers} loading={loading} emptyMessage="No customers found. Add your first customer." />
                <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={10} onPageChange={setPage} />
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title="Delete Customer"
                message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
                confirmLabel="Delete Customer"
            />
        </div>
    );
};

export default CustomerList;