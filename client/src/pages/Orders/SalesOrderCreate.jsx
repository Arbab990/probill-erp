import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { orderService } from '../../services/orderService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const emptyItem = { description: '', quantity: '', unitPrice: '', taxRate: 18, unit: 'pcs' };

const SalesOrderCreate = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preCustomerId = searchParams.get('customerId');

    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [form, setForm] = useState({
        customer: preCustomerId || '',
        deliveryDate: '',
        deliveryAddress: '',
        notes: '',
        items: [{ ...emptyItem }],
    });

    useEffect(() => {
        orderService.getCustomers({ limit: 100, status: 'active' })
            .then(r => setCustomers(r.data.data))
            .catch(() => { });
    }, []);

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
        if (!form.customer) { toast.error('Please select a customer'); return; }
        if (!form.deliveryDate) { toast.error('Please set a delivery date'); return; }
        if (form.items.some(i => !i.description.trim())) { toast.error('All items need a description'); return; }
        setLoading(true);
        try {
            await orderService.createSalesOrder(form);
            toast.success('Sales order created');
            navigate('/orders/sales');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create order'); }
        finally { setLoading(false); }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="New Sales Order"
                subtitle="Create a customer sales order"
                breadcrumbs={[{ label: 'Sales Orders', href: '/orders/sales' }, { label: 'New' }]}
            />

            <form onSubmit={handleSubmit} className="space-y-5">
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Order Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="input-label">Customer *</label>
                            <select className="input-field" value={form.customer} onChange={e => setForm(p => ({ ...p, customer: e.target.value }))}>
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        <Input label="Expected Delivery Date *" type="date" value={form.deliveryDate} onChange={e => setForm(p => ({ ...p, deliveryDate: e.target.value }))} />
                        <div className="md:col-span-2">
                            <Input label="Delivery Address" value={form.deliveryAddress} onChange={e => setForm(p => ({ ...p, deliveryAddress: e.target.value }))} placeholder="Delivery location" />
                        </div>
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
                                            <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Product or service" className="input-field text-xs py-1.5" required />
                                        </td>
                                        <td className="py-2 pr-3 w-20">
                                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="input-field text-xs py-1.5 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" />
                                        </td>
                                        <td className="py-2 pr-3 w-20">
                                            <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="input-field text-xs py-1.5">
                                                {['pcs', 'kg', 'ltr', 'box', 'set', 'hr', 'days', 'month'].map(u => <option key={u}>{u}</option>)}
                                            </select>
                                        </td>
                                        <td className="py-2 pr-3 w-28">
                                            <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} className="input-field text-xs py-1.5 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" />
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
                            <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between text-sm text-slate-400"><span>Tax</span><span className="font-mono">{formatCurrency(totalTax)}</span></div>
                            <div className="flex justify-between font-bold text-slate-100 border-t border-dark-border pt-2"><span>Total</span><span className="font-mono text-success">{formatCurrency(subtotal + totalTax)}</span></div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-3">Notes</h3>
                    <textarea className="input-field" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Special instructions, delivery requirements..." />
                </Card>

                <div className="flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => navigate('/orders/sales')}>Cancel</Button>
                    <Button type="submit" loading={loading}>Create Sales Order</Button>
                </div>
            </form>
        </div>
    );
};

export default SalesOrderCreate;