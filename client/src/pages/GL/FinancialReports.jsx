import { useState, useEffect } from 'react';
import { glService } from '../../services/glService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const TABS = ['Trial Balance', 'Balance Sheet', 'Profit & Loss'];

const FinancialReports = () => {
    const [activeTab, setActiveTab] = useState('Trial Balance');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({});
    const [plDates, setPLDates] = useState({
        fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
    });

    const fetchReport = async (tab = activeTab) => {
        setLoading(true);
        try {
            let res;
            if (tab === 'Trial Balance') res = await glService.getTrialBalance();
            else if (tab === 'Balance Sheet') res = await glService.getBalanceSheet();
            else res = await glService.getProfitLoss(plDates.fromDate, plDates.toDate);
            setData(prev => ({ ...prev, [tab]: res.data.data }));
        } catch { toast.error('Failed to load report'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, [activeTab]);

    // ── Trial Balance ──
    const renderTrialBalance = () => {
        const d = data['Trial Balance'];
        if (!d) return null;
        return (
            <div className="space-y-3">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${d.isBalanced ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                    {d.isBalanced ? '✓ Trial Balance is balanced' : '✗ Trial Balance is NOT balanced — check your entries'}
                </div>
                <div className="card p-0 overflow-hidden">
                    <table className="table-base">
                        <thead><tr>
                            <th className="w-24">Code</th>
                            <th>Account Name</th>
                            <th>Type</th>
                            <th className="text-right">Debit</th>
                            <th className="text-right">Credit</th>
                        </tr></thead>
                        <tbody>
                            {d.rows.map((row, i) => (
                                <tr key={i}>
                                    <td><span className="font-mono text-xs text-slate-400">{row.accountCode}</span></td>
                                    <td className="font-medium text-slate-200">{row.accountName}</td>
                                    <td><span className="text-xs capitalize text-slate-400">{row.accountType}</span></td>
                                    <td className="text-right font-mono text-sm">{row.debit > 0 ? formatCurrency(row.debit) : '—'}</td>
                                    <td className="text-right font-mono text-sm">{row.credit > 0 ? formatCurrency(row.credit) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-dark-border">
                                <td colSpan={3} className="font-bold text-slate-100 px-4 py-3">TOTAL</td>
                                <td className="text-right font-mono font-bold text-primary-light px-4 py-3">{formatCurrency(d.totalDebit)}</td>
                                <td className="text-right font-mono font-bold text-success px-4 py-3">{formatCurrency(d.totalCredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        );
    };

    // ── Balance Sheet ──
    const renderBalanceSheet = () => {
        const d = data['Balance Sheet'];
        if (!d) return null;

        const Section = ({ title, rows, total, color }) => (
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-display font-bold text-base ${color}`}>{title}</h3>
                    <span className={`font-mono font-bold ${color}`}>{formatCurrency(total)}</span>
                </div>
                <div className="card p-0 overflow-hidden mb-4">
                    <table className="table-base">
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={2} className="text-center text-slate-500 py-6 text-sm">No accounts with balances</td></tr>
                            ) : rows.map((row, i) => (
                                <tr key={i}>
                                    <td>
                                        <p className="font-medium text-slate-200">{row.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">{row.code}</p>
                                    </td>
                                    <td className="text-right font-mono font-bold text-slate-200">{formatCurrency(row.balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <Section title="Assets" rows={d.assets} total={d.totalAssets} color="text-primary-light" />
                </div>
                <div>
                    <Section title="Liabilities" rows={d.liabilities} total={d.totalLiabilities} color="text-danger" />
                    <Section title="Equity" rows={d.equity} total={d.totalEquity} color="text-success" />
                    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${d.isBalanced ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'}`}>
                        <span className="font-body text-sm text-slate-300">Liabilities + Equity</span>
                        <span className={`font-mono font-bold ${d.isBalanced ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(d.totalLiabilities + d.totalEquity)}
                            {d.isBalanced ? ' ✓' : ' ✗'}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    // ── Profit & Loss ──
    const renderProfitLoss = () => {
        const d = data['Profit & Loss'];
        if (!d) return null;

        const isProfitable = d.netProfit >= 0;

        return (
            <div className="space-y-5">
                {/* Date range picker */}
                <div className="flex gap-3 items-end">
                    <div>
                        <label className="input-label">From Date</label>
                        <input type="date" className="input-field" value={plDates.fromDate} onChange={e => setPLDates(p => ({ ...p, fromDate: e.target.value }))} />
                    </div>
                    <div>
                        <label className="input-label">To Date</label>
                        <input type="date" className="input-field" value={plDates.toDate} onChange={e => setPLDates(p => ({ ...p, toDate: e.target.value }))} />
                    </div>
                    <button onClick={() => fetchReport('Profit & Loss')} className="btn btn-secondary">Apply</button>
                </div>

                {/* Revenue */}
                <div className="card p-0 overflow-hidden">
                    <div className="px-5 py-3 bg-success/5 border-b border-success/20 flex justify-between items-center">
                        <h3 className="font-display font-bold text-success">Revenue</h3>
                        <span className="font-mono font-bold text-success">{formatCurrency(d.totalRevenue)}</span>
                    </div>
                    <table className="table-base">
                        <tbody>
                            {d.revenues.length === 0 ? (
                                <tr><td className="text-center text-slate-500 py-6 text-sm">No revenue posted yet</td></tr>
                            ) : d.revenues.map((r, i) => (
                                <tr key={i}>
                                    <td><p className="font-medium text-slate-200">{r.name}</p><p className="text-xs text-slate-500 font-mono">{r.code}</p></td>
                                    <td className="text-right font-mono font-bold text-success">{formatCurrency(r.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Expenses */}
                <div className="card p-0 overflow-hidden">
                    <div className="px-5 py-3 bg-danger/5 border-b border-danger/20 flex justify-between items-center">
                        <h3 className="font-display font-bold text-danger">Expenses</h3>
                        <span className="font-mono font-bold text-danger">{formatCurrency(d.totalExpenses)}</span>
                    </div>
                    <table className="table-base">
                        <tbody>
                            {d.expenses.length === 0 ? (
                                <tr><td className="text-center text-slate-500 py-6 text-sm">No expenses posted yet</td></tr>
                            ) : d.expenses.map((r, i) => (
                                <tr key={i}>
                                    <td><p className="font-medium text-slate-200">{r.name}</p><p className="text-xs text-slate-500 font-mono">{r.code}</p></td>
                                    <td className="text-right font-mono font-bold text-danger">{formatCurrency(r.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Net Profit */}
                <div className={`card border-2 ${isProfitable ? 'border-success/40 bg-success/5' : 'border-danger/40 bg-danger/5'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400 font-body">{isProfitable ? 'Net Profit' : 'Net Loss'}</p>
                            <p className={`font-mono font-bold text-3xl mt-1 ${isProfitable ? 'text-success' : 'text-danger'}`}>
                                {formatCurrency(Math.abs(d.netProfit))}
                            </p>
                        </div>
                        <div className={`text-5xl ${isProfitable ? 'text-success/30' : 'text-danger/30'}`}>
                            {isProfitable ? '📈' : '📉'}
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-dark-border flex justify-between text-sm font-body text-slate-400">
                        <span>Revenue: <span className="text-success font-mono">{formatCurrency(d.totalRevenue)}</span></span>
                        <span>Expenses: <span className="text-danger font-mono">{formatCurrency(d.totalExpenses)}</span></span>
                        <span>Margin: <span className={`font-mono font-bold ${isProfitable ? 'text-success' : 'text-danger'}`}>
                            {d.totalRevenue > 0 ? ((d.netProfit / d.totalRevenue) * 100).toFixed(1) : 0}%
                        </span></span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container">
            <PageHeader
                title="Financial Reports"
                subtitle="Trial Balance · Balance Sheet · Profit & Loss"
                breadcrumbs={[{ label: 'General Ledger', href: '/gl' }, { label: 'Reports' }]}
            />

            {/* Tab navigation */}
            <div className="flex gap-1 p-1 bg-dark-bg border border-dark-border rounded-xl w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${activeTab === tab
                                ? 'bg-primary text-white shadow-glow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {loading ? <PageLoader /> : (
                <div>
                    {activeTab === 'Trial Balance' && renderTrialBalance()}
                    {activeTab === 'Balance Sheet' && renderBalanceSheet()}
                    {activeTab === 'Profit & Loss' && renderProfitLoss()}
                </div>
            )}
        </div>
    );
};

export default FinancialReports;