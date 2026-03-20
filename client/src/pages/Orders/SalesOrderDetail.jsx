import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Truck, Package } from 'lucide-react';
import { orderService } from '../../services/orderService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import usePermission from '../../hooks/usePermission.js';
import toast from 'react-hot-toast';

const SO_STATUS_COLORS = {
    draft: 'badge-muted', confirmed: 'badge-info', processing: 'badge-primary',
    shipped: 'badge-warning', delivered: 'badge-success',
    invoiced: 'badge-success', paid: 'badge-success', cancelled: 'badge-danger',
};

const FLOW = ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'invoiced', 'paid'];

const SalesOrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = usePermission();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const fetchOrder = async () => {
        try {
            const res = await orderService.getSalesOrder(id);
            setOrder(res.data.data);
        } catch { toast.error('Order not found'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrder(); }, [id]);

    const handleStatusUpdate = async (status) => {
        setUpdating(true);
        try {
            await orderService.updateSOStatus(id, status);
            toast.success(`Order updated to ${status}`);
            fetchOrder();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setUpdating(false); }
    };

    const handleCreateInvoice = async () => {
        setUpdating(true);
        try {
            const res = await orderService.createInvoiceFromSO(id);
            toast.success('Invoice created from this order');
            navigate(`/billing/${res.data.data._id}`);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create invoice'); }
        finally { setUpdating(false); }
    };

    if (loading) return <div className="page-container"><PageLoader /></div>;
    if (!order) return <div className="page-container"><p className="text-slate-400">Order not found.</p></div>;

    const currentStep = FLOW.indexOf(order.status);

    return (
        <div className="page-container">
            <PageHeader
                title={order.soNumber}
                subtitle={`Sales Order · ${order.customer?.name}`}
                breadcrumbs={[{ label: 'Sales Orders', href: '/orders/sales' }, { label: order.soNumber }]}
                actions={
                    <div className="flex gap-2 flex-wrap">
                        {order.status === 'draft' && can('orders', 'write') && (
                            <Button icon={CheckCircle} loading={updating} onClick={() => handleStatusUpdate('confirmed')}>Confirm Order</Button>
                        )}
                        {order.status === 'confirmed' && can('orders', 'write') && (
                            <Button variant="secondary" loading={updating} onClick={() => handleStatusUpdate('processing')}>Start Processing</Button>
                        )}
                        {order.status === 'processing' && can('orders', 'write') && (
                            <Button variant="secondary" icon={Truck} loading={updating} onClick={() => handleStatusUpdate('shipped')}>Mark Shipped</Button>
                        )}
                        {order.status === 'shipped' && can('orders', 'write') && (
                            <Button variant="secondary" icon={Package} loading={updating} onClick={() => handleStatusUpdate('delivered')}>Mark Delivered</Button>
                        )}
                        {order.status === 'delivered' && !order.invoiceLinked && can('orders', 'write') && (
                            <Button icon={FileText} loading={updating} onClick={handleCreateInvoice}>Generate Invoice</Button>
                        )}
                        {order.invoiceLinked && (
                            <Button variant="secondary" onClick={() => navigate(`/billing/${order.invoiceLinked._id}`)}>View Invoice</Button>
                        )}
                    </div>
                }
            />

            {/* Progress bar */}
            <Card>
                <p className="text-xs text-slate-500 font-body uppercase tracking-wider mb-4">Order Progress</p>
                <div className="flex items-center gap-0">
                    {FLOW.map((step, idx) => {
                        const done = idx <= currentStep;
                        const active = idx === currentStep;
                        return (
                            <div key={step} className="flex items-center flex-1">
                                <div className={`flex flex-col items-center gap-1 flex-1 ${idx < FLOW.length - 1 ? '' : ''}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${active ? 'bg-success border-2 border-success text-white shadow-glow-sm' :
                                            done ? 'bg-success/30 border border-success/50 text-success' :
                                                'bg-dark-hover border border-dark-border text-slate-500'
                                        }`}>
                                        {done && !active ? '✓' : idx + 1}
                                    </div>
                                    <p className={`text-[10px] font-body capitalize text-center ${active ? 'text-success font-semibold' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                                        {step}
                                    </p>
                                </div>
                                {idx < FLOW.length - 1 && (
                                    <div className={`h-0.5 flex-1 mb-5 transition-all ${idx < currentStep ? 'bg-success/40' : 'bg-dark-border'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    {/* Order header */}
                    <Card>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Order Number</p>
                                <p className="font-mono font-bold text-xl text-success">{order.soNumber}</p>
                            </div>
                            <Badge type="custom" status={SO_STATUS_COLORS[order.status] || 'badge-muted'} label={order.status.replace(/_/g, ' ')} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><p className="text-slate-500 text-xs mb-1">Customer</p><p className="text-slate-200 font-medium">{order.customer?.name}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Delivery Date</p><p className="text-slate-200">{formatDate(order.deliveryDate)}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Created</p><p className="text-slate-200">{formatDate(order.createdAt)}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Created By</p><p className="text-slate-200">{order.createdBy?.name}</p></div>
                        </div>
                        {order.deliveryAddress && (
                            <div className="mt-3 pt-3 border-t border-dark-border">
                                <p className="text-xs text-slate-500">Deliver to: <span className="text-slate-300">{order.deliveryAddress}</span></p>
                            </div>
                        )}
                    </Card>

                    {/* Line items */}
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
                                {order.items.map((item, i) => (
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
                                <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span className="font-mono">{formatCurrency(order.subtotal)}</span></div>
                                <div className="flex justify-between text-sm text-slate-400"><span>Tax</span><span className="font-mono">{formatCurrency(order.totalTax)}</span></div>
                                <div className="flex justify-between font-bold text-slate-100 border-t border-dark-border pt-2"><span>Total</span><span className="font-mono text-success">{formatCurrency(order.totalAmount)}</span></div>
                            </div>
                        </div>
                    </Card>

                    {order.notes && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-2">Notes</h3>
                            <p className="text-sm text-slate-400 font-body leading-relaxed">{order.notes}</p>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-5">
                    <Card>
                        <h3 className="font-display font-semibold text-slate-100 mb-3">Customer</h3>
                        <div className="space-y-1.5 text-sm">
                            <p className="font-medium text-slate-200">{order.customer?.name}</p>
                            <p className="text-slate-400">{order.customer?.email}</p>
                            <p className="text-slate-400">{order.customer?.phone}</p>
                            {order.customer?.gstin && <p className="text-xs text-slate-500 font-mono">GSTIN: {order.customer.gstin}</p>}
                        </div>
                        <div className="mt-3 pt-3 border-t border-dark-border space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Credit Limit</span>
                                <span className="font-mono text-slate-300">{formatCurrency(order.customer?.creditLimit)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Outstanding</span>
                                <span className="font-mono text-warning">{formatCurrency(order.customer?.outstandingBalance)}</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => navigate(`/orders/customers/${order.customer?._id}`)}>
                            View Customer Profile
                        </Button>
                    </Card>

                    {order.invoiceLinked && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-3">Linked Invoice</h3>
                            <div className="space-y-1.5 text-sm">
                                <p className="font-mono text-primary-light">{order.invoiceLinked.invoiceNo}</p>
                                <p className="font-mono font-bold text-slate-200">{formatCurrency(order.invoiceLinked.total)}</p>
                                <Badge type="invoice" status={order.invoiceLinked.status} />
                            </div>
                            <Button variant="secondary" size="sm" className="w-full mt-3" onClick={() => navigate(`/billing/${order.invoiceLinked._id}`)}>
                                View Invoice
                            </Button>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesOrderDetail;