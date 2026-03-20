import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { paymentService } from '../../services/paymentService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Table from '../../components/common/Table.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import usePermission from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const RUN_STATUS_COLORS = {
    draft: 'badge-muted', submitted: 'badge-info', approved: 'badge-primary',
    executing: 'badge-warning', completed: 'badge-success',
    rejected: 'badge-danger', cancelled: 'badge-muted',
};

const PaymentRunList = () => {
    const navigate = useNavigate();
    const { can } = usePermission();
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await paymentService.getRuns({ page, limit: 10, status: statusFilter });
            setRuns(res.data.data);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load payment runs'); }
        finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        { key: 'runNumber', label: 'Run #', render: r => <span className="font-mono text-primary-light text-sm">{r.runNumber}</span> },
        { key: 'name', label: 'Name', render: r => <p className="font-medium text-slate-200">{r.name}</p> },
        { key: 'paymentMethod', label: 'Method', render: r => <span className="uppercase text-xs font-mono text-slate-300">{r.paymentMethod}</span> },
        { key: 'entryCount', label: 'Invoices', render: r => <span className="font-mono">{r.entryCount}</span> },
        { key: 'totalAmount', label: 'Total', render: r => <span className="font-mono font-bold text-warning">{formatCurrency(r.totalAmount)}</span> },
        { key: 'scheduledDate', label: 'Scheduled', render: r => formatDate(r.scheduledDate) },
        { key: 'status', label: 'Status', render: r => <Badge type="custom" status={RUN_STATUS_COLORS[r.status] || 'badge-muted'} label={r.status} /> },
        { key: 'createdBy', label: 'Created By', render: r => r.createdBy?.name || '—' },
        {
            key: 'actions', label: 'Actions', render: r => (
                <button onClick={() => navigate(`/payments/runs/${r._id}`)} className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="View">
                    <Eye size={14} />
                </button>
            )
        },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Payment Runs"
                subtitle="Manage and track batch payment runs"
                breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Runs' }]}
                actions={can('payments', 'write') && (
                    <Button icon={Plus} onClick={() => navigate('/payments/new')}>New Run</Button>
                )}
            />

            <div className="flex gap-3">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[160px]">
                    <option value="">All Statuses</option>
                    {['draft', 'submitted', 'approved', 'executing', 'completed', 'rejected', 'cancelled'].map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                <Table columns={columns} data={runs} loading={loading} emptyMessage="No payment runs found. Create your first batch payment." />
                <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={10} onPageChange={setPage} />
            </div>
        </div>
    );
};

export default PaymentRunList;