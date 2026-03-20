import { useNavigate } from 'react-router-dom';
import { Building2, Users, ShieldCheck, User, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader.jsx';
import usePermission from '../../hooks/usePermission.js';

const SettingsHub = () => {
    const navigate = useNavigate();
    const { isSuperAdmin } = usePermission();

    const MODULES = [
        { title: 'Company Profile', sub: 'Name, address, GSTIN, bank details, fiscal year', icon: Building2, path: '/settings/company', color: 'text-primary-light', bg: 'bg-primary/10', border: 'border-primary/20', adminOnly: true },
        { title: 'User Management', sub: 'Invite users, manage roles and access', icon: Users, path: '/settings/users', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', adminOnly: true },
        { title: 'Audit Log', sub: 'Full history of all actions in the system', icon: ShieldCheck, path: '/settings/audit-log', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', adminOnly: false },
        { title: 'My Profile', sub: 'Update your name, phone and password', icon: User, path: '/settings/profile', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20', adminOnly: false },
    ];

    const visible = MODULES.filter(m => !m.adminOnly || isSuperAdmin);

    return (
        <div className="page-container">
            <PageHeader
                title="Settings"
                subtitle="Company configuration, users and system preferences"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {visible.map(mod => {
                    const Icon = mod.icon;
                    return (
                        <button
                            key={mod.path}
                            onClick={() => navigate(mod.path)}
                            className={`card text-left border ${mod.border} hover:shadow-glow-sm transition-all duration-200 group`}
                        >
                            <div className={`w-12 h-12 ${mod.bg} border ${mod.border} rounded-xl flex items-center justify-center mb-4`}>
                                <Icon size={22} className={mod.color} />
                            </div>
                            <h3 className={`font-display font-bold text-base ${mod.color} mb-1`}>{mod.title}</h3>
                            <p className="text-sm text-slate-400 font-body">{mod.sub}</p>
                            <div className="flex items-center gap-1 mt-4 text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                                Open <ArrowRight size={12} />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SettingsHub;