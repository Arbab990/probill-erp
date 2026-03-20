import { useState, useEffect } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { glService } from '../../services/glService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import Input from '../../components/common/Input.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import usePermission from '../../hooks/usePermission.js';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
    asset: 'text-primary-light bg-primary/10 border-primary/20',
    liability: 'text-danger bg-danger/10 border-danger/20',
    equity: 'text-success bg-success/10 border-success/20',
    revenue: 'text-secondary bg-secondary/10 border-secondary/20',
    expense: 'text-warning bg-warning/10 border-warning/20',
};

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const NORMAL_BALANCES = { asset: 'debit', liability: 'credit', equity: 'credit', revenue: 'credit', expense: 'debit' };

const EMPTY_FORM = { accountCode: '', accountName: '', accountType: 'asset', accountSubType: '', normalBalance: 'debit', description: '' };

const ChartOfAccounts = () => {
    const { isSuperAdmin, isFinanceManager } = usePermission();
    const canEdit = isSuperAdmin || isFinanceManager;
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [modal, setModal] = useState({ open: false, account: null });
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const fetch = async () => {
        setLoading(true);
        try {
            const res = await glService.getAccounts(typeFilter);
            setAccounts(res.data.data);
        } catch { toast.error('Failed to load accounts'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, [typeFilter]);

    const openModal = (account = null) => {
        setForm(account ? { ...account } : EMPTY_FORM);
        setModal({ open: true, account });
    };

    const handleSave = async () => {
        if (!form.accountCode || !form.accountName) { toast.error('Code and name are required'); return; }
        setSaving(true);
        try {
            if (modal.account) {
                await glService.updateAccount(modal.account._id, form);
                toast.success('Account updated');
            } else {
                await glService.createAccount({ ...form, normalBalance: NORMAL_BALANCES[form.accountType] });
                toast.success('Account created');
            }
            setModal({ open: false, account: null });
            fetch();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
        finally { setSaving(false); }
    };

    // Group by type
    const grouped = ACCOUNT_TYPES.reduce((acc, type) => {
        acc[type] = accounts.filter(a => a.accountType === type);
        return acc;
    }, {});

    if (loading) return <div className="page-container"><PageLoader /></div>;

    return (
        <div className="page-container">
            <PageHeader
                title="Chart of Accounts"
                subtitle="Your company's complete account structure"
                breadcrumbs={[{ label: 'General Ledger', href: '/gl' }, { label: 'Chart of Accounts' }]}
                actions={canEdit && <Button icon={Plus} onClick={() => openModal()}>New Account</Button>}
            />

            {/* Type filter tabs */}
            <div className="flex gap-2 flex-wrap">
                {['', ...ACCOUNT_TYPES].map(type => (
                    <button
                        key={type || 'all'}
                        onClick={() => setTypeFilter(type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-body font-semibold uppercase tracking-wider border transition-colors ${typeFilter === type
                                ? 'bg-primary/20 border-primary/40 text-primary-light'
                                : 'bg-dark-bg border-dark-border text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        {type || 'All'}
                    </button>
                ))}
            </div>

            {/* Accounts by group */}
            {ACCOUNT_TYPES.filter(t => !typeFilter || t === typeFilter).map(type => {
                const rows = grouped[type] || [];
                if (!rows.length) return null;
                const typeTotal = rows.reduce((s, a) => s + a.currentBalance, 0);

                return (
                    <div key={type} className="card p-0 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-dark-border">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${TYPE_COLORS[type]}`}>{type}</span>
                                <span className="text-xs text-slate-500 font-body">{rows.length} accounts</span>
                            </div>
                            <span className="font-mono text-sm font-bold text-slate-200">{formatCurrency(typeTotal)}</span>
                        </div>
                        <table className="table-base">
                            <thead><tr>
                                <th className="w-24">Code</th>
                                <th>Account Name</th>
                                <th>Sub Type</th>
                                <th>Normal Balance</th>
                                <th className="text-right">Current Balance</th>
                                <th className="w-8"></th>
                            </tr></thead>
                            <tbody>
                                {rows.map(acc => (
                                    <tr key={acc._id}>
                                        <td><span className="font-mono text-xs text-slate-400">{acc.accountCode}</span></td>
                                        <td>
                                            <p className="font-medium text-slate-200">{acc.accountName}</p>
                                            {acc.isSystemAccount && <span className="text-[10px] text-slate-600 font-body">system</span>}
                                        </td>
                                        <td><span className="text-xs text-slate-400 capitalize">{acc.accountSubType?.replace(/_/g, ' ') || '—'}</span></td>
                                        <td>
                                            <span className={`text-xs font-mono font-bold ${acc.normalBalance === 'debit' ? 'text-primary-light' : 'text-success'}`}>
                                                {acc.normalBalance.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className={`text-right font-mono font-bold ${acc.currentBalance > 0 ? 'text-slate-200' : acc.currentBalance < 0 ? 'text-danger' : 'text-slate-500'}`}>
                                            {formatCurrency(acc.currentBalance)}
                                        </td>
                                        <td>
                                            {canEdit && !acc.isSystemAccount && (
                                                <button onClick={() => openModal(acc)} className="p-1.5 rounded text-slate-500 hover:text-warning hover:bg-warning/10 transition-colors">
                                                    <Pencil size={13} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}

            {/* Account Modal */}
            <Modal isOpen={modal.open} onClose={() => setModal({ open: false, account: null })} title={modal.account ? 'Edit Account' : 'New Account'} size="md">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Account Code *" value={form.accountCode} onChange={e => setForm(p => ({ ...p, accountCode: e.target.value }))} placeholder="e.g. 5100" disabled={modal.account?.isSystemAccount} />
                        <div>
                            <label className="input-label">Account Type *</label>
                            <select className="input-field" value={form.accountType} onChange={e => setForm(p => ({ ...p, accountType: e.target.value, normalBalance: NORMAL_BALANCES[e.target.value] }))}>
                                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <Input label="Account Name *" value={form.accountName} onChange={e => setForm(p => ({ ...p, accountName: e.target.value }))} placeholder="e.g. Marketing Expenses" />
                    <Input label="Description" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setModal({ open: false, account: null })}>Cancel</Button>
                        <Button className="flex-1" loading={saving} onClick={handleSave}>{modal.account ? 'Update' : 'Create'}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ChartOfAccounts;