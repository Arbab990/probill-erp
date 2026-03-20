import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ShieldCheck, XCircle, Zap, Download, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { paymentService } from '../../services/paymentService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Modal from '../../components/common/Modal.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import usePermission from '../../hooks/usePermission.js';
import toast from 'react-hot-toast';

const RUN_STATUS_COLORS = {
    draft: 'badge-muted', submitted: 'badge-info', approved: 'badge-primary',
    executing: 'badge-warning', completed: 'badge-success',
    rejected: 'badge-danger', cancelled: 'badge-muted',
};

const ENTRY_STATUS_ICONS = {
    pending: <Clock size={14} className="text-slate-400" />,
    processed: <CheckCircle size={14} className="text-success" />,
    failed: <AlertCircle size={14} className="text-danger" />,
    skipped: <XCircle size={14} className="text-slate-500" />,
};

const PaymentRunDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isSuperAdmin, isFinanceManager } = usePermission();
    const canApprove = isSuperAdmin || isFinanceManager;

    const [run, setRun] = useState(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);
    const [rejectModal, setRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [executeModal, setExecuteModal] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const fetchRun = async () => {
        try {
            const res = await paymentService.getRun(id);
            setRun(res.data.data);
        } catch { toast.error('Payment run not found'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRun(); }, [id]);

    const handleSubmit = async () => {
        setActing(true);
        try {
            await paymentService.submitRun(id);
            toast.success('Submitted for approval');
            fetchRun();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setActing(false); }
    };

    const handleApprove = async () => {
        setActing(true);
        try {
            await paymentService.approveRun(id);
            toast.success('Payment run approved');
            fetchRun();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setActing(false); }
    };

    const handleReject = async () => {
        setActing(true);
        try {
            await paymentService.rejectRun(id, rejectReason);
            toast.success('Payment run rejected');
            setRejectModal(false);
            fetchRun();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setActing(false); }
    };

    const handleExecute = async () => {
        setActing(true);
        setExecuteModal(false);
        try {
            const res = await paymentService.executeRun(id);
            toast.success(res.data.message);
            fetchRun();
        } catch (err) { toast.error(err.response?.data?.error || 'Execution failed'); }
        finally { setActing(false); }
    };

    const handleExport = async () => {
        setDownloading(true);
        try {
            const res = await paymentService.exportCSV(id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${run.runNumber}-bank-export.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('CSV exported');
        } catch { toast.error('Export failed'); }
        finally { setDownloading(false); }
    };

    if (loading) return <div className="page-container"><PageLoader /></div>;
    if (!run) return <div className="page-container"><p className="text-slate-400">Payment run not found.</p></div>;

    const processed = run.entries?.filter(e => e.status === 'processed').length || 0;
    const failed = run.entries?.filter(e => e.status === 'failed').length || 0;

    return (
        <div className="page-container">
            <PageHeader
                title={run.runNumber}
                subtitle={run.name}
                breadcrumbs={[{ label: 'Payment Runs', href: '/payments/runs' }, { label: run.runNumber }]}
                actions={
                    <div className="flex gap-2 flex-wrap">
                        {run.status === 'draft' && canApprove && (
                            <Button icon={Send} loading={acting} onClick={handleSubmit}>Submit for Approval</Button>
                        )}
                        {run.status === 'submitted' && canApprove && (
                            <>
                                <Button variant="success" icon={ShieldCheck} loading={acting} onClick={handleApprove}>Approve</Button>
                                <Button variant="danger" icon={XCircle} onClick={() => setRejectModal(true)}>Reject</Button>
                            </>
                        )}
                        {run.status === 'approved' && canApprove && (
                            <Button variant="success" icon={Zap} loading={acting} onClick={() => setExecuteModal(true)}>Execute Payments</Button>
                        )}
                        {['approved', 'completed'].includes(run.status) && (
                            <Button variant="secondary" icon={Download} loading={downloading} onClick={handleExport}>Bank Export CSV</Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    {/* Run summary */}
                    <Card>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Run Number</p>
                                <p className="font-mono font-bold text-xl text-primary-light">{run.runNumber}</p>
                                <p className="text-sm text-slate-400 mt-1">{run.name}</p>
                            </div>
                            <Badge type="custom" status={RUN_STATUS_COLORS[run.status] || 'badge-muted'} label={run.status} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><p className="text-slate-500 text-xs mb-1">Payment Method</p><p className="text-slate-200 uppercase font-mono">{run.paymentMethod}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Scheduled</p><p className="text-slate-200">{formatDate(run.scheduledDate)}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Created By</p><p className="text-slate-200">{run.createdBy?.name}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Invoices</p><p className="text-slate-200 font-mono">{run.entryCount}</p></div>
                        </div>
                        {run.rejectionReason && (
                            <div className="mt-3 pt-3 border-t border-dark-border">
                                <p className="text-xs text-danger">Rejection reason: <span className="text-slate-300">{run.rejectionReason}</span></p>
                            </div>
                        )}
                    </Card>

                    {/* Entries table */}
                    <Card className="p-0 overflow-hidden">
                        <div className="px-5 py-4 border-b border-dark-border">
                            <h3 className="font-display font-semibold text-slate-100">Payment Entries</h3>
                            {run.status === 'completed' && (
                                <p className="text-xs text-slate-500 font-body mt-0.5">{processed} processed · {failed} failed</p>
                            )}
                        </div>
                        <table className="table-base">
                            <thead><tr>
                                <th>Invoice</th>
                                <th>Party</th>
                                <th>Bank / IFSC</th>
                                <th className="text-right">Amount</th>
                                <th className="text-right">Discount</th>
                                <th>Reference</th>
                                <th>Status</th>
                            </tr></thead>
                            <tbody>
                                {run.entries?.map((entry, i) => (
                                    <tr key={i}>
                                        <td><span className="font-mono text-xs text-primary-light">{entry.invoice?.invoiceNo || '—'}</span></td>
                                        <td>
                                            <p className="font-medium text-slate-200 text-sm">{entry.vendor?.name || entry.customer?.name || '—'}</p>
                                        </td>
                                        <td>
                                            <p className="text-xs text-slate-400 font-mono">
                                                {entry.vendor?.bankDetails?.bankName || '—'}
                                                {entry.vendor?.bankDetails?.ifsc && ` · ${entry.vendor.bankDetails.ifsc}`}
                                            </p>
                                        </td>
                                        <td className="text-right font-mono font-bold text-warning">{formatCurrency(entry.amount)}</td>
                                        <td className="text-right font-mono text-xs text-success">
                                            {entry.discountAmount > 0 ? `-${formatCurrency(entry.discountAmount)}` : '—'}
                                        </td>
                                        <td><span className="text-xs text-slate-500 font-mono">{entry.reference?.slice(0, 20)}...</span></td>
                                        <td>
                                            <div className="flex items-center gap-1.5">
                                                {ENTRY_STATUS_ICONS[entry.status] || null}
                                                <span className="text-xs capitalize text-slate-400">{entry.status}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-5">
                    {/* Total summary */}
                    {/* Proposal info — only show if proposal-based run */}
                    {run.proposalStatus && run.proposalStatus !== 'none' && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-3">Proposal Status</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Proposal</span>
                                    <Badge type="custom" status={
                                        run.proposalStatus === 'confirmed' ? 'badge-success' :
                                            run.proposalStatus === 'edited' ? 'badge-warning' : 'badge-info'
                                    } label={run.proposalStatus} />
                                </div>
                                {run.totalDiscount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Discounts Captured</span>
                                        <span className="font-mono text-success font-bold">-{formatCurrency(run.totalDiscount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Blocked Entries</span>
                                    <span className="font-mono text-danger">{run.blockedCount || 0}</span>
                                </div>
                                <div className="flex justify-between border-t border-dark-border pt-2">
                                    <span className="text-slate-300 font-medium">Net Payable</span>
                                    <span className="font-mono font-bold text-primary-light">{formatCurrency(run.netAmount || run.totalAmount)}</span>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* House Bank */}
                    {run.houseBank?.bankName && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-3">House Bank</h3>
                            <div className="space-y-1.5 text-sm">
                                <p className="font-medium text-slate-200">{run.houseBank.bankName}</p>
                                <p className="text-slate-400 font-mono">{run.houseBank.accountNo}</p>
                                <p className="text-slate-500 text-xs">{run.houseBank.ifsc} · {run.houseBank.branch}</p>
                            </div>
                        </Card>
                    )}
                    <Card>
                        <h3 className="font-display font-semibold text-slate-100 mb-3">Summary</h3>
                        <div className="space-y-2.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Total Entries</span>
                                <span className="font-mono text-slate-200">{run.entryCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 text-sm">Total Amount</span>
                                <span className="font-mono font-bold text-xl text-warning">{formatCurrency(run.totalAmount)}</span>
                            </div>
                            {run.status === 'completed' && (
                                <>
                                    <div className="border-t border-dark-border pt-2 flex justify-between text-sm">
                                        <span className="text-slate-400">Processed</span>
                                        <span className="font-mono text-success">{processed}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Failed</span>
                                        <span className="font-mono text-danger">{failed}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    {/* Approval trail */}
                    <Card>
                        <h3 className="font-display font-semibold text-slate-100 mb-3">Approval Trail</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Created', user: run.createdBy?.name, date: run.createdAt, done: true },
                                { label: 'Submitted', user: run.submittedBy?.name, date: run.submittedAt, done: !!run.submittedAt },
                                { label: 'Approved', user: run.approvedBy?.name, date: run.approvedAt, done: !!run.approvedAt },
                                { label: 'Executed', user: run.executedBy?.name, date: run.executedAt, done: !!run.executedAt },
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center mt-0.5 ${step.done ? 'bg-success/20 border-success/40' : 'bg-dark-hover border-dark-border'}`}>
                                        {step.done && <CheckCircle size={11} className="text-success" />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${step.done ? 'text-slate-200' : 'text-slate-600'}`}>{step.label}</p>
                                        {step.done && (
                                            <p className="text-xs text-slate-500">{step.user || '—'} · {formatDate(step.date)}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {run.notes && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-2">Notes</h3>
                            <p className="text-sm text-slate-400 font-body leading-relaxed">{run.notes}</p>
                        </Card>
                    )}
                    {/* Audit Log */}
                    {run.auditLog?.length > 0 && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-3">Audit Log</h3>
                            <div className="space-y-2.5 max-h-64 overflow-y-auto">
                                {[...run.auditLog].reverse().map((log, i) => (
                                    <div key={i} className="border-b border-dark-border/50 pb-2 last:border-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-mono text-primary-light">{log.action}</span>
                                            <span className="text-[10px] text-slate-600">{formatDate(log.at)}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">{log.performedBy?.name || '—'}</p>
                                        {log.detail && <p className="text-[11px] text-slate-500 mt-0.5">{log.detail}</p>}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Payment Run" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-slate-400 font-body">Please provide a reason for rejecting <span className="text-slate-200 font-medium">{run.runNumber}</span>.</p>
                    <div>
                        <label className="input-label">Rejection Reason</label>
                        <textarea className="input-field" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Insufficient funds, requires re-approval..." />
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => setRejectModal(false)}>Cancel</Button>
                        <Button variant="danger" className="flex-1" loading={acting} onClick={handleReject}>Reject Run</Button>
                    </div>
                </div>
            </Modal>

            {/* Execute Confirmation Modal */}
            <Modal isOpen={executeModal} onClose={() => setExecuteModal(false)} title="Execute Payment Run" size="sm">
                <div className="space-y-4 text-center">
                    <div className="w-14 h-14 bg-warning/10 border border-warning/20 rounded-full flex items-center justify-center mx-auto">
                        <Zap size={26} className="text-warning" />
                    </div>
                    <div>
                        <p className="text-slate-200 font-medium">Execute {run.runNumber}?</p>
                        <p className="text-sm text-slate-400 font-body mt-1">
                            This will process payments for <span className="text-warning font-mono font-bold">{formatCurrency(run.totalAmount)}</span> across {run.entryCount} invoices. This action cannot be undone.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => setExecuteModal(false)}>Cancel</Button>
                        <Button variant="success" className="flex-1" icon={Zap} onClick={handleExecute}>Execute Now</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PaymentRunDetail;