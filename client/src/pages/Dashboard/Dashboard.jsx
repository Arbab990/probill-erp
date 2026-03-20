import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, TrendingDown, DollarSign, AlertTriangle,
    FileText, Building2, ArrowRight, RefreshCw,
} from 'lucide-react';
import { reportService } from '../../services/reportService.js';
import { aiService } from '../../services/aiService.js';
import RevenueChart from '../../components/charts/RevenueChart.jsx';
import InvoiceStatusChart from '../../components/charts/InvoiceStatusChart.jsx';
import AIInsightCard from '../../components/ai/AiInsightCard.jsx';
import Badge from '../../components/common/Badge.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { formatCurrency, formatCompact, formatDate } from '../../utils/formatters.js';
import useAuth from '../../hooks/useAuth.js';
import toast from 'react-hot-toast';

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, subLabel, subValue, icon: Icon, color, trend }) => {
    const colorMap = {
        primary: { bg: 'bg-primary/10', border: 'border-primary/20', icon: 'text-primary-light', value: 'text-primary-light' },
        success: { bg: 'bg-success/10', border: 'border-success/20', icon: 'text-success', value: 'text-success' },
        warning: { bg: 'bg-warning/10', border: 'border-warning/20', icon: 'text-warning', value: 'text-warning' },
        danger: { bg: 'bg-danger/10', border: 'border-danger/20', icon: 'text-danger', value: 'text-danger' },
    };
    const c = colorMap[color] || colorMap.primary;

    return (
        <div className={`card border ${c.border} relative overflow-hidden group hover:shadow-glow-sm transition-all duration-300`}>
            <div className={`absolute top-0 right-0 w-24 h-24 ${c.bg} rounded-full blur-2xl pointer-events-none`} />
            <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                    <p className="text-sm text-slate-400 font-body">{label}</p>
                    <div className={`w-9 h-9 ${c.bg} border ${c.border} rounded-xl flex items-center justify-center`}>
                        <Icon size={17} className={c.icon} />
                    </div>
                </div>
                <p className={`text-2xl font-bold font-mono ${c.value} mb-1`}>{value}</p>
                {subLabel && (
                    <p className="text-xs text-slate-500 font-body">
                        <span className="text-slate-400">{subLabel}</span>
                        {subValue && <span className="ml-1 font-medium text-slate-300">{subValue}</span>}
                    </p>
                )}
            </div>
        </div>
    );
};

// ── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [aiSummary, setAiSummary] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiFallback, setAiFallback] = useState(false);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const res = await reportService.getDashboard();
            setData(res.data.data);
        } catch { toast.error('Failed to load dashboard data'); }
        finally { setLoading(false); }
    }, []);

    const fetchAISummary = useCallback(async (kpis) => {
        if (!kpis) return;
        setAiLoading(true);
        try {
            const res = await aiService.financialSummary(kpis);
            setAiSummary(res.data.data.summary);
            setAiFallback(!!res.data.data.fallback);
        } catch { setAiSummary('Unable to generate AI summary at this time.'); setAiFallback(true); }
        finally { setAiLoading(false); }
    }, []);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
    useEffect(() => { if (data?.kpis) fetchAISummary(data.kpis); }, [data]);

    if (loading) return <div className="page-container"><PageLoader /></div>;

    const { kpis = {}, invoiceStatusBreakdown = [], revenueTrend = [], recentInvoices = [] } = data || {};

    return (
        <div className="page-container">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="text-sm text-slate-400 font-body mt-1">
                        Welcome back, <span className="text-slate-300 font-medium">{user?.name?.split(' ')[0]}</span> ·{' '}
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <button
                    onClick={fetchDashboard}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover transition-colors"
                    title="Refresh"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* AI Insight */}
            <AIInsightCard
                summary={aiSummary}
                loading={aiLoading}
                fallback={aiFallback}
                onRefresh={() => fetchAISummary(kpis)}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    label="Revenue This Month"
                    value={formatCompact(kpis.revenueThisMonth)}
                    subLabel="From paid sales invoices"
                    icon={DollarSign}
                    color="primary"
                />
                <StatCard
                    label="Outstanding"
                    value={formatCompact(kpis.outstanding)}
                    subLabel="Receivables pending"
                    icon={TrendingUp}
                    color="warning"
                />
                <StatCard
                    label="Overdue Invoices"
                    value={kpis.overdueCount || 0}
                    subLabel="Require immediate action"
                    icon={AlertTriangle}
                    color={kpis.overdueCount > 0 ? 'danger' : 'success'}
                />
                <StatCard
                    label="Total Vendors"
                    value={kpis.totalVendors || 0}
                    subLabel="Verified"
                    subValue={kpis.verifiedVendors || 0}
                    icon={Building2}
                    color="success"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Revenue chart — takes 2/3 */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="font-display font-bold text-slate-100">Revenue vs Spend</h2>
                            <p className="text-xs text-slate-500 font-body mt-0.5">Last 6 months</p>
                        </div>
                    </div>
                    {revenueTrend.length > 0 ? (
                        <RevenueChart data={revenueTrend} />
                    ) : (
                        <div className="flex items-center justify-center h-64 text-slate-500 text-sm font-body flex-col gap-2">
                            <TrendingUp size={32} className="opacity-20" />
                            <p>No revenue data yet. Create and pay some invoices!</p>
                        </div>
                    )}
                </div>

                {/* Invoice status pie — takes 1/3 */}
                <div className="card">
                    <div className="mb-4">
                        <h2 className="font-display font-bold text-slate-100">Invoice Breakdown</h2>
                        <p className="text-xs text-slate-500 font-body mt-0.5">By status</p>
                    </div>
                    <InvoiceStatusChart data={invoiceStatusBreakdown} />
                    {/* Quick totals */}
                    <div className="mt-3 space-y-1.5 border-t border-dark-border pt-3">
                        {invoiceStatusBreakdown.slice(0, 4).map(item => (
                            <div key={item._id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge type="invoice" status={item._id} />
                                </div>
                                <span className="text-xs text-slate-400 font-mono">{item.count} · {formatCompact(item.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Invoices */}
            <div className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
                    <div>
                        <h2 className="font-display font-bold text-slate-100">Recent Invoices</h2>
                        <p className="text-xs text-slate-500 font-body mt-0.5">Latest 5 invoices</p>
                    </div>
                    <button
                        onClick={() => navigate('/billing')}
                        className="flex items-center gap-1.5 text-sm text-primary-light hover:text-primary transition-colors font-body font-medium"
                    >
                        View All <ArrowRight size={14} />
                    </button>
                </div>

                {recentInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 font-body gap-2">
                        <FileText size={28} className="opacity-20" />
                        <p className="text-sm">No invoices yet. <button onClick={() => navigate('/billing/new')} className="text-primary-light hover:underline">Create your first</button></p>
                    </div>
                ) : (
                    <table className="table-base">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Party</th>
                                <th>Type</th>
                                <th className="text-right">Amount</th>
                                <th>Due Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentInvoices.map(inv => (
                                <tr
                                    key={inv._id}
                                    onClick={() => navigate(`/billing/${inv._id}`)}
                                    className="cursor-pointer"
                                >
                                    <td>
                                        <span className="font-mono text-primary-light text-xs">{inv.invoiceNo}</span>
                                    </td>
                                    <td>
                                        <span className="text-slate-200 font-medium text-sm">
                                            {inv.vendor?.name || inv.customer?.name || '—'}
                                        </span>
                                    </td>
                                    <td>
                                        <Badge
                                            type="custom"
                                            status={inv.type === 'sales' ? 'badge-info' : 'badge-warning'}
                                            label={inv.type === 'sales' ? 'Sales' : 'Purchase'}
                                        />
                                    </td>
                                    <td className="text-right">
                                        <span className="font-mono text-sm font-medium text-slate-200">
                                            {formatCurrency(inv.total)}
                                        </span>
                                    </td>
                                    <td className="text-sm text-slate-400">{formatDate(inv.dueDate)}</td>
                                    <td><Badge type="invoice" status={inv.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'New Invoice', sub: 'Create sales/purchase', path: '/billing/new', color: 'text-primary-light' },
                    { label: 'Add Vendor', sub: 'Register supplier', path: '/vendors/new', color: 'text-success' },
                    { label: 'View Reports', sub: 'Analytics & exports', path: '/reports', color: 'text-secondary' },
                    { label: 'Payment Runs', sub: 'Batch payments', path: '/payments', color: 'text-warning' },
                ].map(action => (
                    <button
                        key={action.path}
                        onClick={() => navigate(action.path)}
                        className="card text-left hover:border-dark-hover hover:shadow-glow-sm transition-all duration-200 group"
                    >
                        <p className={`text-sm font-display font-semibold ${action.color} group-hover:opacity-80 transition-opacity`}>
                            {action.label}
                        </p>
                        <p className="text-xs text-slate-500 font-body mt-0.5">{action.sub}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;