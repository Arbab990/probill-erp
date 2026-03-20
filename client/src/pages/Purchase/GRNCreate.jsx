import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { purchaseService } from '../../services/purchaseService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const GRNCreate = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const poId = searchParams.get('poId');

    const [po, setPO] = useState(null);
    const [loadingPO, setLoadingPO] = useState(true);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!poId) { toast.error('No PO specified'); navigate('/purchase/orders'); return; }
        purchaseService.getPurchaseOrder(poId)
            .then(res => {
                const p = res.data.data;
                setPO(p);
                setItems(p.items.map(i => ({ description: i.description, orderedQty: i.quantity, receivedQty: i.quantity, condition: 'good', notes: '' })));
            })
            .catch(() => toast.error('Could not load PO'))
            .finally(() => setLoadingPO(false));
    }, [poId]);

    const updateItem = (idx, field, value) => {
        const updated = [...items];
        updated[idx] = { ...updated[idx], [field]: value };
        setItems(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (items.some(i => parseFloat(i.receivedQty) < 0)) { toast.error('Received quantity cannot be negative'); return; }
        setLoading(true);
        try {
            await purchaseService.createGRN({ poId, items, notes });
            toast.success('GRN created successfully');
            navigate(`/purchase/orders/${poId}`);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create GRN'); }
        finally { setLoading(false); }
    };

    if (loadingPO) return <div className="page-container"><PageLoader /></div>;
    if (!po) return <div className="page-container"><p className="text-slate-400">PO not found.</p></div>;

    const hasDiscrepancies = items.some(i => parseFloat(i.receivedQty) !== i.orderedQty);

    return (
        <div className="page-container">
            <PageHeader
                title="Create Goods Receipt"
                subtitle={`Recording delivery for ${po.poNumber} from ${po.vendor?.name}`}
                breadcrumbs={[{ label: 'Purchase Orders', href: '/purchase/orders' }, { label: po.poNumber, href: `/purchase/orders/${poId}` }, { label: 'GRN' }]}
            />

            {hasDiscrepancies && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-warning/10 border border-warning/30 rounded-xl text-warning text-sm font-body">
                    ⚠️ <span>Quantity discrepancies detected — GRN will be flagged for review.</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-4">Delivery Verification</h3>
                    <p className="text-sm text-slate-400 font-body mb-5">
                        Enter the actual quantities received. Discrepancies will be automatically flagged.
                    </p>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-dark-border">
                                    <th className="text-left text-xs text-slate-400 pb-3 font-body font-semibold uppercase tracking-wider">Item Description</th>
                                    <th className="text-right text-xs text-slate-400 pb-3 w-24 font-body font-semibold uppercase tracking-wider">Ordered</th>
                                    <th className="text-right text-xs text-slate-400 pb-3 w-28 font-body font-semibold uppercase tracking-wider px-2">Received *</th>
                                    <th className="text-left text-xs text-slate-400 pb-3 w-32 font-body font-semibold uppercase tracking-wider px-2">Condition</th>
                                    <th className="text-left text-xs text-slate-400 pb-3 font-body font-semibold uppercase tracking-wider px-2">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const disc = parseFloat(item.receivedQty) !== item.orderedQty;
                                    return (
                                        <tr key={idx} className={`border-b border-dark-border/30 ${disc ? 'bg-warning/5' : ''}`}>
                                            <td className="py-3">
                                                <p className="text-slate-200 font-medium">{item.description}</p>
                                            </td>
                                            <td className="py-3 text-right font-mono text-slate-300 pr-2">
                                                {item.orderedQty}
                                            </td>
                                            <td className="py-3 px-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.receivedQty}
                                                    onChange={e => updateItem(idx, 'receivedQty', parseFloat(e.target.value) || 0)}
                                                    className={`input-field text-xs py-1.5 text-right ${disc ? 'border-warning focus:border-warning' : ''}`}
                                                />
                                                {disc && (
                                                    <p className="text-xs text-warning mt-1">
                                                        {parseFloat(item.receivedQty) < item.orderedQty ? `Short by ${item.orderedQty - parseFloat(item.receivedQty)}` : `Over by ${parseFloat(item.receivedQty) - item.orderedQty}`}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-3 px-2">
                                                <select
                                                    value={item.condition}
                                                    onChange={e => updateItem(idx, 'condition', e.target.value)}
                                                    className="input-field text-xs py-1.5"
                                                >
                                                    <option value="good">Good</option>
                                                    <option value="damaged">Damaged</option>
                                                    <option value="partial">Partial</option>
                                                </select>
                                            </td>
                                            <td className="py-3 px-2">
                                                <input
                                                    type="text"
                                                    value={item.notes}
                                                    onChange={e => updateItem(idx, 'notes', e.target.value)}
                                                    placeholder="Optional note"
                                                    className="input-field text-xs py-1.5"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-3">Delivery Notes</h3>
                    <textarea
                        className="input-field"
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Any notes about the delivery — damaged packaging, missing docs, etc."
                    />
                </Card>

                <div className="flex gap-3 justify-end">
                    <Button type="button" variant="secondary" onClick={() => navigate(`/purchase/orders/${poId}`)}>Cancel</Button>
                    <Button type="submit" loading={loading} variant={hasDiscrepancies ? 'danger' : 'primary'}>
                        {hasDiscrepancies ? 'Submit GRN (with Discrepancies)' : 'Confirm Receipt'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default GRNCreate;