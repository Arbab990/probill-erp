import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { vendorService } from '../../services/vendorService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import toast from 'react-hot-toast';

const EMPTY = {
    name: '', email: '', phone: '', gstin: '', pan: '', category: 'services',
    paymentTerms: 30, notes: '',
    address: { street: '', city: '', state: '', pincode: '' },
    bankDetails: { bankName: '', accountNo: '', ifsc: '', branch: '' },
};

const VendorForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);

    useEffect(() => {
        if (isEdit) {
            vendorService.getById(id)
                .then(res => setForm(res.data.data))
                .catch(() => toast.error('Failed to load vendor'))
                .finally(() => setFetching(false));
        }
    }, [id, isEdit]);

    const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
    const setNested = (parent, field, value) => setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Vendor name is required'); return; }
        setLoading(true);
        try {
            if (isEdit) { await vendorService.update(id, form); toast.success('Vendor updated'); }
            else { await vendorService.create(form); toast.success('Vendor created'); }
            navigate('/vendors');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save vendor'); }
        finally { setLoading(false); }
    };

    if (fetching) return <div className="page-container"><div className="card h-64 flex items-center justify-center"><p className="text-slate-400">Loading...</p></div></div>;

    return (
        <div className="page-container">
            <PageHeader
                title={isEdit ? 'Edit Vendor' : 'Add Vendor'}
                subtitle={isEdit ? `Editing ${form.name}` : 'Register a new vendor/supplier'}
                breadcrumbs={[{ label: 'Vendors', href: '/vendors' }, { label: isEdit ? 'Edit' : 'New' }]}
            />

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Basic Info */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Vendor Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Supplies Ltd." required />
                        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="vendor@company.com" />
                        <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                        <div>
                            <label className="input-label">Category</label>
                            <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
                                <option value="goods">Goods</option>
                                <option value="services">Services</option>
                                <option value="both">Both</option>
                            </select>
                        </div>
                        <Input label="GSTIN" value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
                        <Input label="PAN" value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())} placeholder="AAAAA0000A" />
                        <div>
                            <label className="input-label">Payment Terms (days)</label>
                            <select className="input-field" value={form.paymentTerms} onChange={e => set('paymentTerms', parseInt(e.target.value))}>
                                {[7, 15, 30, 45, 60, 90].map(d => <option key={d} value={d}>Net {d} Days</option>)}
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Address */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input label="Street" value={form.address.street} onChange={e => setNested('address', 'street', e.target.value)} placeholder="123 Business Park" />
                        </div>
                        <Input label="City" value={form.address.city} onChange={e => setNested('address', 'city', e.target.value)} placeholder="Mumbai" />
                        <Input label="State" value={form.address.state} onChange={e => setNested('address', 'state', e.target.value)} placeholder="Maharashtra" />
                        <Input label="Pincode" value={form.address.pincode} onChange={e => setNested('address', 'pincode', e.target.value)} placeholder="400001" />
                    </div>
                </Card>

                {/* Bank Details */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Bank Name" value={form.bankDetails.bankName} onChange={e => setNested('bankDetails', 'bankName', e.target.value)} placeholder="HDFC Bank" />
                        <Input label="Account Number" value={form.bankDetails.accountNo} onChange={e => setNested('bankDetails', 'accountNo', e.target.value)} placeholder="50100123456789" />
                        <Input label="IFSC Code" value={form.bankDetails.ifsc} onChange={e => setNested('bankDetails', 'ifsc', e.target.value.toUpperCase())} placeholder="HDFC0001234" />
                        <Input label="Branch" value={form.bankDetails.branch} onChange={e => setNested('bankDetails', 'branch', e.target.value)} placeholder="Andheri West" />
                    </div>
                </Card>

                {/* Notes */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Notes</h3>
                    <textarea className="input-field" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes about this vendor..." />
                </Card>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => navigate('/vendors')}>Cancel</Button>
                    <Button type="submit" loading={loading}>{isEdit ? 'Update Vendor' : 'Create Vendor'}</Button>
                </div>
            </form>
        </div>
    );
};

export default VendorForm;