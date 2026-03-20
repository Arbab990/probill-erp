import { useNavigate } from 'react-router-dom';
import { Users, ShoppingBag, BarChart2, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader.jsx';

const MODULES = [
    { title: 'Customers', sub: 'Manage customer profiles and credit limits', icon: Users, path: '/orders/customers', color: 'text-primary-light', bg: 'bg-primary/10', border: 'border-primary/20' },
    { title: 'Sales Orders', sub: 'Create and track orders through fulfillment', icon: ShoppingBag, path: '/orders/sales', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    { title: 'AR Aging', sub: 'Track outstanding receivables by age bucket', icon: BarChart2, path: '/orders/ar-aging', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
];

const OrderHub = () => {
    const navigate = useNavigate();
    return (
        <div className="page-container">
            <PageHeader
                title="Order to Cash"
                subtitle="End-to-end sales — from order creation to payment collection"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Order to Cash' }]}
            />

            {/* O2C Flow */}
            <div className="card bg-gradient-to-r from-dark-card to-dark-bg border border-dark-border">
                <p className="text-xs text-slate-500 font-body uppercase tracking-wider mb-3">O2C Workflow</p>
                <div className="flex items-center gap-2 flex-wrap">
                    {['Customer', 'Sales Order', 'Confirm', 'Ship', 'Deliver', 'Invoice', 'Collect Payment'].map((step, i, arr) => (
                        <div key={step} className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg">
                                <span className="text-xs font-mono text-success">{i + 1}</span>
                                <span className="text-xs text-slate-300 font-body">{step}</span>
                            </div>
                            {i < arr.length - 1 && <ArrowRight size={14} className="text-slate-600 flex-shrink-0" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {MODULES.map(mod => {
                    const Icon = mod.icon;
                    return (
                        <button
                            key={mod.path}
                            onClick={() => navigate(mod.path)}
                            className={`card text-left border ${mod.border} hover:shadow-glow-sm transition-all duration-200 group`}
                        >
                            <div className={`w-12 h-12 ${mod.bg} border ${mod.border} rounded-xl flex items-center justify-center mb-4`}>
                                <Icon size={22} className={mod.color} />
                            </div>
                            <h3 className={`font-display font-bold text-base ${mod.color} mb-1`}>{mod.title}</h3>
                            <p className="text-sm text-slate-400 font-body">{mod.sub}</p>
                            <div className="flex items-center gap-1 mt-4 text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                                Open <ArrowRight size={12} />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default OrderHub;