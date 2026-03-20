import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const STATUS_COLORS = {
    draft: '#475569', sent: '#0EA5E9', paid: '#10B981',
    overdue: '#EF4444', partially_paid: '#F59E0B', cancelled: '#334155',
};

const STATUS_LABELS = {
    draft: 'Draft', sent: 'Sent', paid: 'Paid',
    overdue: 'Overdue', partially_paid: 'Partial', cancelled: 'Cancelled',
};

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 shadow-card">
            <p className="text-sm font-medium" style={{ color: d.payload.fill }}>{STATUS_LABELS[d.name] || d.name}</p>
            <p className="text-sm text-slate-300 font-mono">{d.value} invoices</p>
        </div>
    );
};

const InvoiceStatusChart = ({ data = [] }) => {
    const chartData = data.map(d => ({ name: d._id, value: d.count, fill: STATUS_COLORS[d._id] || '#475569' }));
    if (!chartData.length) return <div className="flex items-center justify-center h-52 text-slate-500 text-sm font-body">No invoice data yet</div>;

    return (
        <ResponsiveContainer width="100%" height={220}>
            <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontFamily: 'DM Sans', fontSize: '11px', paddingTop: '8px' }}
                    formatter={(value) => <span style={{ color: '#94A3B8' }}>{STATUS_LABELS[value] || value}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default InvoiceStatusChart;