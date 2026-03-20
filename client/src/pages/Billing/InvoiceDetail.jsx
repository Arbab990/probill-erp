import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Send, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { invoiceService } from '../../services/invoiceService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Modal from '../../components/common/Modal.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import usePermission from '../../hooks/usePermission.js';
import toast from 'react-hot-toast';

const InvoiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = usePermission();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [paymentModal, setPaymentModal] = useState(false);
    const [payment, setPayment] = useState({ amount: '', method: 'bank_transfer', reference: '' });
    const [recordingPayment, setRecordingPayment] = useState(false);

    const fetchInvoice = () => {
        invoiceService.getById(id)
            .then(res => setInvoice(res.data.data))
            .catch(() => toast.error('Invoice not found'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchInvoice(); }, [id]);

    const handleSend = async () => {
        setSending(true);
        try {
            await invoiceService.send(id);
            toast.success('Invoice sent via email');
            fetchInvoice();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to send'); }
        finally { setSending(false); }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const res = await invoiceService.downloadPDF(id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoice.invoiceNo}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { toast.error('Failed to download PDF'); }
        finally { setDownloading(false); }
    };

    const handleRecordPayment = async () => {
        if (!payment.amount || parseFloat(payment.amount) <= 0) { toast.error('Enter a valid amount'); return; }
        setRecordingPayment(true);
        try {
            await invoiceService.recordPayment(id, { ...payment, amount: parseFloat(payment.amount) });
            toast.success('Payment recorded');
            setPaymentModal(false);
            setPayment({ amount: '', method: 'bank_transfer', reference: '' });
            fetchInvoice();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to record payment'); }
        finally { setRecordingPayment(false); }
    };

    if (loading) return <div className="page-container"><PageLoader /></div>;
    if (!invoice) return <div className="page-container"><p className="text-slate-400">Invoice not found.</p></div>;

    const party = invoice.vendor || invoice.customer;
    const totalPaid = invoice.paymentHistory?.reduce((s, p) => s + p.amount, 0) || 0;
    const balance = invoice.total - totalPaid;

    return (
        <div className="page-container">
            <PageHeader
                title={invoice.invoiceNo}
                subtitle={`${invoice.type === 'sales' ? 'Sales' : 'Purchase'} Invoice · ${party?.name || '—'}`}
                breadcrumbs={[{ label: 'Invoices', href: '/billing' }, { label: invoice.invoiceNo }]}
                actions={
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="secondary" icon={Download} loading={downloading} onClick={handleDownload}>PDF</Button>
                        {can('billing', 'write') && invoice.status === 'draft' && (
                            <Button icon={Send} loading={sending} onClick={handleSend}>Send Invoice</Button>
                        )}
                        {can('billing', 'write') && ['sent', 'partially_paid', 'overdue'].includes(invoice.status) && (
                            <Button variant="success" icon={DollarSign} onClick={() => setPaymentModal(true)}>Record Payment</Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    {/* Invoice header */}
                    <Card>
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Invoice Number</p>
                                <p className="font-mono font-bold text-xl text-primary-light">{invoice.invoiceNo}</p>
                            </div>
                            <Badge type="invoice" status={invoice.status} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><p className="text-slate-500 text-xs mb-1">Issue Date</p><p className="text-slate-200">{formatDate(invoice.issueDate)}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Due Date</p><p className="text-slate-200">{formatDate(invoice.dueDate)}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Bill To</p><p className="text-slate-200 font-medium">{party?.name || '—'}</p></div>
                            <div><p className="text-slate-500 text-xs mb-1">Email</p><p className="text-slate-200">{party?.email || '—'}</p></div>
                        </div>
                    </Card>

                    {/* Line items */}
                    <Card className="p-0 overflow-hidden">
                        <div className="px-5 py-4 border-b border-dark-border">
                            <h3 className="font-display font-semibold text-slate-100">Line Items</h3>
                        </div>
                        <table className="table-base">
                            <thead><tr>
                                <th>Description</th>
                                <th className="text-right">Qty</th>
                                <th className="text-right">Rate</th>
                                <th className="text-right">Tax</th>
                                <th className="text-right">Total</th>
                            </tr></thead>
                            <tbody>
                                {invoice.lineItems.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.description}</td>
                                        <td className="text-right font-mono">{item.quantity}</td>
                                        <td className="text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                                        <td className="text-right font-mono">{item.taxRate}%</td>
                                        <td className="text-right font-mono font-medium text-slate-200">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-5 py-4 border-t border-dark-border flex justify-end">
                            <div className="w-56 space-y-1.5">
                                <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span className="font-mono">{formatCurrency(invoice.subtotal)}</span></div>
                                <div className="flex justify-between text-sm text-slate-400"><span>Tax</span><span className="font-mono">{formatCurrency(invoice.totalTax)}</span></div>
                                <div className="flex justify-between font-bold text-slate-100 border-t border-dark-border pt-2"><span>Total</span><span className="font-mono text-primary-light">{formatCurrency(invoice.total)}</span></div>
                                {totalPaid > 0 && <>
                                    <div className="flex justify-between text-sm text-success"><span>Paid</span><span className="font-mono">-{formatCurrency(totalPaid)}</span></div>
                                    <div className="flex justify-between font-bold text-warning"><span>Balance Due</span><span className="font-mono">{formatCurrency(balance)}</span></div>
                                </>}
                            </div>
                        </div>
                    </Card>

                    {/* Notes */}
                    {invoice.notes && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-2">Notes</h3>
                            <p className="text-sm text-slate-400 font-body leading-relaxed">{invoice.notes}</p>
                        </Card>
                    )}
                </div>

                {/* Payment history sidebar */}
                <div className="space-y-5">
                    <Card>
                        <h3 className="font-display font-semibold text-slate-100 mb-3">Payment Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-slate-400">Total Amount</span><span className="font-mono text-slate-200 font-medium">{formatCurrency(invoice.total)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-400">Amount Paid</span><span className="font-mono text-success">{formatCurrency(totalPaid)}</span></div>
                            <div className="border-t border-dark-border pt-2 flex justify-between"><span className="text-slate-300 font-medium">Balance Due</span><span className="font-mono font-bold text-primary-light">{formatCurrency(balance)}</span></div>
                        </div>
                    </Card>

                    {invoice.paymentHistory?.length > 0 && (
                        <Card>
                            <h3 className="font-display font-semibold text-slate-100 mb-3">Payment History</h3>
                            <div className="space-y-3">
                                {invoice.paymentHistory.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm border-b border-dark-border/50 pb-2 last:border-0">
                                        <div>
                                            <p className="text-slate-200 font-medium font-mono">{formatCurrency(p.amount)}</p>
                                            <p className="text-xs text-slate-500">{p.method?.replace(/_/g, ' ')} · {formatDate(p.date)}</p>
                                            {p.reference && <p className="text-xs text-slate-500">Ref: {p.reference}</p>}
                                        </div>
                                        <CheckCircle size={14} className="text-success" />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Record Payment Modal */}
            <Modal isOpen={paymentModal} onClose={() => setPaymentModal(false)} title="Record Payment" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="input-label">Amount *</label>
                        <input type="number" step="0.01" max={balance} value={payment.amount} onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))} className="input-field [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" placeholder={`Max: ${formatCurrency(balance)}`} />
                    </div>
                    <div>
                        <label className="input-label">Payment Method</label>
                        <select className="input-field" value={payment.method} onChange={e => setPayment(p => ({ ...p, method: e.target.value }))}>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="upi">UPI</option>
                            <option value="cheque">Cheque</option>
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                        </select>
                    </div>
                    <div>
                        <label className="input-label">Reference / UTR</label>
                        <input type="text" value={payment.reference} onChange={e => setPayment(p => ({ ...p, reference: e.target.value }))} className="input-field" placeholder="Transaction ID or UTR number" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setPaymentModal(false)}>Cancel</Button>
                        <Button className="flex-1" onClick={handleRecordPayment} loading={recordingPayment}>Record Payment</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default InvoiceDetail;