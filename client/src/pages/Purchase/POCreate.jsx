import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { purchaseService } from '../../services/purchaseService.js';
import { vendorService } from '../../services/vendorService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const emptyItem = { description: '', quantity: 1, unitPrice: 0, taxRate: 18, unit: 'pcs' };

const POCreate = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const prId = searchParams.get('prId');

    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [prData, setPRData] = useState(null);

    const [form, setForm] = useState({
        vendor: '', deliveryDate: '', paymentTerms: 30,
        deliveryAddress: '', notes: '',
        items: [{ ...emptyItem }],
    });

    useEffect(() => {
        vendorService.getAll({ limit: 100, status: 'verified' }).then(r => setVendors(r.data.data));
        if (prId) {
            purchaseService.getRequisition(prId).then(r => {
                setPRData(r.data.data);
                setForm(p => ({
                    ...p,
                    items: r.data.data.items.map(i => ({
                        description: i.description,
                        quantity: i.quantity,
                        unitPrice: i.estimatedUnitPrice || 0,
                        taxRate: 18,
                        unit: i.unit || 'pcs',
                    })),
                }));
            }).catch(() => toast.error('Could not load PR data'));
        }
    }, [prId]);

    const updateItem = (idx, field, value) => {
        const items = [...form.items];
        items[idx] = { ...items[idx], [field]: value };
        setForm(p => ({ ...p, items }));
    };

    const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...emptyItem }] }));
    const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

    const subtotal = form.items.reduce((s, i) => s + ((parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0)), 0);
    const totalTax = form.items.reduce((s, i) => {
        const sub = (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0);
        return s + (sub * (parseFloat(i.taxRate) || 0) / 100);
    }, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.vendor) { toast.error('Please select a vendor'); return; }
        if (!form.deliveryDate) { toast.error('Please set a delivery date'); return; }
        if (form.items.some(i => !i.description.trim())) { toast.error('All items need a description'); return; }
        setLoading(true);
        try {
            await purchaseService.createPurchaseOrder({ ...form, prId: prId || undefined });
            toast.success('Purchase order created');
            navigate('/purchase/orders');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create PO'); }
        finally { setLoading(false); }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="New Purchase Order"
                subtitle={prData ? `Converting PR: ${prData.prNumber}` : 'Create a direct purchase order'}
                breadcrumbs={[{ label: 'Purchase Orders', href: '/purchase/orders' }, { label: 'New' }]}
            />

            {prData && (
                <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl text-sm text-primary-light font-body">
                    <span>📋</span> Pre-filled from PR <strong>{prData.prNumber}</strong> — {prData.department || 'No department'}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Order Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="input-label">Vendor *</label>
                            <select className="input-field" value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}>
                                <option value="">Select Vendor</option>
                                {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                            </select>
                        </div>
                        <Input label="Expected Delivery Date *" type="date" value={form.deliveryDate} onChange={e => setForm(p => ({ ...p, deliveryDate: e.target.value }))} />
                        <div>
                            <label className="input-label">Payment Terms</label>
                            <select className="input-field" value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: parseInt(e.target.value) }))}>
                                {[7, 15, 30, 45, 60, 90].map(d => <option key={d} value={d}>Net {d} Days</option>)}
                            </select>
                        </div>
                        <Input label="Delivery Address" value={form.deliveryAddress} onChange={e => setForm(p => ({ ...p, deliveryAddress: e.target.value }))} placeholder="Warehouse / office address" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-semibold text-slate-100">Order Items</h3>
                        <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addItem}>Add Item</Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-dark-border">
                                    {['Description', 'Qty', 'Unit', 'Unit Price', 'Tax %', 'Total', ''].map(h => (
                                        <th key={h} className="text-left text-xs text-slate-400 pb-2 font-body font-semibold uppercase tracking-wider pr-3">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {form.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-dark-border/30">
                                        <td className="py-2 pr-3">
                                            <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description" className="input-field text-xs py-1.5" required />
                                        </td>
                                        <td className="py-2 pr-3 w-20">
                                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="input-field text-xs py-1.5 text-right" />
                                        </td>
                                        <td className="py-2 pr-3 w-20">
                                            <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="input-field text-xs py-1.5">
                                                {['pcs', 'kg', 'ltr', 'box', 'set', 'hr', 'days'].map(u => <option key={u}>{u}</option>)}
                                            </select>
                                        </td>
                                        <td className="py-2 pr-3 w-28">
                                            <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} className="input-field text-xs py-1.5 text-right" />
                                        </td>
                                        <td className="py-2 pr-3 w-20">
                                            <select value={item.taxRate} onChange={e => updateItem(idx, 'taxRate', e.target.value)} className="input-field text-xs py-1.5">
                                                {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                                            </select>
                                        </td>
                                        <td className="py-2 pr-3 w-28 font-mono text-sm text-slate-200">
                                            {formatCurrency(((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)) * (1 + (parseFloat(item.taxRate) || 0) / 100))}
                                        </td>
                                        <td className="py-2 w-8">
                                            {form.items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded text-slate-500 hover:text-danger hover:bg-danger/10">
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end mt-4 pt-4 border-t border-dark-border">
                        <div className="w-56 space-y-1.5">
                            <div className="flex justify-between text-sm text-slate-400 font-body"><span>Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between text-sm text-slate-400 font-body"><span>Tax</span><span className="font-mono">{formatCurrency(totalTax)}</span></div>
                            <div className="flex justify-between font-bold text-slate-100 border-t border-dark-border pt-2"><span>Total</span><span className="font-mono text-primary-light">{formatCurrency(subtotal + totalTax)}</span></div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-3">Notes</h3>
                    <textarea className="input-field" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Special instructions, delivery notes..." />
                </Card>

                <div className="flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => navigate('/purchase/orders')}>Cancel</Button>
                    <Button type="submit" loading={loading}>Create Purchase Order</Button>
                </div>
            </form>
        </div>
    );
};

export default POCreate;