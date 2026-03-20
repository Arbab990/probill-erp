import { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const CashFlow = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [months, setMonths] = useState(6);

    const fetch = () => {
        setLoading(true);
        analyticsService.getCashFlow(months)
            .then(r => setData(r.data.data))
            .catch(() => toast.error('Failed to load cash flow'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, [months]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-xl">
                <p className="text-xs text-slate-400 mb-2">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} className="text-sm font-mono font-bold" style={{ color: p.color }}>
                        {p.name}: {formatCurrency(p.value)}
                    </p>
                ))}
            </div>
        );
    };

    if (loading) return <div className="page-container"><PageLoader /></div>;

    const isPositive = (data?.netCashFlow || 0) >= 0;

    return (
        <div className="page-container">
            <PageHeader
                title="Cash Flow Statement"
                subtitle="Inflows vs outflows over time"
                breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Cash Flow' }]}
            />

            {/* Period selector */}
            <div className="flex gap-2">
                {[3, 6, 12].map(m => (
                    <button
                        key={m}
                        onClick={() => setMonths(m)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-body border transition-colors ${months === m ? 'bg-primary/20 border-primary/40 text-primary-light' : 'border-dark-border text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        {m} Months
                    </button>
                ))}
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Inflow', value: data?.totalInflow, color: 'text-success', border: 'border-success/20', bg: 'bg-success/5' },
                    { label: 'Total Outflow', value: data?.totalOutflow, color: 'text-danger', border: 'border-danger/20', bg: 'bg-danger/5' },
                    { label: 'Net Cash Flow', value: data?.netCashFlow, color: isPositive ? 'text-primary-light' : 'text-danger', border: isPositive ? 'border-primary/20' : 'border-danger/20', bg: isPositive ? 'bg-primary/5' : 'bg-danger/5' },
                ].map(kpi => (
                    <div key={kpi.label} className={`card border ${kpi.border} ${kpi.bg}`}>
                        <p className="text-xs text-slate-500 font-body mb-1">{kpi.label}</p>
                        <p className={`font-mono font-bold text-2xl ${kpi.color}`}>{formatCurrency(kpi.value || 0)}</p>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <Card>
                <h3 className="font-display font-semibold text-slate-100 mb-5">Monthly Cash Flow</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data?.series || []} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                        <ReferenceLine y={0} stroke="#334155" />
                        <Bar dataKey="inflow" name="Inflow" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="outflow" name="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="net" name="Net" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            {/* Month-by-month table */}
            <Card className="p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-dark-border">
                    <h3 className="font-display font-semibold text-slate-100">Monthly Breakdown</h3>
                </div>
                <table className="table-base">
                    <thead><tr>
                        <th>Month</th>
                        <th className="text-right">Inflow</th>
                        <th className="text-right">Outflow</th>
                        <th className="text-right">Net</th>
                    </tr></thead>
                    <tbody>
                        {data?.series?.map((row, i) => (
                            <tr key={i}>
                                <td className="font-medium text-slate-200">{row.month}</td>
                                <td className="text-right font-mono text-success">{formatCurrency(row.inflow)}</td>
                                <td className="text-right font-mono text-danger">{formatCurrency(row.outflow)}</td>
                                <td className={`text-right font-mono font-bold ${row.net >= 0 ? 'text-primary-light' : 'text-danger'}`}>{formatCurrency(row.net)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default CashFlow;