import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { orderService } from '../../services/orderService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import toast from 'react-hot-toast';

const EMPTY = {
    name: '', email: '', phone: '', gstin: '', pan: '',
    creditLimit: 0, paymentTerms: 30, status: 'active', notes: '',
    address: { street: '', city: '', state: '', pincode: '' },
};

const CustomerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);

    useEffect(() => {
        if (isEdit) {
            orderService.getCustomer(id)
                .then(res => setForm(res.data.data))
                .catch(() => toast.error('Failed to load customer'))
                .finally(() => setFetching(false));
        }
    }, [id, isEdit]);

    const set = (field, value) => setForm(p => ({ ...p, [field]: value }));
    const setAddr = (field, value) => setForm(p => ({ ...p, address: { ...p.address, [field]: value } }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Customer name is required'); return; }
        setLoading(true);
        try {
            if (isEdit) { await orderService.updateCustomer(id, form); toast.success('Customer updated'); }
            else { await orderService.createCustomer(form); toast.success('Customer created'); }
            navigate('/orders/customers');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
        finally { setLoading(false); }
    };

    if (fetching) return <div className="page-container"><div className="card h-48 flex items-center justify-center"><p className="text-slate-400">Loading...</p></div></div>;

    return (
        <div className="page-container">
            <PageHeader
                title={isEdit ? 'Edit Customer' : 'Add Customer'}
                subtitle={isEdit ? `Editing ${form.name}` : 'Register a new customer account'}
                breadcrumbs={[{ label: 'Customers', href: '/orders/customers' }, { label: isEdit ? 'Edit' : 'New' }]}
            />

            <form onSubmit={handleSubmit} className="space-y-5">
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Customer Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Corp Ltd." required />
                        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="billing@acme.com" />
                        <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                        <Input label="GSTIN" value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
                        <Input label="PAN" value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())} placeholder="AAAAA0000A" />
                        <div>
                            <label className="input-label">Status</label>
                            <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="blocked">Blocked</option>
                            </select>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Credit & Payment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="input-label">Credit Limit (₹)</label>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                value={form.creditLimit === 0 ? '' : form.creditLimit}
                                onChange={e => set('creditLimit', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                className="input-field [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                placeholder="500000"
                            />
                        </div>
                        <div>
                            <label className="input-label">Payment Terms (days)</label>
                            <select className="input-field" value={form.paymentTerms} onChange={e => set('paymentTerms', parseInt(e.target.value))}>
                                {[7, 15, 30, 45, 60, 90].map(d => <option key={d} value={d}>Net {d} Days</option>)}
                            </select>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input label="Street" value={form.address?.street || ''} onChange={e => setAddr('street', e.target.value)} placeholder="123 Business Park" />
                        </div>
                        <Input label="City" value={form.address?.city || ''} onChange={e => setAddr('city', e.target.value)} placeholder="Mumbai" />
                        <Input label="State" value={form.address?.state || ''} onChange={e => setAddr('state', e.target.value)} placeholder="Maharashtra" />
                        <Input label="Pincode" value={form.address?.pincode || ''} onChange={e => setAddr('pincode', e.target.value)} placeholder="400001" />
                    </div>
                </Card>

                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-3">Notes</h3>
                    <textarea className="input-field" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this customer..." />
                </Card>

                <div className="flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => navigate('/orders/customers')}>Cancel</Button>
                    <Button type="submit" loading={loading}>{isEdit ? 'Update Customer' : 'Create Customer'}</Button>
                </div>
            </form>
        </div>
    );
};

export default CustomerForm;