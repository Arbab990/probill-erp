import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const formatK = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 shadow-card">
            <p className="text-xs text-slate-400 font-body mb-2">{label}</p>
            {payload.map((entry) => (
                <p key={entry.name} className="text-sm font-mono font-medium" style={{ color: entry.color }}>
                    {entry.name === 'revenue' ? 'Revenue' : 'Spend'}: {formatK(entry.value)}
                </p>
            ))}
        </div>
    );
};

const RevenueChart = ({ data = [] }) => (
    <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatK} tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} width={55} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
                wrapperStyle={{ paddingTop: '12px', fontFamily: 'DM Sans', fontSize: '12px' }}
                formatter={(value) => <span style={{ color: '#94A3B8' }}>{value === 'revenue' ? 'Revenue' : 'Spend'}</span>}
            />
            <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2} fill="url(#colorRevenue)" dot={{ fill: '#6366F1', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#818CF8' }} />
            <Area type="monotone" dataKey="spend" stroke="#0EA5E9" strokeWidth={2} fill="url(#colorSpend)" dot={{ fill: '#0EA5E9', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#38BDF8' }} />
        </AreaChart>
    </ResponsiveContainer>
);

export default RevenueChart;