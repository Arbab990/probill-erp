import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, CreditCard, BookOpen, Building2, ShoppingCart, TrendingUp, BarChart2, Settings, ChevronRight, Zap, LogOut, X, List, DollarSign, Package, Download, Users, PieChart } from 'lucide-react';
import { NAV_SECTIONS, ROLE_LABELS } from '../../utils/constants.js';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth.js';

const ICONS = { LayoutDashboard, FileText, CreditCard, BookOpen, Building2, ShoppingCart, TrendingUp, BarChart2, Settings, List, DollarSign, Package, Download, Users, PieChart };

const Sidebar = ({ isOpen, onClose }) => {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();

    const hasAccess = (roles) => !roles || roles.includes(role);

    const handleLogout = () => {
        logout();
        toast.success('Logged out');
        navigate('/login');
    };

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm" onClick={onClose} />}
            <aside className={`fixed left-0 top-0 h-full z-30 flex flex-col w-64 bg-dark-card border-r border-dark-border transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
                {/* Logo */}
                <div className="flex items-center justify-between px-5 py-5 border-b border-dark-border">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-glow-sm">
                            <Zap size={16} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-base text-slate-100 leading-tight">ProBill</h1>
                            <p className="text-[10px] text-slate-500 font-body">ERP Platform</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-1 rounded text-slate-400 hover:text-slate-100"><X size={16} /></button>
                </div>

                {/* Company */}
                {user?.company && (
                    <div className="px-5 py-3 border-b border-dark-border/50">
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider">Company</p>
                        <p className="text-sm font-medium text-slate-300 truncate mt-0.5">{user.company?.name || 'My Company'}</p>
                    </div>
                )}

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                    {NAV_SECTIONS.map((section) => {
                        const items = section.items.filter(i => hasAccess(i.roles));
                        if (!items.length) return null;
                        return (
                            <div key={section.label}>
                                <p className="section-label">{section.label}</p>
                                <ul className="space-y-0.5">
                                    {items.map((item) => {
                                        const Icon = ICONS[item.icon];
                                        return (
                                            <li key={item.path}>
                                                <NavLink to={item.path} onClick={onClose} className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}>
                                                    {Icon && <Icon size={16} className="flex-shrink-0" />}
                                                    <span className="flex-1">{item.label}</span>
                                                    <ChevronRight size={12} className="opacity-40" />
                                                </NavLink>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div className="px-3 py-4 border-t border-dark-border">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary-light">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{user?.name || 'User'}</p>
                            <p className="text-[11px] text-slate-500 capitalize">{ROLE_LABELS[role] || role}</p>
                        </div>
                        <button onClick={handleLogout} title="Logout" className="p-1.5 rounded text-slate-500 hover:text-danger hover:bg-danger/10 transition-colors">
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;