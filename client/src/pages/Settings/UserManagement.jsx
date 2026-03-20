import { useState, useEffect, useCallback } from 'react';
import { UserPlus, ShieldCheck, Ban, RotateCcw, ChevronDown } from 'lucide-react';
import { settingsService } from '../../services/settingsService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Modal from '../../components/common/Modal.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import { PageLoader } from '../../components/common/Loader.jsx';
import { ROLE_LABELS } from '../../utils/constants.js';
import toast from 'react-hot-toast';

const ROLES = ['finance_manager', 'procurement_officer', 'sales_executive', 'auditor', 'viewer'];

const ROLE_COLORS = {
    super_admin: 'badge-danger',
    finance_manager: 'badge-primary',
    procurement_officer: 'badge-warning',
    sales_executive: 'badge-success',
    auditor: 'badge-info',
    viewer: 'badge-muted',
};

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(null);
    const [inviteModal, setInviteModal] = useState(false);
    const [tempPassModal, setTempPassModal] = useState({ open: false, password: '', name: '' });
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'viewer' });
    const [inviting, setInviting] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await settingsService.getUsers();
            setUsers(res.data.data);
        } catch { toast.error('Failed to load users'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleInvite = async () => {
        if (!inviteForm.name || !inviteForm.email) { toast.error('Name and email required'); return; }
        setInviting(true);
        try {
            const res = await settingsService.inviteUser(inviteForm);
            setInviteModal(false);
            setInviteForm({ name: '', email: '', role: 'viewer' });
            setTempPassModal({ open: true, password: res.data.tempPassword, name: inviteForm.name });
            fetchUsers();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to invite user'); }
        finally { setInviting(false); }
    };

    const handleRoleChange = async (userId, newRole) => {
        setActing(userId);
        try {
            await settingsService.updateRole(userId, newRole);
            toast.success('Role updated');
            fetchUsers();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setActing(null); }
    };

    const handleToggleActive = async (userId, name, isActive) => {
        setActing(userId);
        try {
            await settingsService.toggleActive(userId);
            toast.success(`${name} ${isActive ? 'deactivated' : 'activated'}`);
            fetchUsers();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setActing(null); }
    };

    const handleResetPassword = async (userId, name) => {
        setActing(userId);
        try {
            const res = await settingsService.resetPassword(userId);
            setTempPassModal({ open: true, password: res.data.tempPassword, name });
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setActing(null); }
    };

    if (loading) return <div className="page-container"><PageLoader /></div>;

    return (
        <div className="page-container">
            <PageHeader
                title="User Management"
                subtitle={`${users.length} users in your company`}
                breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Users' }]}
                actions={<Button icon={UserPlus} onClick={() => setInviteModal(true)}>Invite User</Button>}
            />

            <Card className="p-0 overflow-hidden">
                <table className="table-base">
                    <thead><tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr></thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user._id}>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-primary-light">{user.name?.charAt(0)?.toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-200">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {user.role === 'super_admin' ? (
                                        <Badge type="custom" status="badge-danger" label="Super Admin" />
                                    ) : (
                                        <div className="relative">
                                            <select
                                                value={user.role}
                                                onChange={e => handleRoleChange(user._id, e.target.value)}
                                                disabled={acting === user._id}
                                                className="input-field py-1 text-xs pr-7 appearance-none cursor-pointer"
                                            >
                                                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                            </select>
                                            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <Badge
                                        type="custom"
                                        status={user.isActive !== false ? 'badge-success' : 'badge-muted'}
                                        label={user.isActive !== false ? 'Active' : 'Inactive'}
                                    />
                                </td>
                                <td className="text-sm text-slate-400">
                                    {new Date(user.createdAt).toLocaleDateString('en-IN')}
                                </td>
                                <td>
                                    {user.role !== 'super_admin' && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleToggleActive(user._id, user.name, user.isActive !== false)}
                                                disabled={acting === user._id}
                                                title={user.isActive !== false ? 'Deactivate' : 'Activate'}
                                                className={`p-1.5 rounded transition-colors ${user.isActive !== false ? 'text-slate-400 hover:text-danger hover:bg-danger/10' : 'text-slate-400 hover:text-success hover:bg-success/10'}`}
                                            >
                                                {user.isActive !== false ? <Ban size={14} /> : <ShieldCheck size={14} />}
                                            </button>
                                            <button
                                                onClick={() => handleResetPassword(user._id, user.name)}
                                                disabled={acting === user._id}
                                                title="Reset Password"
                                                className="p-1.5 rounded text-slate-400 hover:text-warning hover:bg-warning/10 transition-colors"
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* Invite Modal */}
            <Modal isOpen={inviteModal} onClose={() => setInviteModal(false)} title="Invite New User" size="sm">
                <div className="space-y-4">
                    <Input label="Full Name *" value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" />
                    <Input label="Email Address *" type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@company.com" />
                    <div>
                        <label className="input-label">Role *</label>
                        <select className="input-field" value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}>
                            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setInviteModal(false)}>Cancel</Button>
                        <Button className="flex-1" loading={inviting} onClick={handleInvite}>Create User</Button>
                    </div>
                </div>
            </Modal>

            {/* Temp Password Modal */}
            <Modal isOpen={tempPassModal.open} onClose={() => setTempPassModal({ open: false, password: '', name: '' })} title="User Created" size="sm">
                <div className="space-y-4 text-center">
                    <div className="w-14 h-14 bg-success/10 border border-success/20 rounded-full flex items-center justify-center mx-auto">
                        <ShieldCheck size={26} className="text-success" />
                    </div>
                    <div>
                        <p className="text-slate-200 font-medium">{tempPassModal.name} has been created!</p>
                        <p className="text-sm text-slate-400 font-body mt-1">Share this temporary password with them. They should change it after first login.</p>
                    </div>
                    <div className="bg-dark-bg border border-dark-border rounded-lg px-4 py-3">
                        <p className="text-xs text-slate-500 mb-1">Temporary Password</p>
                        <p className="font-mono font-bold text-lg text-primary-light tracking-wider">{tempPassModal.password}</p>
                    </div>
                    <Button className="w-full" onClick={() => {
                        navigator.clipboard.writeText(tempPassModal.password);
                        toast.success('Password copied to clipboard');
                    }}>Copy Password</Button>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;