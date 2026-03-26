import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Zap, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService.js';
import useAuthStore from '../../store/authStore.js';
import toast from 'react-hot-toast';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
        if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match'); return; }
        setLoading(true);
        try {
            const res = await authService.resetPassword(token, form.newPassword);
            setDone(true);
            toast.success('Password reset successfully!');
            // Auto-login with the returned token
            if (res.data.data?.token) {
                setTimeout(() => navigate('/dashboard'), 2000);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
            <div className="w-full max-w-md animate-slide-up">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Zap size={16} className="text-white" />
                    </div>
                    <span className="font-display font-bold text-lg text-slate-100">ProBill ERP</span>
                </div>

                {!done ? (
                    <>
                        <div className="mb-8">
                            <h1 className="font-display font-bold text-2xl text-slate-100">Set new password</h1>
                            <p className="text-slate-400 text-sm mt-1">Choose a strong password for your account.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="flex items-center gap-2.5 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                                    <AlertCircle size={16} className="flex-shrink-0" />{error}
                                </div>
                            )}
                            <div>
                                <label className="input-label">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={form.newPassword}
                                        onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                                        placeholder="Min. 8 characters"
                                        className="input-field pr-12"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="input-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={form.confirmPassword}
                                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                    placeholder="Repeat new password"
                                    className="input-field"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full h-11 flex items-center justify-center gap-2"
                            >
                                {loading
                                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Resetting...</>
                                    : 'Reset Password'
                                }
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-success/20 border border-success/30 rounded-2xl flex items-center justify-center mx-auto">
                            <CheckCircle size={28} className="text-success" />
                        </div>
                        <h1 className="font-display font-bold text-2xl text-slate-100">Password reset!</h1>
                        <p className="text-slate-400 text-sm">Your password has been updated. Redirecting you to the dashboard...</p>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link to="/login" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                        Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
