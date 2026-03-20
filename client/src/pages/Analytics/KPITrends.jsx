import { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-xl">
            <p className="text-xs text-slate-400 mb-2 font-body">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-sm font-mono font-bold" style={{ color: p.color }}>
                    {p.name}: {typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}
                </p>
            ))}
        </div>
    );
};

const KPITrends = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        analyticsService.getKPITrends()
            .then(r => setData(r.data.data))
            .catch(() => toast.error('Failed to load KPI trends'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-container"><PageLoader /></div>;

    // Merge revenue + spend into combined series
    const revSpend = data?.revenue?.map((r, i) => ({
        month: r.month,
        Revenue: r.value,
        Spend: data.spend[i]?.value || 0,
    })) || [];

    return (
        <div className="page-container">
            <PageHeader
                title="KPI Trends"
                subtitle="6-month performance trends"
                breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'KPI Trends' }]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Revenue vs Spend */}
                <Card className="lg:col-span-2">
                    <h3 className="font-display font-semibold text-slate-100 mb-1">Revenue vs Spend</h3>
                    <p className="text-xs text-slate-500 font-body mb-5">Monthly comparison over last 6 months</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={revSpend}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                            <Area type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
                            <Area type="monotone" dataKey="Spend" stroke="#f59e0b" strokeWidth={2} fill="url(#spendGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>

                {/* New Vendors */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-1">New Vendors</h3>
                    <p className="text-xs text-slate-500 font-body mb-5">Vendors onboarded per month</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={data?.newVendors || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" name="Vendors" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* New POs */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-1">Purchase Orders</h3>
                    <p className="text-xs text-slate-500 font-body mb-5">POs created per month</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={data?.newPOs || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" name="POs" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
};

export default KPITrends;