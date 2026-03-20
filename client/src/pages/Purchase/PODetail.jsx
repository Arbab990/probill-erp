import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GitMerge, Send, CheckCircle, XCircle, Package } from 'lucide-react';
import { purchaseService } from '../../services/purchaseService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import usePermission from '../../hooks/usePermission.js';
import toast from 'react-hot-toast';

const PO_STATUS_COLORS = {
    draft: 'badge-muted', sent: 'badge-info', acknowledged: 'badge-primary',
    partially_received: 'badge-warning', received: 'badge-success',
    invoiced: 'badge-success', closed: 'badge-muted', cancelled: 'badge-danger',
};
const MATCH_COLORS = { pending: 'badge-muted', matched: 'badge-success', discrepancy: 'badge-danger' };

const PODetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = usePermission();
    const [po, setPO] = useState(null);
    const [loading, setLoading] = useState(true);
    const [match, setMatch] = useState(null);
    const [updating, setUpdating] = useState(false);

    const fetchPO = async () => {
        try {
            const res = await purchaseService.getPurchaseOrder(id);
            setPO(res.data.data);
            const matchRes = await purchaseService.getThreeWayMatch(id);
            setMatch(matchRes.data.data);
        } catch { toast.error('Failed to load PO'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPO(); }, [id]);

    const handleStatusUpdate = async (status) => {
        setUpdating(true);
        try {
            await purchaseService.updatePOStatus(id, status);
            toast.success(`PO status updated to ${status}`);
            fetchPO();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setUpdating(false); }
    };

    if (loading) return <div className="page-container"><PageLoader /></div>;
    if (!po) return <div className="page-container"><p className="text-slate-400">PO not found.</p></div>;

    return (
        <div className="page-container">
            <PageHeader
                title={po.poNumber}
                subtitle={`Purchase Order · ${po.vendor?.name}`}
                breadcrumbs={[{ label: 'Purchase Orders', href: '/purchase/orders' }, { label: po.poNumber }]}
                actions={
                    <div className="flex gap-2 flex-wrap">
                        {po.status === 'draft' && can('purchase', 'write') && (
                            <Button icon={Send} loading={updating} onClick={() => handleStatusUpdate('sent')}>Send to Vendor</Button>
                        )}
                        {po.status === 'sent' && can('purchase', 'write') && (
                            <Button variant="secondary" loading={updating} onClick={() => handleStatusUpdate('acknowledged')}>Mark Acknowledged</Button>
                        )}
                        {['sent', 'acknowledged', 'partially_received'].includes(po.status) && (
                            <Button variant="success" icon={Package} onClick={() => navigate(`/purchase/grn/new?poId=${id}`)}>Create GRN</Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    {/* PO Header */}
                    <Card>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">PO Number</p>
                                <p className="font-mono font-bold text-xl text-primary-light">{po.poNumber}</p>
                            </div>
                            <Badge type="custom" status={PO_STATUS_COLORS[po.status] || 'badge-muted'} label={po.status.replace(/_/g, ' ')} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><p className="text-slate-500 text-xs mb-1">Vendor</p><p className="text-slate-200 font-medium">{po.vendor?.name}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Delivery Date</p><p className="text-slate-200">{formatDate(po.deliveryDate)}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Payment Terms</p><p className="text-slate-200">Net {po.paymentTerms} days</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Created By</p><p className="text-slate-200">{po.createdBy?.name}</p></div>
                        </div>
                        {po.pr && (
                            <div className="mt-3 pt-3 border-t border-dark-border">
                                <p className="text-xs text-slate-500">Converted from PR: <span className="text-primary-light font-mono">{po.pr.prNumber}</span></p>
                            </div>
                        )}
                    </Card>

                    {/* Line Items */}
                    <Card className="p-0 overflow-hidden">
                        <div className="px-5 py-4 border-b border-dark-border">
                            <h3 className="font-display font-semibold text-slate-100">Order Items</h3>
                        </div>
                        <table className="table-base">
                            <thead><tr>
                                <th>Description</th>
                                <th className="text-right">Qty</th>
                                <th className="text-right">Unit Price</th>
                                <th className="text-right">Tax</th>
                                <th className="text-right">Total</th>
                            </tr></thead>
                            <tbody>
                                {po.items.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.description} <span className="text-xs text-slate-500">({item.unit})</span></td>
                                        <td className="text-right font-mono">{item.quantity}</td>
                                        <td className="text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                                        <td className="text-right font-mono">{item.taxRate}%</td>
                                        <td className="text-right font-mono font-medium text-slate-200">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-5 py-4 border-t border-dark-border flex justify-end">
                            <div className="w-56 space-y-1.5">
                                <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span className="font-mono">{formatCurrency(po.subtotal)}</span></div>
                                <div className="flex justify-between text-sm text-slate-400"><span>Tax</span><span className="font-mono">{formatCurrency(po.totalTax)}</span></div>
                                <div className="flex justify-between font-bold text-slate-100 border-t border-dark-border pt-2"><span>Total</span><span className="font-mono text-primary-light">{formatCurrency(po.totalAmount)}</span></div>
                            </div>
                        </div>
                    </Card>

                    {/* GRNs linked */}
                    {po.grnLinked?.length > 0 && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-3">Goods Receipts</h3>
                            <div className="space-y-2">
                                {po.grnLinked.map(grn => (
                                    <div key={grn._id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-dark-border/50">
                                        <span className="font-mono text-sm text-secondary">{grn.grnNumber}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400">{formatDate(grn.receivedDate)}</span>
                                            <Badge type="custom" status={grn.status === 'confirmed' ? 'badge-success' : grn.status === 'discrepancy' ? 'badge-danger' : 'badge-muted'} label={grn.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-5">
                    {/* 3-Way Match */}
                    {match && (
                        <Card>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-display font-semibold text-slate-100">3-Way Match</h3>
                                <Badge type="custom" status={MATCH_COLORS[match.status] || 'badge-muted'} label={match.status} />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">PO vs GRN (Qty)</span>
                                    {match.qtyMatch ? <CheckCircle size={16} className="text-success" /> : <XCircle size={16} className="text-danger" />}
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">PO vs Invoice (Amt)</span>
                                    {match.amountMatch ? <CheckCircle size={16} className="text-success" /> : <XCircle size={16} className="text-warning" />}
                                </div>
                                <div className="border-t border-dark-border pt-2 space-y-1 text-xs text-slate-500">
                                    <p>GRNs received: {match.grn.count}</p>
                                    <p>Qty ordered: {match.po.items} items</p>
                                    {match.invoice && <p>Invoice: <span className="text-primary-light font-mono">{match.invoice.number}</span></p>}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Vendor info */}
                    {po.vendor && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-3">Vendor</h3>
                            <div className="space-y-2 text-sm">
                                <p className="font-medium text-slate-200">{po.vendor.name}</p>
                                <p className="text-slate-400">{po.vendor.email}</p>
                                <p className="text-slate-400">{po.vendor.phone}</p>
                                {po.vendor.gstin && <p className="text-slate-500 text-xs font-mono">GSTIN: {po.vendor.gstin}</p>}
                            </div>
                            <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => navigate(`/vendors/${po.vendor._id}`)}>
                                View Vendor Profile
                            </Button>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PODetail;