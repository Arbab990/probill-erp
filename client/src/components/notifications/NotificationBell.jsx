import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { notificationService } from '../../services/notificationService.js';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
    info: 'bg-primary/10 border-primary/20 text-primary-light',
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    danger: 'bg-danger/10 border-danger/20 text-danger',
};

const TYPE_DOT = {
    info: 'bg-primary', success: 'bg-success',
    warning: 'bg-warning', danger: 'bg-danger',
};

const NotificationBell = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchCount = useCallback(async () => {
        try {
            const res = await notificationService.getCount();
            setUnreadCount(res.data.count);
        } catch { }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notificationService.getAll({ limit: 10 });
            setNotifications(res.data.data);
            setUnreadCount(res.data.unreadCount);
        } catch { }
        finally { setLoading(false); }
    }, []);

    // Poll unread count every 30 seconds
    useEffect(() => {
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [fetchCount]);

    const handleOpen = () => {
        setOpen(p => !p);
        if (!open) fetchNotifications();
    };

    const handleMarkRead = async (id, e) => {
        e.stopPropagation();
        try {
            await notificationService.markRead(id);
            setNotifications(p => p.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(p => Math.max(0, p - 1));
        } catch { }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllRead();
            setNotifications(p => p.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            toast.success('All marked as read');
        } catch { }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            await notificationService.delete(id);
            setNotifications(p => p.filter(n => n._id !== id));
        } catch { }
    };

    const handleClick = async (notif) => {
        if (!notif.isRead) {
            await notificationService.markRead(notif._id);
            setNotifications(p => p.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
            setUnreadCount(p => Math.max(0, p - 1));
        }
        if (notif.link) { setOpen(false); navigate(notif.link); }
    };

    const timeAgo = (date) => {
        const diff = Date.now() - new Date(date);
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="relative" ref={ref}>
            {/* Bell Button */}
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover transition-colors"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-10 w-80 bg-dark-card border border-dark-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
                        <div className="flex items-center gap-2">
                            <h3 className="font-display font-semibold text-slate-100 text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-danger/20 border border-danger/30 rounded-full text-[10px] font-bold text-danger">{unreadCount}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-xs text-slate-400 hover:text-success transition-colors flex items-center gap-1">
                                    <CheckCheck size={12} /> All read
                                </button>
                            )}
                            <button onClick={() => { setOpen(false); navigate('/notifications'); }} className="text-xs text-slate-400 hover:text-primary-light transition-colors flex items-center gap-1">
                                <ExternalLink size={11} /> View all
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="py-8 flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-10 text-center">
                                <Bell size={24} className="text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-500 font-body">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif._id}
                                    onClick={() => handleClick(notif)}
                                    className={`flex items-start gap-3 px-4 py-3 border-b border-dark-border/50 cursor-pointer hover:bg-dark-hover transition-colors group ${!notif.isRead ? 'bg-primary/3' : ''}`}
                                >
                                    {/* Dot */}
                                    <div className="mt-1.5 flex-shrink-0">
                                        <div className={`w-2 h-2 rounded-full ${notif.isRead ? 'bg-slate-600' : TYPE_DOT[notif.type] || 'bg-primary'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold leading-tight ${notif.isRead ? 'text-slate-400' : 'text-slate-100'}`}>{notif.title}</p>
                                        <p className="text-xs text-slate-500 font-body mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                                        <p className="text-[10px] text-slate-600 mt-1">{timeAgo(notif.createdAt)}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        {!notif.isRead && (
                                            <button onClick={e => handleMarkRead(notif._id, e)} className="p-0.5 rounded text-slate-500 hover:text-success" title="Mark read">
                                                <CheckCheck size={11} />
                                            </button>
                                        )}
                                        <button onClick={e => handleDelete(notif._id, e)} className="p-0.5 rounded text-slate-500 hover:text-danger" title="Delete">
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-dark-border bg-dark-bg/50">
                            <button
                                onClick={async () => {
                                    await notificationService.clearAll();
                                    setNotifications(p => p.filter(n => !n.isRead));
                                    toast.success('Read notifications cleared');
                                }}
                                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                Clear read notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;