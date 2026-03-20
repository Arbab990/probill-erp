import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, LogOut, Settings } from 'lucide-react';
import useAuth from '../../hooks/useAuth.js';
import { ROLE_LABELS } from '../../utils/constants.js';
import NotificationBell from '../notifications/NotificationBell.jsx';
import GlobalSearch from '../search/GlobalSearch.jsx';
import toast from 'react-hot-toast';

const Topbar = ({ onMenuClick }) => {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const handleLogout = () => { logout(); toast.success('Logged out'); navigate('/login'); };

    return (
        <header className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover">
                    <Menu size={20} />
                </button>
                <div className="hidden md:block">
                    <GlobalSearch />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <NotificationBell />

                <div className="relative">
                    <button onClick={() => setOpen(!open)} className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-dark-hover transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary-light">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-medium text-slate-200 leading-tight">{user?.name?.split(' ')[0]}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{ROLE_LABELS[role] || role}</p>
                        </div>
                        <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>

                    {open && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                            <div className="absolute right-0 top-full mt-2 w-48 bg-dark-card border border-dark-border rounded-xl shadow-card z-20 py-1 animate-slide-up">
                                <div className="px-4 py-2.5 border-b border-dark-border/50">
                                    <p className="text-sm font-medium text-slate-200">{user?.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                </div>
                                <button onClick={() => { navigate('/admin'); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-slate-100 hover:bg-dark-hover transition-colors">
                                    <Settings size={14} /> Settings
                                </button>
                                <div className="border-t border-dark-border/50 mt-1 pt-1">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors">
                                        <LogOut size={14} /> Logout
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Topbar;