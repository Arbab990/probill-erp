import { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CustomerAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        analyticsService.getCustomerAnalytics()
            .then(r => setData(r.data.data))
            .catch(() => toast.error('Failed to load customer analytics'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-container"><PageLoader /></div>;

    const { topCustomers = [], revenueByMonth = [], arSummary = [], customerStatus = [] } = data || {};

    // Format revenue trend for chart
    const revenueChart = revenueByMonth.map(r => ({
        month: `${MONTH_NAMES[(r._id.month || 1) - 1]} ${r._id.year}`,
        revenue: r.revenue,
        invoices: r.count,
    }));

    // Format AR summary for pie
    const arChart = arSummary.map(s => ({
        name: s._id?.replace(/_/g, ' ') || 'unknown',
        value: s.total,
        count: s.count,
    }));

    const totalRevenue = topCustomers.reduce((s, c) => s + c.totalRevenue, 0);
    const totalOutstanding = topCustomers.reduce((s, c) => s + (c.outstanding || 0), 0);
    const totalCustomers = customerStatus.reduce((s, c) => s + c.count, 0);
    const activeCustomers = customerStatus.find(s => s._id === 'active')?.count || 0;

    return (
        <div className="page-container">
            <PageHeader
                title="Customer Analytics"
                subtitle="Revenue analysis and accounts receivable performance"
                breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Customers' }]}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'text-success' },
                    { label: 'Outstanding AR', value: formatCurrency(totalOutstanding), color: 'text-warning' },
                    { label: 'Total Customers', value: totalCustomers, color: 'text-primary-light' },
                    { label: 'Active Customers', value: activeCustomers, color: 'text-success' },
                ].map(kpi => (
                    <div key={kpi.label} className="card border border-dark-border">
                        <p className="text-xs text-slate-500 font-body mb-1">{kpi.label}</p>
                        <p className={`font-mono font-bold text-xl ${kpi.color}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top customers by revenue */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Top Customers by Revenue</h3>
                    {topCustomers.length === 0 ? (
                        <p className="text-sm text-slate-500 font-body py-8 text-center">No sales invoices yet</p>
                    ) : (
                        <div className="space-y-3">
                            {topCustomers.slice(0, 8).map((c, i) => {
                                const pct = totalRevenue > 0 ? (c.totalRevenue / totalRevenue) * 100 : 0;
                                return (
                                    <div key={i}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-xs text-slate-500 w-4 flex-shrink-0">{i + 1}</span>
                                                <p className="text-sm text-slate-200 font-medium truncate">{c.name}</p>
                                                <span className="text-xs text-slate-500 flex-shrink-0">{c.invoiceCount} inv</span>
                                            </div>
                                            <span className="font-mono text-sm text-success ml-2 flex-shrink-0">{formatCurrency(c.totalRevenue)}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-dark-hover rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-success/70"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* AR Summary pie */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">AR Status Breakdown</h3>
                    {arChart.length === 0 ? (
                        <p className="text-sm text-slate-500 font-body py-8 text-center">No invoices yet</p>
                    ) : (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="50%" height={180}>
                                <PieChart>
                                    <Pie data={arChart} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                                        {arChart.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                                {arChart.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                            <span className="text-slate-400 capitalize">{item.name}</span>
                                        </div>
                                        <span className="font-mono text-slate-300">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Revenue trend bar chart */}
                <Card className="lg:col-span-2">
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Monthly Revenue Trend</h3>
                    {revenueChart.length === 0 ? (
                        <p className="text-sm text-slate-500 font-body py-8 text-center">No revenue data yet</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={revenueChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                                />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Customer status breakdown */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Customer Status</h3>
                    <div className="space-y-3">
                        {customerStatus.length === 0
                            ? <p className="text-sm text-slate-500 font-body text-center py-4">No customers yet</p>
                            : customerStatus.map((s, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="capitalize text-slate-400">{s._id || 'unknown'}</span>
                                    <span className="font-mono font-bold text-slate-200">{s.count}</span>
                                </div>
                            ))
                        }
                    </div>
                </Card>

                {/* Outstanding by customer */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Outstanding Balance (Top 5)</h3>
                    {topCustomers.filter(c => c.outstanding > 0).length === 0 ? (
                        <p className="text-sm text-slate-500 font-body py-4 text-center">No outstanding balances</p>
                    ) : (
                        <div className="space-y-3">
                            {topCustomers
                                .filter(c => c.outstanding > 0)
                                .sort((a, b) => b.outstanding - a.outstanding)
                                .slice(0, 5)
                                .map((c, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <p className="text-slate-300 font-medium truncate">{c.name}</p>
                                        <span className="font-mono font-bold text-warning ml-2 flex-shrink-0">{formatCurrency(c.outstanding)}</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default CustomerAnalytics;
