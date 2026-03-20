import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Eye, FileText } from 'lucide-react';
import { orderService } from '../../services/orderService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Table from '../../components/common/Table.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import usePermission from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const SO_STATUS_COLORS = {
    draft: 'badge-muted', confirmed: 'badge-info', processing: 'badge-primary',
    shipped: 'badge-warning', delivered: 'badge-success', invoiced: 'badge-success',
    paid: 'badge-success', cancelled: 'badge-danger',
};

const SalesOrderList = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { can } = usePermission();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const customerId = searchParams.get('customerId');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await orderService.getSalesOrders({ page, limit: 10, status: statusFilter, customerId: customerId || '' });
            setOrders(res.data.data);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load sales orders'); }
        finally { setLoading(false); }
    }, [page, statusFilter, customerId]);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        { key: 'soNumber', label: 'SO Number', render: r => <span className="font-mono text-success text-sm">{r.soNumber}</span> },
        {
            key: 'customer', label: 'Customer', render: r => (
                <div>
                    <p className="font-medium text-slate-200">{r.customer?.name || '—'}</p>
                    <p className="text-xs text-slate-500">{r.customer?.email || ''}</p>
                </div>
            )
        },
        { key: 'totalAmount', label: 'Amount', render: r => <span className="font-mono font-medium">{formatCurrency(r.totalAmount)}</span> },
        { key: 'deliveryDate', label: 'Delivery', render: r => formatDate(r.deliveryDate) },
        { key: 'status', label: 'Status', render: r => <Badge type="custom" status={SO_STATUS_COLORS[r.status] || 'badge-muted'} label={r.status.replace(/_/g, ' ')} /> },
        { key: 'createdAt', label: 'Created', render: r => formatDate(r.createdAt) },
        {
            key: 'actions', label: 'Actions', render: r => (
                <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/orders/sales/${r._id}`)} className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="View"><Eye size={14} /></button>
                </div>
            )
        },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Sales Orders"
                subtitle="Track orders from creation to delivery"
                breadcrumbs={[{ label: 'Order to Cash', href: '/orders' }, { label: 'Sales Orders' }]}
                actions={can('orders', 'write') && (
                    <Button icon={Plus} onClick={() => navigate('/orders/sales/new')}>New Order</Button>
                )}
            />

            <div className="flex gap-3">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[180px]">
                    <option value="">All Statuses</option>
                    {['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'invoiced', 'paid', 'cancelled'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                <Table columns={columns} data={orders} loading={loading} emptyMessage="No sales orders found." />
                <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={10} onPageChange={setPage} />
            </div>
        </div>
    );
};

export default SalesOrderList;