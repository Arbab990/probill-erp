import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, BarChart2, ArrowRight, Sparkles, Lock } from 'lucide-react';
import { glService } from '../../services/glService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import toast from 'react-hot-toast';

const MODULES = [
    { title: 'Chart of Accounts', sub: 'Manage your account structure', icon: BookOpen, path: '/gl/accounts', color: 'text-primary-light', bg: 'bg-primary/10', border: 'border-primary/20' },
    { title: 'Journal Entries', sub: 'View and create double-entry postings', icon: FileText, path: '/gl/journal', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
    { title: 'Financial Reports', sub: 'Trial Balance, Balance Sheet, P&L', icon: BarChart2, path: '/gl/reports', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    { title: 'Fiscal Periods', sub: 'Lock closed periods to prevent backdating', icon: Lock, path: '/gl/fiscal-periods', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
];

const GLHub = () => {
    const navigate = useNavigate();
    const [seeding, setSeeding] = useState(false);
    const [accountCount, setAccountCount] = useState(null); // null = loading, 0 = empty, >0 = seeded

    // Check if COA has been seeded already
    useEffect(() => {
        glService.getAccounts()
            .then(res => setAccountCount(res.data.data?.length || 0))
            .catch(() => setAccountCount(0)); // On error assume not seeded, show prompt
    }, []);

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await glService.seedAccounts();
            toast.success('Chart of accounts seeded with 20 default accounts!');
            setAccountCount(20); // Hide prompt immediately after seeding
        } catch (err) {
            // If already seeded (400), just hide the prompt
            if (err.response?.status === 400) {
                setAccountCount(20);
                toast.success('Chart of accounts already set up');
            } else {
                toast.error(err.response?.data?.error || 'Seeding failed');
            }
        } finally { setSeeding(false); }
    };

    const showSeedPrompt = accountCount === 0; // Only show when truly empty

    return (
        <div className="page-container">
            <PageHeader
                title="General Ledger"
                subtitle="Double-entry bookkeeping, journal entries and financial statements"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'General Ledger' }]}
            />

            {/* Seed prompt — only shown when COA is empty */}
            {showSeedPrompt && (
                <div className="card border border-warning/20 bg-warning/5">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <Sparkles size={20} className="text-warning flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-display font-semibold text-slate-100">Chart of Accounts Not Set Up</p>
                                <p className="text-sm text-slate-400 font-body mt-0.5">
                                    Your GL has no accounts yet. Seed 20 standard accounts (Assets, Liabilities, Equity, Revenue, Expenses) to start creating journal entries.
                                </p>
                            </div>
                        </div>
                        <Button variant="secondary" loading={seeding} onClick={handleSeed} className="flex-shrink-0">
                            Seed Accounts
                        </Button>
                    </div>
                </div>
            )}

            {/* Ready state — shown when COA is seeded */}
            {accountCount > 0 && (
                <div className="card border border-success/20 bg-success/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-success/20 border border-success/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-success text-sm font-bold">✓</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-success">GL Ready — {accountCount} accounts configured</p>
                            <p className="text-xs text-slate-400 font-body mt-0.5">Double-entry bookkeeping is active. All journal entries require balanced debits and credits.</p>
                        </div>
                    </div>
                </div>
            )}

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

