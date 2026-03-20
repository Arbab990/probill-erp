import { useState } from 'react';
import { Download, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import toast from 'react-hot-toast';

const EXPORTS = [
    { key: 'invoices', label: 'All Invoices', desc: 'Complete invoice list with status, amounts and parties', color: 'text-primary-light', border: 'border-primary/20', bg: 'bg-primary/5' },
    { key: 'vendors', label: 'Vendor Master', desc: 'All vendors with bank details, GSTIN and status', color: 'text-warning', border: 'border-warning/20', bg: 'bg-warning/5' },
    { key: 'trial-balance', label: 'Trial Balance', desc: 'GL account balances — debit and credit columns', color: 'text-success', border: 'border-success/20', bg: 'bg-success/5' },
    { key: 'payment-runs', label: 'Payment Runs', desc: 'All payment batches with amounts and status', color: 'text-secondary', border: 'border-secondary/20', bg: 'bg-secondary/5' },
    { key: 'ar-aging', label: 'AR Aging Report', desc: 'Outstanding receivables bucketed by age', color: 'text-danger', border: 'border-danger/20', bg: 'bg-danger/5' },
];

const ExportCenter = () => {
    const [downloading, setDownloading] = useState(null);
    const [done, setDone] = useState(new Set());

    const handleExport = async (key) => {
        setDownloading(key);
        try {
            const res = await analyticsService.exportExcel(key);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `ProBill-${key}-${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success(`${key} exported successfully`);
            setDone(prev => new Set([...prev, key]));
        } catch { toast.error('Export failed'); }
        finally { setDownloading(null); }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="Export Center"
                subtitle="Download any report as a formatted Excel file"
                breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Export Center' }]}
            />

            <div className="card border border-dark-border bg-dark-bg/50 mb-2">
                <div className="flex items-center gap-3">
                    <FileSpreadsheet size={20} className="text-success" />
                    <div>
                        <p className="text-sm font-medium text-slate-200">Excel Format (.xlsx)</p>
                        <p className="text-xs text-slate-500 font-body">All exports are formatted with headers, alternating rows, currency formatting and colored status cells.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXPORTS.map(exp => (
                    <div key={exp.key} className={`card border ${exp.border} ${exp.bg}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className={`font-display font-bold text-sm ${exp.color}`}>{exp.label}</h3>
                                    {done.has(exp.key) && <CheckCircle size={13} className="text-success" />}
                                </div>
                                <p className="text-xs text-slate-400 font-body">{exp.desc}</p>
                            </div>
                            <button
                                onClick={() => handleExport(exp.key)}
                                disabled={downloading === exp.key}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-semibold border ${exp.border} ${exp.color} hover:bg-white/5 transition-colors disabled:opacity-50 flex-shrink-0`}
                            >
                                {downloading === exp.key ? (
                                    <><span className="animate-spin">⟳</span> Exporting...</>
                                ) : (
                                    <><Download size={12} /> Export</>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExportCenter;