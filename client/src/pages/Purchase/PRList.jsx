import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, CheckCircle, XCircle, Send, GitBranch } from 'lucide-react';
import { purchaseService } from '../../services/purchaseService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Table from '../../components/common/Table.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Modal from '../../components/common/Modal.jsx';
import usePermission from '../../hooks/usePermission.js';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const PR_STATUS_COLORS = {
    draft: 'badge-muted', submitted: 'badge-info', approved: 'badge-success',
    rejected: 'badge-danger', converted: 'badge-primary',
};

const PRList = () => {
    const navigate = useNavigate();
    const { can, isSuperAdmin, isFinanceManager, isProcurementOfficer } = usePermission();
    const canApprove = isSuperAdmin || isFinanceManager || isProcurementOfficer;

    const [prs, setPRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [statusFilter, setStatusFilter] = useState('');
    const [rejectModal, setRejectModal] = useState({ open: false, pr: null });
    const [rejectReason, setRejectReason] = useState('');
    const [acting, setActing] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await purchaseService.getRequisitions({ page, limit: 10, status: statusFilter });
            setPRs(res.data.data);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load requisitions'); }
        finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleSubmit = async (id) => {
        setActing(true);
        try {
            await purchaseService.submitRequisition(id);
            toast.success('PR submitted for approval');
            fetch();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setActing(false); }
    };

    const handleApprove = async (id) => {
        setActing(true);
        try {
            await purchaseService.approveRequisition(id);
            toast.success('PR approved');
            fetch();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setActing(false); }
    };

    const handleReject = async () => {
        setActing(true);
        try {
            await purchaseService.rejectRequisition(rejectModal.pr._id, rejectReason);
            toast.success('PR rejected');
            setRejectModal({ open: false, pr: null });
            setRejectReason('');
            fetch();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setActing(false); }
    };

    const columns = [
        { key: 'prNumber', label: 'PR Number', render: r => <span className="font-mono text-primary-light text-sm">{r.prNumber}</span> },
        { key: 'requestedBy', label: 'Requested By', render: r => r.requestedBy?.name || '—' },
        { key: 'department', label: 'Department', render: r => r.department || '—' },
        { key: 'items', label: 'Items', render: r => `${r.items?.length || 0} items` },
        { key: 'totalEstimated', label: 'Estimated', render: r => <span className="font-mono">{formatCurrency(r.totalEstimated)}</span> },
        { key: 'status', label: 'Status', render: r => <Badge type="custom" status={PR_STATUS_COLORS[r.status] || 'badge-muted'} label={r.status.replace(/_/g, ' ')} /> },
        { key: 'createdAt', label: 'Date', render: r => formatDate(r.createdAt) },
        {
            key: 'actions', label: 'Actions', render: r => (
                <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/purchase/requisitions/${r._id}`)} className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="View"><Eye size={14} /></button>
                    {r.status === 'draft' && (
                        <button onClick={() => handleSubmit(r._id)} disabled={acting} className="p-1.5 rounded text-slate-400 hover:text-secondary hover:bg-secondary/10 transition-colors" title="Submit for Approval"><Send size={14} /></button>
                    )}
                    {r.status === 'submitted' && canApprove && (
                        <>
                            <button onClick={() => handleApprove(r._id)} disabled={acting} className="p-1.5 rounded text-slate-400 hover:text-success hover:bg-success/10 transition-colors" title="Approve"><CheckCircle size={14} /></button>
                            <button onClick={() => setRejectModal({ open: true, pr: r })} className="p-1.5 rounded text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors" title="Reject"><XCircle size={14} /></button>
                        </>
                    )}
                    {r.status === 'approved' && can('purchase', 'write') && (
                        <button onClick={() => navigate(`/purchase/orders/new?prId=${r._id}`)} className="p-1.5 rounded text-slate-400 hover:text-warning hover:bg-warning/10 transition-colors" title="Convert to PO"><GitBranch size={14} /></button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Purchase Requisitions"
                subtitle="Request and approve internal purchase needs"
                breadcrumbs={[{ label: 'Procure to Pay', href: '/purchase' }, { label: 'Requisitions' }]}
                actions={<Button icon={Plus} onClick={() => navigate('/purchase/requisitions/new')}>New PR</Button>}
            />

            <div className="flex gap-3">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[160px]">
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="converted">Converted</option>
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                <Table columns={columns} data={prs} loading={loading} emptyMessage="No purchase requisitions found." />
                <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={10} onPageChange={setPage} />
            </div>

            {/* Reject Modal */}
            <Modal isOpen={rejectModal.open} onClose={() => setRejectModal({ open: false, pr: null })} title="Reject Requisition" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-slate-400 font-body">Please provide a reason for rejecting <span className="text-slate-200 font-medium">{rejectModal.pr?.prNumber}</span>.</p>
                    <div>
                        <label className="input-label">Rejection Reason</label>
                        <textarea className="input-field" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Budget exceeded for this quarter..." />
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => setRejectModal({ open: false, pr: null })}>Cancel</Button>
                        <Button variant="danger" className="flex-1" loading={acting} onClick={handleReject}>Reject PR</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PRList;