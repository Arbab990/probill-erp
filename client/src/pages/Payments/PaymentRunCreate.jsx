import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { paymentService } from '../../services/paymentService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

const PaymentRunCreate = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [invoiceType, setInvoiceType] = useState('purchase');
    const [form, setForm] = useState({
        name: `Payment Run ${new Date().toLocaleDateString('en-IN')}`,
        type: 'outgoing',
        paymentMethod: 'neft',
        scheduledDate: new Date().toISOString().split('T')[0],
        notes: '',
    });

    useEffect(() => {
        setFetching(true);
        setSelected(new Set());
        paymentService.getPendingInvoices(invoiceType)
            .then(res => setInvoices(res.data.data))
            .catch(() => toast.error('Failed to load invoices'))
            .finally(() => setFetching(false));
    }, [invoiceType]);

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === invoices.length) setSelected(new Set());
        else setSelected(new Set(invoices.map(i => i._id)));
    };

    const selectedInvoices = invoices.filter(i => selected.has(i._id));
    const totalSelected = selectedInvoices.reduce((s, i) => s + i.balance, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selected.size === 0) { toast.error('Select at least one invoice'); return; }
        if (!form.name.trim()) { toast.error('Payment run name is required'); return; }
        setLoading(true);
        try {
            const res = await paymentService.createRun({ ...form, invoiceIds: [...selected] });
            toast.success('Payment run created');
            navigate(`/payments/runs/${res.data.data._id}`);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create payment run'); }
        finally { setLoading(false); }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="New Payment Run"
                subtitle="Select invoices and create a batch payment"
                breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'New Run' }]}
            />

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Run config */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Run Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-2">
                            <Input label="Payment Run Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. March Vendor Payments" />
                        </div>
                        <div>
                            <label className="input-label">Payment Method</label>
                            <select className="input-field" value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}>
                                <option value="neft">NEFT</option>
                                <option value="rtgs">RTGS</option>
                                <option value="imps">IMPS</option>
                                <option value="upi">UPI</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                        <div>
                            <Input label="Scheduled Date" type="date" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} />
                        </div>
                    </div>

                    {/* House Bank */}
                    <div className="mt-4 pt-4 border-t border-dark-border">
                        <p className="text-xs text-slate-500 font-body uppercase tracking-wider mb-3">House Bank (Paying Account)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input label="Bank Name" value={form.houseBank?.bankName || ''} onChange={e => setForm(p => ({ ...p, houseBank: { ...p.houseBank, bankName: e.target.value } }))} placeholder="HDFC Bank" />
                            <Input label="Account No." value={form.houseBank?.accountNo || ''} onChange={e => setForm(p => ({ ...p, houseBank: { ...p.houseBank, accountNo: e.target.value } }))} placeholder="50100123456" />
                            <Input label="IFSC" value={form.houseBank?.ifsc || ''} onChange={e => setForm(p => ({ ...p, houseBank: { ...p.houseBank, ifsc: e.target.value.toUpperCase() } }))} placeholder="HDFC0001234" />
                            <Input label="Branch" value={form.houseBank?.branch || ''} onChange={e => setForm(p => ({ ...p, houseBank: { ...p.houseBank, branch: e.target.value } }))} placeholder="Andheri West" />
                        </div>
                    </div>
                </Card>

                {/* Invoice selection */}
                <Card className="p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
                        <div>
                            <h3 className="font-display font-semibold text-slate-100">Select Invoices</h3>
                            <p className="text-xs text-slate-500 font-body mt-0.5">
                                {selected.size} selected · {formatCurrency(totalSelected)} total
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={invoiceType}
                                onChange={e => setInvoiceType(e.target.value)}
                                className="input-field w-auto text-sm py-1.5"
                            >
                                <option value="purchase">Purchase (Payables)</option>
                                <option value="sales">Sales (Receivables)</option>
                            </select>
                            <button
                                type="button"
                                onClick={toggleAll}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-body"
                            >
                                {selected.size === invoices.length && invoices.length > 0
                                    ? <><CheckSquare size={14} className="text-primary-light" /> Deselect All</>
                                    : <><Square size={14} /> Select All</>
                                }
                            </button>
                        </div>
                    </div>

                    {fetching ? (
                        <div className="py-16 flex items-center justify-center"><PageLoader /></div>
                    ) : invoices.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
                            <span className="text-3xl">🎉</span>
                            <p className="text-sm font-body">No pending {invoiceType} invoices found</p>
                        </div>
                    ) : (
                        <table className="table-base">
                            <thead>
                                <tr>
                                    <th className="w-10"></th>
                                    <th>Invoice #</th>
                                    <th>Party</th>
                                    <th className="text-right">Invoice Total</th>
                                    <th className="text-right">Balance Due</th>
                                    <th>Due Date</th>
                                    <th>Overdue</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => {
                                    const isSelected = selected.has(inv._id);
                                    return (
                                        <tr
                                            key={inv._id}
                                            onClick={() => toggleSelect(inv._id)}
                                            className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                                        >
                                            <td onClick={e => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSelect(inv._id)}
                                                    className="p-1"
                                                >
                                                    {isSelected
                                                        ? <CheckSquare size={16} className="text-primary-light" />
                                                        : <Square size={16} className="text-slate-500" />
                                                    }
                                                </button>
                                            </td>
                                            <td><span className="font-mono text-primary-light text-xs">{inv.invoiceNo}</span></td>
                                            <td>
                                                <p className="font-medium text-slate-200 text-sm">
                                                    {inv.vendor?.name || inv.customer?.name || '—'}
                                                </p>
                                            </td>
                                            <td className="text-right font-mono text-sm">{formatCurrency(inv.total)}</td>
                                            <td className="text-right font-mono text-sm font-bold text-warning">{formatCurrency(inv.balance)}</td>
                                            <td className="text-sm text-slate-400">{formatDate(inv.dueDate)}</td>
                                            <td>
                                                {inv.daysOverdue > 0 ? (
                                                    <span className="flex items-center gap-1 text-xs text-danger">
                                                        <AlertTriangle size={11} /> {inv.daysOverdue}d
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-success">Current</span>
                                                )}
                                            </td>
                                            <td><Badge type="invoice" status={inv.status} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {/* Selection summary */}
                    {selected.size > 0 && (
                        <div className="px-5 py-3 bg-primary/5 border-t border-primary/20 flex items-center justify-between">
                            <p className="text-sm font-body text-slate-300">
                                <span className="font-bold text-primary-light">{selected.size} invoices</span> selected for payment
                            </p>
                            <p className="font-mono font-bold text-primary-light">{formatCurrency(totalSelected)}</p>
                        </div>
                    )}
                </Card>

                {/* Notes */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-3">Notes</h3>
                    <textarea
                        className="input-field"
                        rows={2}
                        value={form.notes}
                        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Any notes for the approver..."
                    />
                </Card>

                <div className="flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => navigate('/payments')}>Cancel</Button>
                    <Button type="submit" loading={loading} disabled={selected.size === 0}>
                        Create Payment Run ({selected.size} invoices · {formatCurrency(totalSelected)})
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default PaymentRunCreate;