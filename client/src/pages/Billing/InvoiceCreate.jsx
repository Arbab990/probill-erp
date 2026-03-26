import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { invoiceService } from '../../services/invoiceService.js';
import { vendorService } from '../../services/vendorService.js';
import { orderService } from '../../services/orderService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const emptyItem = { description: '', quantity: 1, unitPrice: 0, taxRate: 0, taxAmount: 0, total: 0 };

const InvoiceCreate = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [customers, setCustomers] = useState([]);

    const [form, setForm] = useState({
        type: searchParams.get('type') || 'sales',
        vendor: searchParams.get('vendor') || '',
        customer: searchParams.get('customer') || '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
        lineItems: [{ ...emptyItem }],
    });

    // Recurring invoice config
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringConfig, setRecurringConfig] = useState({
        frequency: 'monthly',
        nextDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    });

    // Load vendors (for purchase invoices) and customers (for sales invoices)
    useEffect(() => {
        vendorService.getAll({ limit: 100, status: 'verified' })
            .then(res => setVendors(res.data.data))
            .catch(() => { });
        orderService.getCustomers({ limit: 100, status: 'active' })
            .then(res => setCustomers(res.data.data))
            .catch(() => { });
    }, []);

    // When type switches, clear the party field that no longer applies
    const handleTypeChange = (newType) => {
        setForm(p => ({
            ...p,
            type: newType,
            vendor: newType === 'purchase' ? p.vendor : '',
            customer: newType === 'sales' ? p.customer : '',
        }));
    };

    // Auto-set due date from selected customer payment terms
    const handleCustomerChange = (customerId) => {
        const customer = customers.find(c => c._id === customerId);
        if (customer?.paymentTerms && !form.dueDate) {
            const due = new Date();
            due.setDate(due.getDate() + customer.paymentTerms);
            setForm(p => ({
                ...p,
                customer: customerId,
                dueDate: due.toISOString().split('T')[0],
            }));
        } else {
            setForm(p => ({ ...p, customer: customerId }));
        }
    };

    const updateItem = (idx, field, value) => {
        const items = [...form.lineItems];
        items[idx] = { ...items[idx], [field]: value };
        const qty = parseFloat(items[idx].quantity) || 0;
        const price = parseFloat(items[idx].unitPrice) || 0;
        const tax = parseFloat(items[idx].taxRate) || 0;
        const subtotal = qty * price;
        const taxAmt = (subtotal * tax) / 100;
        items[idx].taxAmount = taxAmt;
        items[idx].total = subtotal + taxAmt;
        setForm(prev => ({ ...prev, lineItems: items }));
    };

    const addItem = () => setForm(prev => ({ ...prev, lineItems: [...prev.lineItems, { ...emptyItem }] }));
    const removeItem = (idx) => setForm(prev => ({ ...prev, lineItems: prev.lineItems.filter((_, i) => i !== idx) }));

    const subtotal = form.lineItems.reduce((s, i) => s + (parseFloat(i.quantity) * parseFloat(i.unitPrice) || 0), 0);
    const totalTax = form.lineItems.reduce((s, i) => s + (parseFloat(i.taxAmount) || 0), 0);
    const total = subtotal + totalTax;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.dueDate) { toast.error('Please set a due date'); return; }
        if (form.lineItems.length === 0) { toast.error('Add at least one line item'); return; }
        if (form.type === 'purchase' && !form.vendor) {
            toast.error('Select a vendor for purchase invoices'); return;
        }
        if (form.type === 'sales' && !form.customer) {
            toast.error('Select a customer for sales invoices'); return;
        }
        // Strip the irrelevant party field before sending
        const payload = { ...form };
        if (form.type === 'sales') delete payload.vendor;
        if (form.type === 'purchase') delete payload.customer;
        if (isRecurring) {
            payload.isRecurring = true;
            payload.recurringConfig = recurringConfig;
        }

        setLoading(true);
        try {
            await invoiceService.create(payload);
            toast.success('Invoice created successfully');
            navigate('/billing');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create invoice'); }
        finally { setLoading(false); }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="New Invoice"
                subtitle="Create a sales or purchase invoice"
                breadcrumbs={[{ label: 'Invoices', href: '/billing' }, { label: 'New' }]}
            />

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Invoice Details */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Invoice Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Type selector */}
                        <div>
                            <label className="input-label">Invoice Type</label>
                            <select
                                className="input-field"
                                value={form.type}
                                onChange={e => handleTypeChange(e.target.value)}
                            >
                                <option value="sales">Sales Invoice</option>
                                <option value="purchase">Purchase Invoice</option>
                            </select>
                        </div>

                        {/* Customer selector — sales invoices */}
                        {form.type === 'sales' && (
                            <div>
                                <label className="input-label">Customer *</label>
                                <select
                                    className="input-field"
                                    value={form.customer}
                                    onChange={e => handleCustomerChange(e.target.value)}
                                >
                                    <option value="">Select Customer</option>
                                    {customers.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Vendor selector — purchase invoices */}
                        {form.type === 'purchase' && (
                            <div>
                                <label className="input-label">Vendor *</label>
                                <select
                                    className="input-field"
                                    value={form.vendor}
                                    onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
                                >
                                    <option value="">Select Vendor</option>
                                    {vendors.map(v => (
                                        <option key={v._id} value={v._id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <Input
                            label="Issue Date"
                            type="date"
                            value={form.issueDate}
                            onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))}
                        />
                        <Input
                            label="Due Date *"
                            type="date"
                            value={form.dueDate}
                            onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                            required
                        />
                    </div>
                </Card>

                {/* Line Items */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-semibold text-slate-100">Line Items</h3>
                        <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addItem}>
                            Add Item
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-dark-border">
                                    <th className="text-left text-xs text-slate-400 pb-2 font-body font-semibold uppercase tracking-wider pr-3">Description</th>
                                    <th className="text-right text-xs text-slate-400 pb-2 w-20 font-body font-semibold uppercase tracking-wider px-2">Qty</th>
                                    <th className="text-right text-xs text-slate-400 pb-2 w-28 font-body font-semibold uppercase tracking-wider px-2">Unit Price</th>
                                    <th className="text-right text-xs text-slate-400 pb-2 w-20 font-body font-semibold uppercase tracking-wider px-2">Tax %</th>
                                    <th className="text-right text-xs text-slate-400 pb-2 w-28 font-body font-semibold uppercase tracking-wider px-2">Total</th>
                                    <th className="w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.lineItems.map((item, idx) => (
                                    <tr key={idx} className="border-b border-dark-border/30">
                                        <td className="py-2 pr-3">
                                            <input
                                                value={item.description}
                                                onChange={e => updateItem(idx, 'description', e.target.value)}
                                                placeholder="Item description"
                                                className="input-field text-xs py-1.5"
                                                required
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number" min="0"
                                                value={item.quantity}
                                                onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                className="input-field text-xs py-1.5 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number" min="0" step="0.01"
                                                value={item.unitPrice}
                                                onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                className="input-field text-xs py-1.5 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <select
                                                value={item.taxRate}
                                                onChange={e => updateItem(idx, 'taxRate', e.target.value)}
                                                className="input-field text-xs py-1.5"
                                            >
                                                <option value="0">0%</option>
                                                <option value="5">5%</option>
                                                <option value="12">12%</option>
                                                <option value="18">18%</option>
                                                <option value="28">28%</option>
                                            </select>
                                        </td>
                                        <td className="py-2 px-2 text-right font-mono text-sm text-slate-200">
                                            {formatCurrency(item.total)}
                                        </td>
                                        <td className="py-2 pl-2">
                                            {form.lineItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="p-1 rounded text-slate-500 hover:text-danger hover:bg-danger/10 transition-colors"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mt-4">
                        <div className="w-56 space-y-1.5">
                            <div className="flex justify-between text-sm text-slate-400 font-body">
                                <span>Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-400 font-body">
                                <span>Tax</span><span className="font-mono">{formatCurrency(totalTax)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-slate-100 border-t border-dark-border pt-2">
                                <span>Total</span>
                                <span className="font-mono text-primary-light">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Recurring invoice config */}
                <Card className={isRecurring ? 'border-primary/30 bg-primary/5' : ''}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-display font-semibold text-slate-100">Recurring Invoice</h3>
                            <p className="text-xs text-slate-500 font-body mt-0.5">Auto-generate this invoice on a schedule</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsRecurring(p => !p)}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isRecurring ? 'bg-primary' : 'bg-dark-hover border border-dark-border'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {isRecurring && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dark-border">
                            <div>
                                <label className="input-label">Frequency</label>
                                <select
                                    className="input-field"
                                    value={recurringConfig.frequency}
                                    onChange={e => setRecurringConfig(p => ({ ...p, frequency: e.target.value }))}
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly (every 3 months)</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">First Recurrence Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={recurringConfig.nextDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setRecurringConfig(p => ({ ...p, nextDate: e.target.value }))}
                                />
                            </div>
                            <div className="md:col-span-2 flex items-start gap-2 px-3 py-2.5 bg-dark-bg border border-dark-border rounded-lg">
                                <span className="text-primary-light text-sm flex-shrink-0 mt-0.5">ℹ</span>
                                <p className="text-xs text-slate-400 font-body">
                                    A new draft invoice will be auto-generated on {recurringConfig.nextDate || 'the selected date'} and every {recurringConfig.frequency === 'quarterly' ? '3 months' : recurringConfig.frequency.replace('ly', '')} thereafter. You'll receive a notification each time one is created.
                                </p>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Notes */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-3">Notes</h3>
                    <textarea
                        className="input-field"
                        rows={3}
                        value={form.notes}
                        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Payment instructions, terms, or any other notes..."
                    />
                </Card>

                <div className="flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => navigate('/billing')}>Cancel</Button>
                    <Button type="submit" loading={loading}>Create Invoice</Button>
                </div>
            </form>
        </div>
    );
};

export default InvoiceCreate;

