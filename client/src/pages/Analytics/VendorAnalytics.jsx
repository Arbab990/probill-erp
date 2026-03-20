import { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const VendorAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        analyticsService.getVendorAnalytics()
            .then(r => setData(r.data.data))
            .catch(() => toast.error('Failed to load vendor analytics'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-container"><PageLoader /></div>;

    const perf = data?.paymentPerformance;

    return (
        <div className="page-container">
            <PageHeader
                title="Vendor Analytics"
                subtitle="Spend analysis and vendor performance"
                breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Vendors' }]}
            />

            {/* Payment performance KPIs */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Avg. Days to Pay', value: perf?.avgDays?.toFixed(1) || '—', unit: 'days' },
                    { label: 'Fastest Payment', value: perf?.minDays?.toFixed(0) || '—', unit: 'days' },
                    { label: 'Slowest Payment', value: perf?.maxDays?.toFixed(0) || '—', unit: 'days' },
                ].map(kpi => (
                    <div key={kpi.label} className="card border border-dark-border">
                        <p className="text-xs text-slate-500 font-body mb-1">{kpi.label}</p>
                        <p className="font-mono font-bold text-2xl text-primary-light">{kpi.value} <span className="text-sm text-slate-500">{kpi.unit}</span></p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top vendors by spend */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-5">Top Vendors by Spend</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data?.topVendors || []} layout="vertical">
                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                            <Bar dataKey="totalSpend" name="Spend" fill="#6366f1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Spend by category */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-5">Spend by Category</h3>
                    {data?.spendByCategory?.length ? (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="60%" height={180}>
                                <PieChart>
                                    <Pie data={data.spendByCategory} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                                        {data.spendByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 flex-1">
                                {data.spendByCategory.map((cat, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                            <span className="text-slate-300 capitalize">{cat._id}</span>
                                        </div>
                                        <span className="font-mono text-slate-400">{formatCurrency(cat.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <p className="text-center text-slate-500 py-10 text-sm">No spend data yet</p>}
                </Card>

                {/* Top vendors table */}
                <Card className="lg:col-span-2 p-0 overflow-hidden">
                    <div className="px-5 py-4 border-b border-dark-border">
                        <h3 className="font-display font-semibold text-slate-100">Top Vendors Detail</h3>
                    </div>
                    <table className="table-base">
                        <thead><tr>
                            <th>#</th><th>Vendor</th><th>Category</th>
                            <th className="text-right">Invoices</th>
                            <th className="text-right">Total Spend</th>
                        </tr></thead>
                        <tbody>
                            {data?.topVendors?.map((v, i) => (
                                <tr key={i}>
                                    <td className="text-slate-500 font-mono text-xs">{i + 1}</td>
                                    <td><p className="font-medium text-slate-200">{v.name}</p><p className="text-xs text-slate-500 font-mono">{v.vendorCode}</p></td>
                                    <td><span className="text-xs capitalize text-slate-400">{v.category}</span></td>
                                    <td className="text-right font-mono text-sm">{v.invoiceCount}</td>
                                    <td className="text-right font-mono font-bold text-warning">{formatCurrency(v.totalSpend)}</td>
                                </tr>
                            ))}
                            {!data?.topVendors?.length && (
                                <tr><td colSpan={5} className="text-center text-slate-500 py-8 text-sm">No vendor spend data yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            </div>
        </div>
    );
};

export default VendorAnalytics;