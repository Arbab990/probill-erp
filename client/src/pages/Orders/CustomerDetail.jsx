import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, ShoppingBag, Users } from 'lucide-react';
import { orderService } from '../../services/orderService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import usePermission from '../../hooks/usePermission.js';
import toast from 'react-hot-toast';

const CUSTOMER_STATUS_COLORS = {
    active: 'badge-success', inactive: 'badge-muted', blocked: 'badge-danger',
};

const InfoRow = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs text-slate-500 font-body">{label}</span>
        <span className="text-sm text-slate-200 font-body">{value || '—'}</span>
    </div>
);

const CustomerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = usePermission();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        orderService.getCustomer(id)
            .then(res => setCustomer(res.data.data))
            .catch(() => toast.error('Customer not found'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="page-container"><PageLoader /></div>;
    if (!customer) return <div className="page-container"><p className="text-slate-400">Customer not found.</p></div>;

    const creditUsedPct = customer.creditLimit > 0
        ? Math.min(100, (customer.outstandingBalance / customer.creditLimit) * 100)
        : 0;

    return (
        <div className="page-container">
            <PageHeader
                title={customer.name}
                subtitle={`${customer.customerCode} · Net ${customer.paymentTerms} days`}
                breadcrumbs={[{ label: 'Customers', href: '/orders/customers' }, { label: customer.name }]}
                actions={
                    <div className="flex gap-2">
                        {can('orders', 'write') && (
                            <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/orders/customers/${id}/edit`)}>Edit</Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    <Card>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-success/10 border border-success/20 rounded-xl flex items-center justify-center">
                                    <Users size={22} className="text-success" />
                                </div>
                                <div>
                                    <h2 className="font-display font-bold text-lg text-slate-100">{customer.name}</h2>
                                    <p className="text-sm text-slate-400">{customer.customerCode}</p>
                                </div>
                            </div>
                            <Badge type="custom" status={CUSTOMER_STATUS_COLORS[customer.status] || 'badge-muted'} label={customer.status} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <InfoRow label="Email" value={customer.email} />
                            <InfoRow label="Phone" value={customer.phone} />
                            <InfoRow label="GSTIN" value={customer.gstin} />
                            <InfoRow label="PAN" value={customer.pan} />
                            <InfoRow label="Payment Terms" value={`Net ${customer.paymentTerms} days`} />
                            <InfoRow label="Late Payments" value={customer.latePaymentCount || 0} />
                            <InfoRow label="Added On" value={formatDate(customer.createdAt)} />
                        </div>
                    </Card>

                    {/* Credit utilization */}
                    <Card>
                        <h3 className="font-display font-semibold text-slate-100 mb-4">Credit Status</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-3 bg-dark-bg rounded-lg border border-dark-border">
                                <p className="text-xs text-slate-500 mb-1">Credit Limit</p>
                                <p className="font-mono font-bold text-slate-200">{formatCurrency(customer.creditLimit)}</p>
                            </div>
                            <div className="text-center p-3 bg-dark-bg rounded-lg border border-dark-border">
                                <p className="text-xs text-slate-500 mb-1">Outstanding</p>
                                <p className={`font-mono font-bold ${customer.outstandingBalance > 0 ? 'text-warning' : 'text-success'}`}>
                                    {formatCurrency(customer.outstandingBalance)}
                                </p>
                            </div>
                            <div className="text-center p-3 bg-dark-bg rounded-lg border border-dark-border">
                                <p className="text-xs text-slate-500 mb-1">Available</p>
                                <p className="font-mono font-bold text-success">
                                    {formatCurrency(Math.max(0, customer.creditLimit - customer.outstandingBalance))}
                                </p>
                            </div>
                        </div>

                        {/* Credit bar */}
                        {customer.creditLimit > 0 && (
                            <div>
                                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                    <span>Credit Used</span>
                                    <span>{creditUsedPct.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2 bg-dark-bg rounded-full border border-dark-border overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${creditUsedPct > 80 ? 'bg-danger' : creditUsedPct > 60 ? 'bg-warning' : 'bg-success'
                                            }`}
                                        style={{ width: `${creditUsedPct}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Address */}
                    {customer.address?.city && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-2">Address</h3>
                            <p className="text-sm text-slate-300 font-body">
                                {[customer.address.street, customer.address.city, customer.address.state, customer.address.pincode].filter(Boolean).join(', ')}
                            </p>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-5">
                    {customer.notes && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-2">Notes</h3>
                            <p className="text-sm text-slate-400 font-body leading-relaxed">{customer.notes}</p>
                        </Card>
                    )}
                    <Card>
                        <h3 className="font-display font-semibold text-slate-100 mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                            <Button variant="secondary" className="w-full" icon={ShoppingBag} onClick={() => navigate(`/orders/sales/new?customerId=${id}`)}>
                                New Sales Order
                            </Button>
                            <Button variant="secondary" className="w-full" onClick={() => navigate(`/orders/sales?customerId=${id}`)}>
                                View Orders
                            </Button>
                            <Button variant="secondary" className="w-full" onClick={() => navigate('/orders/ar-aging')}>
                                AR Aging Report
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CustomerDetail;