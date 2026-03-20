import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { purchaseService } from '../../services/purchaseService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const emptyItem = { description: '', quantity: 1, estimatedUnitPrice: 0, unit: 'pcs' };

const PRCreate = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ department: '', notes: '', items: [{ ...emptyItem }] });

    const updateItem = (idx, field, value) => {
        const items = [...form.items];
        items[idx] = { ...items[idx], [field]: value };
        setForm(p => ({ ...p, items }));
    };

    const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...emptyItem }] }));
    const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

    const totalEstimated = form.items.reduce((s, i) => s + ((parseFloat(i.quantity) || 0) * (parseFloat(i.estimatedUnitPrice) || 0)), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.items.length === 0) { toast.error('Add at least one item'); return; }
        if (form.items.some(i => !i.description.trim())) { toast.error('All items need a description'); return; }
        setLoading(true);
        try {
            await purchaseService.createRequisition(form);
            toast.success('Purchase requisition created');
            navigate('/purchase/requisitions');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create PR'); }
        finally { setLoading(false); }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="New Purchase Requisition"
                subtitle="Request items for procurement approval"
                breadcrumbs={[{ label: 'Requisitions', href: '/purchase/requisitions' }, { label: 'New' }]}
            />

            <form onSubmit={handleSubmit} className="space-y-5">
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Requisition Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Department" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="e.g. IT, Finance, Operations" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-semibold text-slate-100">Requested Items</h3>
                        <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addItem}>Add Item</Button>
                    </div>

                    <div className="space-y-3">
                        {form.items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-3 items-end p-3 bg-dark-bg rounded-lg border border-dark-border/50">
                                <div className="col-span-12 md:col-span-5">
                                    <label className="input-label">Description *</label>
                                    <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="What do you need?" className="input-field" required />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <label className="input-label">Qty</label>
                                    <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="input-field [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <label className="input-label">Unit</label>
                                    <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="input-field">
                                        {['pcs', 'kg', 'ltr', 'box', 'set', 'hr', 'days'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <label className="input-label">Est. Price</label>
                                    <input type="number" min="0" step="0.01" value={item.estimatedUnitPrice} onChange={e => updateItem(idx, 'estimatedUnitPrice', e.target.value)} className="input-field [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" />
                                </div>
                                <div className="col-span-12 md:col-span-1 flex justify-end">
                                    {form.items.length > 1 && (
                                        <button type="button" onClick={() => removeItem(idx)} className="p-2 rounded text-slate-500 hover:text-danger hover:bg-danger/10 transition-colors mb-0.5">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end mt-4 pt-4 border-t border-dark-border">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400 font-body">Total Estimated:</span>
                            <span className="font-mono font-bold text-lg text-primary-light">{formatCurrency(totalEstimated)}</span>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-3">Notes</h3>
                    <textarea className="input-field" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional context or urgency details..." />
                </Card>

                <div className="flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => navigate('/purchase/requisitions')}>Cancel</Button>
                    <Button type="submit" loading={loading}>Create Requisition</Button>
                </div>
            </form>
        </div>
    );
};

export default PRCreate;