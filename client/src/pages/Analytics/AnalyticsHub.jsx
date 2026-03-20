import { useNavigate } from 'react-router-dom';
import { TrendingUp, DollarSign, Users, Package, Download, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader.jsx';

const MODULES = [
    { title: 'KPI Trends', sub: 'Revenue, spend, vendors and PO trends over time', icon: TrendingUp, path: '/analytics/kpi', color: 'text-primary-light', bg: 'bg-primary/10', border: 'border-primary/20' },
    { title: 'Cash Flow', sub: 'Inflows vs outflows month by month', icon: DollarSign, path: '/analytics/cash-flow', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    { title: 'Vendor Analytics', sub: 'Spend analysis, top vendors, categories', icon: Package, path: '/analytics/vendors', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
    { title: 'Customer Analytics', sub: 'Revenue analysis, top customers, AR summary', icon: Users, path: '/analytics/customers', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
    { title: 'Export Center', sub: 'Download any report as formatted Excel', icon: Download, path: '/analytics/export', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
];

const AnalyticsHub = () => {
    const navigate = useNavigate();
    return (
        <div className="page-container">
            <PageHeader
                title="Analytics & Reports"
                subtitle="Financial intelligence, trends and Excel exports"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Analytics' }]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

export default AnalyticsHub;