import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, RefreshCw } from 'lucide-react';
import { notificationService } from '../../services/notificationService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const TYPE_STYLES = {
    info: 'border-l-primary bg-primary/3',
    success: 'border-l-success bg-success/3',
    warning: 'border-l-warning bg-warning/3',
    danger: 'border-l-danger bg-danger/3',
};

const TYPE_DOT = {
    info: 'bg-primary', success: 'bg-success',
    warning: 'bg-warning', danger: 'bg-danger',
};

const NotificationCenter = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [acting, setActing] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notificationService.getAll({ page, limit: 20, unreadOnly });
            setNotifications(res.data.data);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load notifications'); }
        finally { setLoading(false); }
    }, [page, unreadOnly]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleMarkAllRead = async () => {
        setActing(true);
        try {
            await notificationService.markAllRead();
            toast.success('All marked as read');
            fetch();
        } catch { }
        finally { setActing(false); }
    };

    const handleClearAll = async () => {
        setActing(true);
        try {
            await notificationService.clearAll();
            toast.success('Read notifications cleared');
            fetch();
        } catch { }
        finally { setActing(false); }
    };

    const handleTriggerOverdue = async () => {
        setActing(true);
        try {
            const res = await notificationService.triggerOverdueCheck();
            toast.success(res.data.message);
            fetch();
        } catch { }
        finally { setActing(false); }
    };

    const handleClick = async (notif) => {
        if (!notif.isRead) {
            await notificationService.markRead(notif._id);
            setNotifications(p => p.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        }
        if (notif.link) navigate(notif.link);
    };

    const timeAgo = (date) => {
        const diff = Date.now() - new Date(date);
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins} minutes ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} hours ago`;
        return `${Math.floor(hrs / 24)} days ago`;
    };

    return (
        <div className="page-container">
            <PageHeader
                title="Notifications"
                subtitle={`${pagination.total || 0} total notifications`}
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]}
                actions={
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" icon={RefreshCw} loading={acting} onClick={handleTriggerOverdue}>
                            Check Overdue
                        </Button>
                        <Button variant="secondary" size="sm" icon={CheckCheck} onClick={handleMarkAllRead}>
                            Mark All Read
                        </Button>
                        <Button variant="danger" size="sm" icon={Trash2} onClick={handleClearAll}>
                            Clear Read
                        </Button>
                    </div>
                }
            />

            {/* Filters */}
            <div className="flex gap-2">
                {[false, true].map(val => (
                    <button
                        key={String(val)}
                        onClick={() => { setUnreadOnly(val); setPage(1); }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-body border transition-colors ${unreadOnly === val
                            ? 'bg-primary/20 border-primary/40 text-primary-light'
                            : 'border-dark-border text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        {val ? 'Unread Only' : 'All'}
                    </button>
                ))}
            </div>

            {loading ? <PageLoader /> : (
                <div className="space-y-2">
                    {notifications.length === 0 ? (
                        <div className="card flex flex-col items-center py-16 gap-3">
                            <Bell size={36} className="text-slate-600" />
                            <p className="text-slate-400 font-body">No notifications here</p>
                        </div>
                    ) : notifications.map(notif => (
                        <div
                            key={notif._id}
                            onClick={() => handleClick(notif)}
                            className={`card border-l-4 cursor-pointer hover:bg-dark-hover transition-colors ${TYPE_STYLES[notif.type] || TYPE_STYLES.info} ${!notif.isRead ? 'shadow-glow-sm' : 'opacity-70'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${notif.isRead ? 'bg-slate-600' : TYPE_DOT[notif.type] || 'bg-primary'}`} />
                                <div className="flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`font-semibold text-sm ${notif.isRead ? 'text-slate-400' : 'text-slate-100'}`}>{notif.title}</p>
                                        <span className="text-xs text-slate-600 flex-shrink-0">{timeAgo(notif.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-slate-400 font-body mt-1">{notif.message}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-600 font-mono">{notif.module}</span>
                                        {notif.sourceRef && <span className="text-[10px] font-mono text-slate-600">{notif.sourceRef}</span>}
                                        {notif.link && <span className="text-[10px] text-primary-light">Click to view →</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={20} onPageChange={setPage} />
        </div>
    );
};

export default NotificationCenter;