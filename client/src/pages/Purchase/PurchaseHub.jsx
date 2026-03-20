import { useNavigate } from 'react-router-dom';
import { FileCheck, ShoppingCart, Package, GitMerge, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader.jsx';

const MODULES = [
    { title: 'Purchase Requisitions', sub: 'Request → Approve → Convert to PO', icon: FileCheck, path: '/purchase/requisitions', color: 'text-primary-light', bg: 'bg-primary/10', border: 'border-primary/20' },
    { title: 'Purchase Orders', sub: 'Create POs → Send to Vendors → Track', icon: ShoppingCart, path: '/purchase/orders', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    { title: 'Goods Receipts', sub: 'Record deliveries and verify quantities', icon: Package, path: '/purchase/grn', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
];

const PurchaseHub = () => {
    const navigate = useNavigate();
    return (
        <div className="page-container">
            <PageHeader
                title="Procure to Pay"
                subtitle="End-to-end procurement — from requisition to payment"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Procure to Pay' }]}
            />

            {/* P2P Flow diagram */}
            <div className="card bg-gradient-to-r from-dark-card to-dark-bg border border-dark-border">
                <p className="text-xs text-slate-500 font-body uppercase tracking-wider mb-3">P2P Workflow</p>
                <div className="flex items-center gap-2 flex-wrap">
                    {['Purchase Requisition', 'Approval', 'Purchase Order', 'Goods Receipt', '3-Way Match', 'Payment'].map((step, i, arr) => (
                        <div key={step} className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg">
                                <span className="text-xs font-mono text-primary-light">{i + 1}</span>
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

export default PurchaseHub;