import { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import { fiscalPeriodService } from '../../services/fiscalPeriodService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { formatDate } from '../../utils/formatters.js';
import usePermission from '../../hooks/usePermission.js';
import toast from 'react-hot-toast';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const FiscalPeriods = () => {
    const { isSuperAdmin, isFinanceManager } = usePermission();
    const canManage = isSuperAdmin || isFinanceManager;

    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null); // { period, action }

    const fetchPeriods = useCallback(async () => {
        try {
            const res = await fiscalPeriodService.getPeriods();
            setPeriods(res.data.data);
        } catch { toast.error('Failed to load fiscal periods'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

    const handleLock = async () => {
        const { period } = confirmModal;
        setActing(period._id);
        setConfirmModal(null);
        try {
            const res = await fiscalPeriodService.lockPeriod(period._id);
            if (res.data.warning) toast(`⚠ ${res.data.warning}`, { icon: '⚠️' });
            else toast.success(`Period "${period.name}" locked`);
            fetchPeriods();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to lock period'); }
        finally { setActing(null); }
    };

    const handleUnlock = async () => {
        const { period } = confirmModal;
        setActing(period._id);
        setConfirmModal(null);
        try {
            await fiscalPeriodService.unlockPeriod(period._id);
            toast.success(`Period "${period.name}" unlocked`);
            fetchPeriods();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to unlock period'); }
        finally { setActing(null); }
    };

    if (loading) return <div className="page-container"><PageLoader /></div>;

    // Group by year
    const byYear = periods.reduce((acc, p) => {
        if (!acc[p.year]) acc[p.year] = [];
        acc[p.year].push(p);
        return acc;
    }, {});

    return (
        <div className="page-container">
            <PageHeader
                title="Fiscal Period Management"
                subtitle="Lock closed periods to prevent backdated journal entries"
                breadcrumbs={[{ label: 'General Ledger', href: '/gl' }, { label: 'Fiscal Periods' }]}
            />

            <div className="flex items-start gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl text-sm font-body text-slate-400 mb-2">
                <Lock size={15} className="text-primary-light mt-0.5 flex-shrink-0" />
                <span>Locking a period prevents any new journal entries from being posted to dates within that period. Already-posted entries are unaffected. Only Super Admin and Finance Manager can lock/unlock periods.</span>
            </div>

            {Object.keys(byYear).sort((a, b) => b - a).map(year => (
                <Card key={year} className="p-0 overflow-hidden">
                    <div className="px-5 py-3 border-b border-dark-border bg-dark-bg">
                        <h3 className="font-display font-semibold text-slate-100">FY {year}</h3>
                    </div>
                    <div className="divide-y divide-dark-border/50">
                        {byYear[year].map(period => {
                            const isLocked = period.status === 'locked';
                            return (
                                <div key={period._id} className={`flex items-center justify-between px-5 py-3.5 ${isLocked ? 'bg-danger/5' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLocked ? 'bg-danger' : 'bg-success'}`} />
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">{period.name}</p>
                                            <p className="text-xs text-slate-500 font-body">
                                                {formatDate(period.startDate)} → {formatDate(period.endDate)}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${isLocked ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                                            {isLocked ? 'Locked' : 'Open'}
                                        </span>
                                        {isLocked && period.lockedBy && (
                                            <p className="text-xs text-slate-600 font-body hidden sm:block">
                                                by {period.lockedBy.name} · {formatDate(period.lockedAt)}
                                            </p>
                                        )}
                                    </div>
                                    {canManage && (
                                        <Button
                                            variant={isLocked ? 'secondary' : 'danger'}
                                            size="sm"
                                            icon={isLocked ? Unlock : Lock}
                                            loading={acting === period._id}
                                            onClick={() => setConfirmModal({ period, action: isLocked ? 'unlock' : 'lock' })}
                                        >
                                            {isLocked ? 'Unlock' : 'Lock'}
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            ))}

            {/* Confirmation modal */}
            <Modal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                title={confirmModal?.action === 'lock' ? 'Lock Fiscal Period' : 'Unlock Fiscal Period'}
                size="sm"
            >
                {confirmModal && (
                    <div className="space-y-4">
                        <div className={`p-3 rounded-lg border ${confirmModal.action === 'lock' ? 'bg-danger/10 border-danger/20' : 'bg-warning/10 border-warning/20'}`}>
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={14} className={confirmModal.action === 'lock' ? 'text-danger mt-0.5' : 'text-warning mt-0.5'} />
                                <div>
                                    <p className="text-sm font-semibold text-slate-200 mb-1">
                                        {confirmModal.action === 'lock' ? 'Lock' : 'Unlock'} "{confirmModal.period.name}"?
                                    </p>
                                    <p className="text-xs text-slate-400 font-body leading-relaxed">
                                        {confirmModal.action === 'lock'
                                            ? 'No new journal entries will be allowed for dates in this period. Already-posted entries are not affected.'
                                            : 'This will re-open the period for new journal entry postings. Use with caution.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button variant="secondary" onClick={() => setConfirmModal(null)}>Cancel</Button>
                            <Button
                                variant={confirmModal.action === 'lock' ? 'danger' : 'secondary'}
                                icon={confirmModal.action === 'lock' ? Lock : Unlock}
                                onClick={confirmModal.action === 'lock' ? handleLock : handleUnlock}
                            >
                                {confirmModal.action === 'lock' ? 'Lock Period' : 'Unlock Period'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default FiscalPeriods;
