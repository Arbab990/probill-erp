import { useState, useEffect } from 'react';
import { settingsService } from '../../services/settingsService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const FISCAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'America/New_York', 'Europe/London', 'Asia/Singapore'];

const CompanySettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', phone: '', website: '',
        gstin: '', pan: '', tan: '', cin: '',
        fiscalYearStart: 'April', currency: 'INR', timezone: 'Asia/Kolkata',
        invoicePrefix: 'INV', invoiceFooter: '',
        address: { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' },
        bankDetails: { bankName: '', accountNo: '', ifsc: '', branch: '', accountType: 'current' },
    });

    useEffect(() => {
        settingsService.getCompany()
            .then(r => {
                const d = r.data.data;
                setForm(prev => ({
                    ...prev, ...d,
                    address: { ...prev.address, ...(d.address || {}) },
                    bankDetails: { ...prev.bankDetails, ...(d.bankDetails || {}) },
                }));
            })
            .catch(() => toast.error('Failed to load company settings'))
            .finally(() => setLoading(false));
    }, []);

    const set = (field, value) => setForm(p => ({ ...p, [field]: value }));
    const setNested = (parent, field, value) => setForm(p => ({ ...p, [parent]: { ...p[parent], [field]: value } }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsService.updateCompany(form);
            toast.success('Company settings saved');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="page-container"><PageLoader /></div>;

    return (
        <div className="page-container">
            <PageHeader
                title="Company Profile"
                subtitle="Manage your company information and preferences"
                breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Company Profile' }]}
                actions={<Button loading={saving} onClick={handleSave}>Save Changes</Button>}
            />

            <div className="space-y-5">
                {/* Basic Info */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Company Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="ProBill Technologies Pvt. Ltd." />
                        <Input label="Email" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="accounts@company.com" />
                        <Input label="Phone" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                        <Input label="Website" value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://company.com" />
                    </div>
                </Card>

                {/* Tax & Registration */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Tax & Registration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="GSTIN" value={form.gstin || ''} onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
                        <Input label="PAN" value={form.pan || ''} onChange={e => set('pan', e.target.value.toUpperCase())} placeholder="AAAAA0000A" />
                        <Input label="TAN" value={form.tan || ''} onChange={e => set('tan', e.target.value.toUpperCase())} placeholder="AAAA00000A" />
                        <Input label="CIN" value={form.cin || ''} onChange={e => set('cin', e.target.value.toUpperCase())} placeholder="U74999MH2020PTC123456" />
                    </div>
                </Card>

                {/* Address */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Registered Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input label="Address Line 1" value={form.address?.line1 || ''} onChange={e => setNested('address', 'line1', e.target.value)} placeholder="Building, Street" />
                        </div>
                        <Input label="Address Line 2" value={form.address?.line2 || ''} onChange={e => setNested('address', 'line2', e.target.value)} placeholder="Area, Landmark" />
                        <Input label="City" value={form.address?.city || ''} onChange={e => setNested('address', 'city', e.target.value)} placeholder="Mumbai" />
                        <Input label="State" value={form.address?.state || ''} onChange={e => setNested('address', 'state', e.target.value)} placeholder="Maharashtra" />
                        <Input label="PIN Code" value={form.address?.pincode || ''} onChange={e => setNested('address', 'pincode', e.target.value)} placeholder="400001" />
                    </div>
                </Card>

                {/* Bank Details */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Company Bank Account</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Bank Name" value={form.bankDetails?.bankName || ''} onChange={e => setNested('bankDetails', 'bankName', e.target.value)} placeholder="HDFC Bank" />
                        <Input label="Account Number" value={form.bankDetails?.accountNo || ''} onChange={e => setNested('bankDetails', 'accountNo', e.target.value)} placeholder="50100123456789" />
                        <Input label="IFSC Code" value={form.bankDetails?.ifsc || ''} onChange={e => setNested('bankDetails', 'ifsc', e.target.value.toUpperCase())} placeholder="HDFC0001234" />
                        <Input label="Branch" value={form.bankDetails?.branch || ''} onChange={e => setNested('bankDetails', 'branch', e.target.value)} placeholder="Andheri West, Mumbai" />
                    </div>
                </Card>

                {/* Preferences */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">System Preferences</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="input-label">Fiscal Year Start</label>
                            <select className="input-field" value={form.fiscalYearStart} onChange={e => set('fiscalYearStart', e.target.value)}>
                                {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="input-label">Currency</label>
                            <select className="input-field" value={form.currency} onChange={e => set('currency', e.target.value)}>
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="input-label">Timezone</label>
                            <select className="input-field" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <Input label="Invoice Prefix" value={form.invoicePrefix || 'INV'} onChange={e => set('invoicePrefix', e.target.value)} placeholder="INV" />
                        <div className="md:col-span-2">
                            <label className="input-label">Invoice Footer Text</label>
                            <textarea className="input-field" rows={2} value={form.invoiceFooter || ''} onChange={e => set('invoiceFooter', e.target.value)} placeholder="Thank you for your business. Payment due within 30 days." />
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end">
                    <Button loading={saving} onClick={handleSave}>Save All Changes</Button>
                </div>
            </div>
        </div>
    );
};

export default CompanySettings;