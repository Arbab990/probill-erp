import { useState } from 'react';
import { settingsService } from '../../services/settingsService.js';
import { authService } from '../../services/authService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import useAuth from '../../hooks/useAuth.js';
import useAuthStore from '../../store/authStore.js';
import { ROLE_LABELS } from '../../utils/constants.js';
import toast from 'react-hot-toast';

const MyProfile = () => {
    const { user, role } = useAuth();
    const { updateUser } = useAuthStore();
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    // Profile update — name and phone only → /settings/profile (correct)
    const handleProfileSave = async () => {
        if (!form.name.trim()) { toast.error('Name cannot be empty'); return; }
        setSavingProfile(true);
        try {
            await settingsService.updateProfile(form);
            updateUser({ name: form.name });
            toast.success('Profile updated');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to update profile'); }
        finally { setSavingProfile(false); }
    };

    // Password change → /auth/update-password (correct route with proper bcrypt)
    const handlePasswordChange = async () => {
        if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error('Fill all password fields'); return; }
        if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('New passwords do not match'); return; }
        if (pwForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
        if (pwForm.newPassword === pwForm.currentPassword) { toast.error('New password must be different from current password'); return; }
        setSavingPassword(true);
        try {
            await authService.updatePassword({
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            toast.success('Password changed successfully');
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to change password'); }
        finally { setSavingPassword(false); }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="My Profile"
                subtitle="Update your personal information and password"
                breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'My Profile' }]}
            />

            <div className="max-w-xl space-y-5">
                {/* Profile info */}
                <Card>
                    <div className="flex items-center gap-4 mb-5 pb-5 border-b border-dark-border">
                        <div className="w-16 h-16 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <span className="text-2xl font-bold text-primary-light">
                                {user?.name?.charAt(0)?.toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="font-display font-bold text-lg text-slate-100">{user?.name}</p>
                            <p className="text-sm text-slate-400">{user?.email}</p>
                            <p className="text-xs text-slate-500 mt-0.5 capitalize">{ROLE_LABELS[role] || role}</p>
                        </div>
                    </div>

                    <h3 className="font-display font-semibold text-slate-100 mb-4">Personal Information</h3>
                    <div className="space-y-4">
                        <Input
                            label="Full Name"
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Your name"
                        />
                        <Input
                            label="Phone"
                            value={form.phone}
                            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                            placeholder="+91 98765 43210"
                        />
                        <div>
                            <label className="input-label">Email</label>
                            <input value={user?.email || ''} disabled className="input-field opacity-50 cursor-not-allowed" />
                            <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
                        </div>
                    </div>
                    <Button className="mt-4" loading={savingProfile} onClick={handleProfileSave}>
                        Save Profile
                    </Button>
                </Card>

                {/* Change Password */}
                <Card>
                    <h3 className="font-display font-semibold text-slate-100 mb-1">Change Password</h3>
                    <p className="text-xs text-slate-500 font-body mb-4">Must be at least 8 characters</p>
                    <div className="space-y-4">
                        <Input
                            label="Current Password"
                            type="password"
                            value={pwForm.currentPassword}
                            onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                            placeholder="••••••••"
                        />
                        <Input
                            label="New Password"
                            type="password"
                            value={pwForm.newPassword}
                            onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                            placeholder="Min 8 characters"
                        />
                        <Input
                            label="Confirm New Password"
                            type="password"
                            value={pwForm.confirmPassword}
                            onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                            placeholder="Repeat new password"
                        />
                    </div>
                    <Button
                        variant="secondary"
                        className="mt-4"
                        loading={savingPassword}
                        onClick={handlePasswordChange}
                    >
                        Change Password
                    </Button>
                </Card>
            </div>
        </div>
    );
};

export default MyProfile;