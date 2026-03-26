import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, ShieldCheck, ShieldX, Building2, MapPin, CreditCard, Sparkles, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import { vendorService } from '../../services/vendorService.js';
import { aiService } from '../../services/aiService.js';
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

// Risk score colour mapping
const getRiskColor = (score) => {
    if (score === null || score === undefined) return { bar: 'bg-slate-600', text: 'text-slate-400', label: 'Not scored' };
    if (score >= 70) return { bar: 'bg-danger', text: 'text-danger', label: 'High Risk' };
    if (score >= 40) return { bar: 'bg-warning', text: 'text-warning', label: 'Medium Risk' };
    return { bar: 'bg-success', text: 'text-success', label: 'Low Risk' };
};

const VendorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = usePermission();
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [scoringAI, setScoringAI] = useState(false);
    const [aiResult, setAiResult] = useState(null);

    useEffect(() => {
        vendorService.getById(id)
            .then(res => {
                const v = res.data.data;
                setVendor(v);
                // If vendor already has a stored score, show it immediately
                if (v.riskScore !== null && v.riskScore !== undefined) {
                    setAiResult({ score: v.riskScore, reason: v.riskReason, recommendation: null });
                }
            })
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

    const handleAIRiskScore = async () => {
        setScoringAI(true);
        try {
            const res = await aiService.vendorRisk(id);
            setAiResult(res.data.data);
            if (!res.data.data.fallback) {
                toast.success('AI risk score generated');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'AI scoring failed');
        } finally { setScoringAI(false); }
    };

    if (loading) return <div className="page-container"><PageLoader /></div>;
    if (!vendor) return <div className="page-container"><p className="text-slate-400">Vendor not found.</p></div>;

    const risk = getRiskColor(aiResult?.score);

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

                    {/* AI Risk Score Card */}
                    <Card className={`border ${aiResult && !aiResult.fallback ? (aiResult.score >= 70 ? 'border-danger/30 bg-danger/5' : aiResult.score >= 40 ? 'border-warning/30 bg-warning/5' : 'border-success/30 bg-success/5') : 'border-dark-border'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-primary-light" />
                                <h3 className="font-display font-semibold text-slate-100">AI Vendor Risk Score</h3>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={Sparkles}
                                loading={scoringAI}
                                onClick={handleAIRiskScore}
                            >
                                {aiResult ? 'Re-score' : 'Score Vendor'}
                            </Button>
                        </div>

                        {!aiResult && (
                            <p className="text-sm text-slate-500 font-body">
                                Click "Score Vendor" to run an AI risk assessment. Gemini will analyze the vendor profile and return a risk score from 0 (lowest) to 100 (highest).
                            </p>
                        )}

                        {aiResult?.fallback && (
                            <p className="text-sm text-slate-500 font-body">AI scoring is unavailable — add a Gemini API key to your server .env to enable this feature.</p>
                        )}

                        {aiResult && !aiResult.fallback && (
                            <div className="space-y-3">
                                {/* Score bar */}
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs text-slate-400 font-body">Risk Level</span>
                                            <span className={`text-xs font-semibold ${risk.text}`}>{risk.label}</span>
                                        </div>
                                        <div className="w-full h-2 bg-dark-hover rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${risk.bar}`}
                                                style={{ width: `${aiResult.score}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className={`text-3xl font-bold font-mono ${risk.text} min-w-[52px] text-right`}>
                                        {aiResult.score}
                                    </div>
                                </div>

                                {/* Reason */}
                                {aiResult.reason && (
                                    <div className="flex items-start gap-2 p-3 bg-dark-bg rounded-lg border border-dark-border">
                                        {aiResult.score >= 70
                                            ? <AlertTriangle size={14} className="text-danger mt-0.5 flex-shrink-0" />
                                            : aiResult.score >= 40
                                                ? <TrendingDown size={14} className="text-warning mt-0.5 flex-shrink-0" />
                                                : <CheckCircle size={14} className="text-success mt-0.5 flex-shrink-0" />
                                        }
                                        <p className="text-sm text-slate-300 font-body">{aiResult.reason}</p>
                                    </div>
                                )}

                                {/* Transaction data used for scoring */}
                                {aiResult.meta && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Invoices', value: aiResult.meta.totalInvoices ?? '—' },
                                            { label: 'Total Spend', value: aiResult.meta.totalSpend != null ? `₹${aiResult.meta.totalSpend.toLocaleString('en-IN')}` : '—' },
                                            { label: 'Overdue Rate', value: aiResult.meta.overdueRate != null ? `${aiResult.meta.overdueRate}%` : '—' },
                                        ].map(stat => (
                                            <div key={stat.label} className="p-2 bg-dark-bg rounded-lg border border-dark-border text-center">
                                                <p className="text-xs text-slate-500 font-body mb-0.5">{stat.label}</p>
                                                <p className="text-xs font-mono font-semibold text-slate-300">{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Recommendation */}
                                {aiResult.recommendation && (
                                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                        <p className="text-xs text-slate-400 font-body mb-1 uppercase tracking-wider">Recommendation</p>
                                        <p className="text-sm text-primary-light font-body">{aiResult.recommendation}</p>
                                    </div>
                                )}
                            </div>
                        )}
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

                {/* Sidebar */}
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
                            {can('vendors', 'write') && vendor.status === 'verified' && (
                                <button onClick={() => handleStatusUpdate('blacklisted')} disabled={updating}
                                    className="w-full px-4 py-2.5 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm font-semibold hover:bg-danger/20 transition-colors disabled:opacity-50">
                                    ✕ Blacklist Vendor
                                </button>
                            )}
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