import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, BarChart2, ArrowRight, Sparkles } from 'lucide-react';
import { glService } from '../../services/glService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import toast from 'react-hot-toast';

const MODULES = [
    { title: 'Chart of Accounts', sub: 'Manage your account structure', icon: BookOpen, path: '/gl/accounts', color: 'text-primary-light', bg: 'bg-primary/10', border: 'border-primary/20' },
    { title: 'Journal Entries', sub: 'View and create double-entry postings', icon: FileText, path: '/gl/journal', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
    { title: 'Financial Reports', sub: 'Trial Balance, Balance Sheet, P&L', icon: BarChart2, path: '/gl/reports', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
];

const GLHub = () => {
    const navigate = useNavigate();
    const [seeding, setSeeding] = useState(false);

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await glService.seedAccounts();
            toast.success('Chart of accounts seeded with 20 default accounts!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Seeding failed');
        } finally { setSeeding(false); }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="General Ledger"
                subtitle="Double-entry bookkeeping, journal entries and financial statements"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'General Ledger' }]}
            />

            {/* Seed prompt */}
            <div className="card border border-warning/20 bg-warning/5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Sparkles size={20} className="text-warning flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-display font-semibold text-slate-100">First Time Setup</p>
                            <p className="text-sm text-slate-400 font-body mt-0.5">
                                Seed your Chart of Accounts with 20 standard accounts (Assets, Liabilities, Equity, Revenue, Expenses). Do this once before creating journal entries.
                            </p>
                        </div>
                    </div>
                    <Button variant="secondary" loading={seeding} onClick={handleSeed} className="flex-shrink-0">
                        Seed Accounts
                    </Button>
                </div>
            </div>

            {/* Accounting equation */}
            <div className="card bg-gradient-to-r from-dark-card to-dark-bg border border-dark-border">
                <p className="text-xs text-slate-500 font-body uppercase tracking-wider mb-3">Accounting Equation</p>
                <div className="flex items-center gap-3 flex-wrap font-mono">
                    <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-primary-light font-bold">Assets</span>
                    <span className="text-slate-500 text-lg">=</span>
                    <span className="px-3 py-1.5 bg-danger/10 border border-danger/20 rounded-lg text-danger font-bold">Liabilities</span>
                    <span className="text-slate-500 text-lg">+</span>
                    <span className="px-3 py-1.5 bg-success/10 border border-success/20 rounded-lg text-success font-bold">Equity</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {MODULES.map(mod => {
                    const Icon = mod.icon;
                    return (
                        <button
                            key={mod.path}
                            onClick={() => navigate(mod.path)}
                            className={`card text-left border ${mod.border} hover:shadow-glow-sm transition-all duration-200 group`}
                        >
                            <div className={`w-12 h-12 ${mod.bg} border ${mod.border} rounded-xl flex items-center justify-center mb-4`}>
                                <Icon size={22} className={mod.color} />
                            </div>
                            <h3 className={`font-display font-bold text-base ${mod.color} mb-1`}>{mod.title}</h3>
                            <p className="text-sm text-slate-400 font-body">{mod.sub}</p>
                            <div className="flex items-center gap-1 mt-4 text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                                Open <ArrowRight size={12} />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default GLHub;