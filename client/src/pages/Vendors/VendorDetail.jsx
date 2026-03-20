import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, ShieldCheck, ShieldX, Building2, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { vendorService } from '../../services/vendorService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import usePermission from '../../hooks/usePermission.js';
import { formatDate } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const InfoRow = ({ label, value }) => (
    <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-slate-500 font-body">{label}</span>
        <span className="text-sm text-slate-200 font-body truncate" title={value || ''}>{value || '—'}</span>
    </div>
);

const VendorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = usePermission();
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        vendorService.getById(id)
            .then(res => setVendor(res.data.data))
            .catch(() => toast.error('Vendor not found'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleStatusUpdate = async (status) => {
        setUpdating(true);
        try {
            const res = await vendorService.updateStatus(id, status);
            setVendor(res.data.data);
            toast.success(`Vendor ${status}`);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to update status'); }
        finally { setUpdating(false); }
    };

    if (loading) return <div className="page-container"><PageLoader /></div>;
    if (!vendor) return <div className="page-container"><p className="text-slate-400">Vendor not found.</p></div>;

    return (
        <div className="page-container">
            <PageHeader
                title={vendor.name}
                subtitle={`${vendor.vendorCode} · ${vendor.category}`}
                breadcrumbs={[{ label: 'Vendors', href: '/vendors' }, { label: vendor.name }]}
                actions={
                    <div className="flex gap-2">
                        {can('vendors', 'write') && vendor.status === 'pending' && (
                            <Button variant="success" icon={ShieldCheck} loading={updating} onClick={() => handleStatusUpdate('verified')}>Verify</Button>
                        )}
                        {can('vendors', 'write') && vendor.status === 'verified' && (
                            <Button variant="danger" icon={ShieldX} loading={updating} onClick={() => handleStatusUpdate('blacklisted')}>Blacklist</Button>
                        )}
                        {can('vendors', 'write') && (
                            <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/vendors/${id}/edit`)}>Edit</Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Main info */}
                <div className="lg:col-span-2 space-y-5">
                    <Card>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                                    <Building2 size={22} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-display font-bold text-lg text-slate-100">{vendor.name}</h2>
                                    <p className="text-sm text-slate-400">{vendor.vendorCode}</p>
                                </div>
                            </div>
                            <Badge type="vendor" status={vendor.status} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <InfoRow label="Email" value={vendor.email} />
                            <InfoRow label="Phone" value={vendor.phone} />
                            <InfoRow label="Category" value={vendor.category} />
                            <InfoRow label="GSTIN" value={vendor.gstin} />
                            <InfoRow label="PAN" value={vendor.pan} />
                            <InfoRow label="Payment Terms" value={`Net ${vendor.paymentTerms} days`} />
                            <InfoRow label="Added On" value={formatDate(vendor.createdAt)} />
                            <InfoRow label="Added By" value={vendor.createdBy?.name} />
                        </div>
                    </Card>

                    {/* Address */}
                    {(vendor.address?.street || vendor.address?.city) && (
                        <Card>
                            <div className="flex items-center gap-2 mb-3">
                                <MapPin size={16} className="text-primary" />
                                <h3 className="font-display font-semibold text-slate-100">Address</h3>
                            </div>
                            <p className="text-sm text-slate-300 font-body">
                                {[vendor.address.street, vendor.address.city, vendor.address.state, vendor.address.pincode].filter(Boolean).join(', ')}
                            </p>
                        </Card>
                    )}

                    {/* Bank details */}
                    {vendor.bankDetails?.bankName && (
                        <Card>
                            <div className="flex items-center gap-2 mb-3">
                                <CreditCard size={16} className="text-primary" />
                                <h3 className="font-display font-semibold text-slate-100">Bank Details</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoRow label="Bank" value={vendor.bankDetails.bankName} />
                                <InfoRow label="Account No." value={vendor.bankDetails.accountNo} />
                                <InfoRow label="IFSC" value={vendor.bankDetails.ifsc} />
                                <InfoRow label="Branch" value={vendor.bankDetails.branch} />
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar info */}
                <div className="space-y-5">
                    {vendor.notes && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-2">Notes</h3>
                            <p className="text-sm text-slate-400 font-body leading-relaxed">{vendor.notes}</p>
                        </Card>
                    )}
                    <Card>
                        <h3 className="font-display font-semibold text-slate-100 mb-3">Quick Actions</h3>
                        <div className="space-y-2">

                            {/* Pending → Approve / Under Review / Blacklist */}
                            {can('vendors', 'write') && vendor.status === 'pending' && (<>
                                <button onClick={() => handleStatusUpdate('verified')} disabled={updating}
                                    className="w-full px-4 py-2.5 bg-success/10 border border-success/20 text-success rounded-lg text-sm font-semibold hover:bg-success/20 transition-colors disabled:opacity-50">
                                    ✓ Approve Vendor
                                </button>
                                <button onClick={() => handleStatusUpdate('under_review')} disabled={updating}
                                    className="w-full px-4 py-2.5 bg-warning/10 border border-warning/20 text-warning rounded-lg text-sm font-semibold hover:bg-warning/20 transition-colors disabled:opacity-50">
                                    ⟳ Mark Under Review
                                </button>
                                <button onClick={() => handleStatusUpdate('blacklisted')} disabled={updating}
                                    className="w-full px-4 py-2.5 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm font-semibold hover:bg-danger/20 transition-colors disabled:opacity-50">
                                    ✕ Blacklist Vendor
                                </button>
                            </>)}

                            {/* Under Review → Approve or Blacklist */}
                            {can('vendors', 'write') && vendor.status === 'under_review' && (<>
                                <button onClick={() => handleStatusUpdate('verified')} disabled={updating}
                                    className="w-full px-4 py-2.5 bg-success/10 border border-success/20 text-success rounded-lg text-sm font-semibold hover:bg-success/20 transition-colors disabled:opacity-50">
                                    ✓ Approve Vendor
                                </button>
                                <button onClick={() => handleStatusUpdate('blacklisted')} disabled={updating}
                                    className="w-full px-4 py-2.5 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm font-semibold hover:bg-danger/20 transition-colors disabled:opacity-50">
                                    ✕ Blacklist Vendor
                                </button>
                            </>)}

                            {/* Verified → Blacklist */}
                            {can('vendors', 'write') && vendor.status === 'verified' && (
                                <button onClick={() => handleStatusUpdate('blacklisted')} disabled={updating}
                                    className="w-full px-4 py-2.5 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm font-semibold hover:bg-danger/20 transition-colors disabled:opacity-50">
                                    ✕ Blacklist Vendor
                                </button>
                            )}

                            {/* Blacklisted → Reinstate */}
                            {can('vendors', 'write') && vendor.status === 'blacklisted' && (
                                <button onClick={() => handleStatusUpdate('verified')} disabled={updating}
                                    className="w-full px-4 py-2.5 bg-success/10 border border-success/20 text-success rounded-lg text-sm font-semibold hover:bg-success/20 transition-colors disabled:opacity-50">
                                    ✓ Reinstate Vendor
                                </button>
                            )}

                            <Button variant="secondary" className="w-full" onClick={() => navigate(`/billing?vendor=${id}`)}>View Invoices</Button>
                            <Button variant="secondary" className="w-full" onClick={() => navigate(`/billing/new?type=purchase&vendor=${id}`)}>Create Invoice</Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default VendorDetail;