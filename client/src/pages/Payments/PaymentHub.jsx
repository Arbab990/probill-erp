import { useNavigate } from 'react-router-dom';
import { Play, List, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader.jsx';

const MODULES = [
    { title: 'New Payment Run', sub: 'Select invoices and batch them for payment', icon: Play, path: '/payments/new', color: 'text-primary-light', bg: 'bg-primary/10', border: 'border-primary/20' },
    { title: 'Payment Runs', sub: 'View, approve and execute payment batches', icon: List, path: '/payments/runs', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
];

const PaymentHub = () => {
    const navigate = useNavigate();
    return (
        <div className="page-container">
            <PageHeader
                title="Payment Runs"
                subtitle="Batch payments with approval workflow and bank export"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payments' }]}
            />

            {/* Workflow */}
            <div className="card bg-gradient-to-r from-dark-card to-dark-bg border border-dark-border">
                <p className="text-xs text-slate-500 font-body uppercase tracking-wider mb-3">Payment Run Workflow</p>
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { step: '1', label: 'Select Invoices', icon: List },
                        { step: '2', label: 'Create Run', icon: Play },
                        { step: '3', label: 'Submit', icon: ArrowRight },
                        { step: '4', label: 'Approve', icon: ShieldCheck },
                        { step: '5', label: 'Execute', icon: Zap },
                    ].map((s, i, arr) => {
                        const Icon = s.icon;
                        return (
                            <div key={s.step} className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg">
                                    <span className="text-xs font-mono text-primary-light">{s.step}</span>
                                    <Icon size={12} className="text-slate-400" />
                                    <span className="text-xs text-slate-300 font-body">{s.label}</span>
                                </div>
                                {i < arr.length - 1 && <ArrowRight size={14} className="text-slate-600 flex-shrink-0" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

export default PaymentHub;