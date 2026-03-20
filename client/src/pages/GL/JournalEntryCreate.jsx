import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { glService } from '../../services/glService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const emptyLine = { account: '', debit: '', credit: '', description: '' };

const JournalEntryCreate = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        narration: '',
        lines: [{ ...emptyLine }, { ...emptyLine }],
    });

    useEffect(() => {
        glService.getAccounts().then(r => setAccounts(r.data.data)).catch(() => { });
    }, []);

    const updateLine = (idx, field, value) => {
        const lines = [...form.lines];
        lines[idx] = { ...lines[idx], [field]: value };
        setForm(p => ({ ...p, lines }));
    };

    const handleAmountChange = (idx, type, value) => {
        setForm(p => {
            const lines = [...p.lines];
            if (type === 'debit') {
                lines[idx] = { ...lines[idx], debit: value, credit: value ? '' : lines[idx].credit };
            } else {
                lines[idx] = { ...lines[idx], credit: value, debit: value ? '' : lines[idx].debit };
            }
            return { ...p, lines };
        });
    };

    const addLine = () => setForm(p => ({ ...p, lines: [...p.lines, { ...emptyLine }] }));
    const removeLine = (idx) => setForm(p => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }));

    const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01 && totalDebit > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.narration.trim()) { toast.error('Narration is required'); return; }
        if (form.lines.some(l => !l.account)) { toast.error('All lines need an account'); return; }
        if (!isBalanced) { toast.error(`Entry not balanced. Difference: ₹${difference.toFixed(2)}`); return; }
        setLoading(true);
        try {
            await glService.createJournalEntry(form);
            toast.success('Journal entry created as draft');
            navigate('/gl/journal');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create entry'); }
        finally { setLoading(false); }
    };

    // Group accounts for select dropdown
    const accountsByType = accounts.reduce((acc, a) => {
        if (!acc[a.accountType]) acc[a.accountType] = [];
        acc[a.accountType].push(a);
        return acc;
    }, {});

    return (
        <div className="page-container">
            <PageHeader
                title="New Journal Entry"
                subtitle="Double-entry bookkeeping — debits must equal credits"
                breadcrumbs={[{ label: 'Journal Entries', href: '/gl/journal' }, { label: 'New' }]}
            />

            <form onSubmit={handleSubmit} className="space-y-5">
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Entry Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Date *" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                        <div className="md:col-span-1">
                            <Input label="Narration *" value={form.narration} onChange={e => setForm(p => ({ ...p, narration: e.target.value }))} placeholder="e.g. Recording sales revenue for March" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-semibold text-slate-100">Journal Lines</h3>
                        <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addLine}>Add Line</Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-dark-border">
                                    <th className="text-left text-xs text-slate-400 pb-2 font-body font-semibold uppercase tracking-wider">Account</th>
                                    <th className="text-left text-xs text-slate-400 pb-2 font-body font-semibold uppercase tracking-wider px-2">Description</th>
                                    <th className="text-right text-xs text-slate-400 pb-2 w-32 font-body font-semibold uppercase tracking-wider px-2">Debit (Dr)</th>
                                    <th className="text-right text-xs text-slate-400 pb-2 w-32 font-body font-semibold uppercase tracking-wider px-2">Credit (Cr)</th>
                                    <th className="w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.lines.map((line, idx) => (
                                    <tr key={idx} className="border-b border-dark-border/30">
                                        <td className="py-2 pr-2">
                                            <select
                                                className="input-field text-xs py-1.5"
                                                value={line.account}
                                                onChange={e => updateLine(idx, 'account', e.target.value)}
                                                required
                                            >
                                                <option value="">Select Account</option>
                                                {Object.entries(accountsByType).map(([type, accs]) => (
                                                    <optgroup key={type} label={type.toUpperCase()}>
                                                        {accs.map(a => (
                                                            <option key={a._id} value={a._id}>{a.accountCode} — {a.accountName}</option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                value={line.description}
                                                onChange={e => updateLine(idx, 'description', e.target.value)}
                                                placeholder="Line description"
                                                className="input-field text-xs py-1.5"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.debit}
                                                onChange={e => handleAmountChange(idx, 'debit', e.target.value)}
                                                placeholder="0.00"
                                                className="input-field text-xs py-1.5 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.credit}
                                                onChange={e => handleAmountChange(idx, 'credit', e.target.value)}
                                                placeholder="0.00"
                                                className="input-field text-xs py-1.5 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                            />
                                        </td>
                                        <td className="py-2 pl-2 w-8 text-right">
                                            {form.lines.length > 2 && (
                                                <button type="button" onClick={() => removeLine(idx)} className="p-1 rounded text-slate-500 hover:text-danger hover:bg-danger/10">
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals + balance indicator */}
                    <div className="mt-4 pt-4 border-t border-dark-border flex items-center justify-between">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-body ${isBalanced ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
                            }`}>
                            {isBalanced
                                ? <><CheckCircle size={14} /> Entry is balanced</>
                                : <><AlertTriangle size={14} /> Difference: {formatCurrency(difference)}</>
                            }
                        </div>
                        <div className="flex gap-8 text-sm font-mono">
                            <div className="text-right">
                                <p className="text-xs text-slate-500 mb-0.5">Total Debits</p>
                                <p className="font-bold text-primary-light">{formatCurrency(totalDebit)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 mb-0.5">Total Credits</p>
                                <p className="font-bold text-success">{formatCurrency(totalCredit)}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => navigate('/gl/journal')}>Cancel</Button>
                    <Button type="submit" loading={loading} disabled={!isBalanced}>
                        Save as Draft
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default JournalEntryCreate;