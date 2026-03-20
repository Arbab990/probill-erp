import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, GitMerge } from 'lucide-react';
import { purchaseService } from '../../services/purchaseService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Table from '../../components/common/Table.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const PO_STATUS_COLORS = {
    draft: 'badge-muted', sent: 'badge-info', acknowledged: 'badge-primary',
    partially_received: 'badge-warning', received: 'badge-success',
    invoiced: 'badge-success', closed: 'badge-muted', cancelled: 'badge-danger',
};

const MATCH_COLORS = { pending: 'badge-muted', matched: 'badge-success', discrepancy: 'badge-danger' };

const POList = () => {
    const navigate = useNavigate();
    const [pos, setPOs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [statusFilter, setStatusFilter] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await purchaseService.getPurchaseOrders({ page, limit: 10, status: statusFilter });
            setPOs(res.data.data);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load purchase orders'); }
        finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        { key: 'poNumber', label: 'PO Number', render: r => <span className="font-mono text-primary-light text-sm">{r.poNumber}</span> },
        {
            key: 'vendor', label: 'Vendor', render: r => (
                <div>
                    <p className="font-medium text-slate-200">{r.vendor?.name || '—'}</p>
                    <p className="text-xs text-slate-500">{r.vendor?.email || ''}</p>
                </div>
            )
        },
        { key: 'pr', label: 'From PR', render: r => r.pr ? <span className="font-mono text-xs text-slate-400">{r.pr.prNumber}</span> : <span className="text-slate-600">Direct</span> },
        { key: 'totalAmount', label: 'Amount', render: r => <span className="font-mono font-medium">{formatCurrency(r.totalAmount)}</span> },
        { key: 'deliveryDate', label: 'Delivery', render: r => formatDate(r.deliveryDate) },
        { key: 'status', label: 'Status', render: r => <Badge type="custom" status={PO_STATUS_COLORS[r.status] || 'badge-muted'} label={r.status.replace(/_/g, ' ')} /> },
        { key: 'threeWayMatchStatus', label: '3-Way Match', render: r => <Badge type="custom" status={MATCH_COLORS[r.threeWayMatchStatus] || 'badge-muted'} label={r.threeWayMatchStatus} /> },
        {
            key: 'actions', label: 'Actions', render: r => (
                <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/purchase/orders/${r._id}`)} className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="View"><Eye size={14} /></button>
                    {['sent', 'acknowledged', 'partially_received'].includes(r.status) && (
                        <button onClick={() => navigate(`/purchase/grn/new?poId=${r._id}`)} className="p-1.5 rounded text-slate-400 hover:text-success hover:bg-success/10 transition-colors" title="Create GRN"><GitMerge size={14} /></button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Purchase Orders"
                subtitle="Manage POs sent to vendors"
                breadcrumbs={[{ label: 'Procure to Pay', href: '/purchase' }, { label: 'Purchase Orders' }]}
                actions={<Button icon={Plus} onClick={() => navigate('/purchase/orders/new')}>New PO</Button>}
            />

            <div className="flex gap-3">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[180px]">
                    <option value="">All Statuses</option>
                    {['draft', 'sent', 'acknowledged', 'partially_received', 'received', 'invoiced', 'closed', 'cancelled'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                <Table columns={columns} data={pos} loading={loading} emptyMessage="No purchase orders found." />
                <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={10} onPageChange={setPage} />
            </div>
        </div>
    );
};

export default POList;