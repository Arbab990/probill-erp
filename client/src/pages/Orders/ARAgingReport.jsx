import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { orderService } from '../../services/orderService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const BUCKETS = [
    { key: 'current', label: 'Current', subLabel: 'Not yet due', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    { key: 'days30', label: '1-30 Days', subLabel: 'Slightly overdue', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
    { key: 'days60', label: '31-60 Days', subLabel: 'Overdue', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
    { key: 'days90', label: '61-90 Days', subLabel: 'Seriously overdue', color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/20' },
    { key: 'over90', label: '90+ Days', subLabel: 'Critical', color: 'text-danger', bg: 'bg-danger/20', border: 'border-danger/30' },
];

const ARAgingReport = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeBucket, setActiveBucket] = useState('current');

    useEffect(() => {
        orderService.getARAgingReport()
            .then(res => setData(res.data.data))
            .catch(() => toast.error('Failed to load AR aging report'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-container"><PageLoader /></div>;

    const { buckets = {}, totals = {}, grandTotal = 0 } = data || {};

    return (
        <div className="page-container">
            <PageHeader
                title="AR Aging Report"
                subtitle="Outstanding receivables by age bucket"
                breadcrumbs={[{ label: 'Order to Cash', href: '/orders' }, { label: 'AR Aging' }]}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {BUCKETS.map(b => (
                    <button
                        key={b.key}
                        onClick={() => setActiveBucket(b.key)}
                        className={`card text-left border transition-all duration-200 ${b.border} ${activeBucket === b.key ? `${b.bg} shadow-glow-sm` : 'hover:border-slate-600'}`}
                    >
                        <p className={`text-xs font-body font-semibold mb-1 ${b.color}`}>{b.label}</p>
                        <p className={`font-mono font-bold text-base ${b.color}`}>{formatCurrency(totals[b.key] || 0)}</p>
                        <p className="text-[10px] text-slate-500 font-body mt-0.5">{(buckets[b.key] || []).length} invoices</p>
                    </button>
                ))}
            </div>

            {/* Grand total */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-dark-card">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                            <TrendingUp size={18} className="text-primary-light" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-body">Total Outstanding Receivables</p>
                            <p className="font-mono font-bold text-2xl text-primary-light">{formatCurrency(grandTotal)}</p>
                        </div>
                    </div>
                    {(totals.days90 + totals.over90) > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg">
                            <AlertTriangle size={16} className="text-danger" />
                            <div>
                                <p className="text-xs text-danger font-semibold">Critical Overdue</p>
                                <p className="font-mono text-sm text-danger font-bold">{formatCurrency((totals.days90 || 0) + (totals.over90 || 0))}</p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Active bucket detail table */}
            {(() => {
                const bucket = BUCKETS.find(b => b.key === activeBucket);
                const rows = buckets[activeBucket] || [];
                return (
                    <Card className="p-0 overflow-hidden">
                        <div className={`px-5 py-4 border-b border-dark-border flex items-center justify-between`}>
                            <div>
                                <h3 className={`font-display font-bold text-slate-100`}>{bucket?.label} Invoices</h3>
                                <p className="text-xs text-slate-500 font-body mt-0.5">{bucket?.subLabel} · {rows.length} invoices · {formatCurrency(totals[activeBucket] || 0)}</p>
                            </div>
                        </div>

                        {rows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                                <span className="text-3xl">✅</span>
                                <p className="text-sm font-body">No invoices in this bucket</p>
                            </div>
                        ) : (
                            <table className="table-base">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Customer</th>
                                        <th className="text-right">Total</th>
                                        <th className="text-right">Balance Due</th>
                                        <th>Due Date</th>
                                        <th className="text-right">Days Overdue</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr key={i}>
                                            <td><span className="font-mono text-primary-light text-xs">{row.invoiceNo}</span></td>
                                            <td>
                                                <p className="font-medium text-slate-200">{row.customer}</p>
                                                <p className="text-xs text-slate-500">{row.customerEmail}</p>
                                            </td>
                                            <td className="text-right font-mono text-sm">{formatCurrency(row.total)}</td>
                                            <td className="text-right font-mono text-sm font-bold text-warning">{formatCurrency(row.balance)}</td>
                                            <td className="text-sm text-slate-400">{formatDate(row.dueDate)}</td>
                                            <td className="text-right">
                                                {row.daysOverdue > 0 ? (
                                                    <span className={`font-mono text-sm font-bold ${row.daysOverdue > 60 ? 'text-danger' : row.daysOverdue > 30 ? 'text-orange-400' : 'text-warning'}`}>
                                                        {row.daysOverdue}d
                                                    </span>
                                                ) : (
                                                    <span className="text-success font-mono text-sm">Current</span>
                                                )}
                                            </td>
                                            <td><Badge type="invoice" status={row.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                );
            })()}
        </div>
    );
};

export default ARAgingReport;