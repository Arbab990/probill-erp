import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, Mail } from 'lucide-react';
import { authService } from '../../services/authService.js';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) { toast.error('Enter your email address'); return; }
        setLoading(true);
        try {
            await authService.forgotPassword(email.trim());
            setSent(true);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Something went wrong');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
            <div className="w-full max-w-md animate-slide-up">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Zap size={16} className="text-white" />
                    </div>
                    <span className="font-display font-bold text-lg text-slate-100">ProBill ERP</span>
                </div>

                {!sent ? (
                    <>
                        <div className="mb-8">
                            <h1 className="font-display font-bold text-2xl text-slate-100">Forgot your password?</h1>
                            <p className="text-slate-400 text-sm mt-1">
                                Enter your email and we'll send you a reset link.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="input-label">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="input-field"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full h-11 flex items-center justify-center gap-2"
                            >
                                {loading
                                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
                                    : <><Mail size={16} />Send Reset Link</>
                                }
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-success/20 border border-success/30 rounded-2xl flex items-center justify-center mx-auto">
                            <Mail size={28} className="text-success" />
                        </div>
                        <h1 className="font-display font-bold text-2xl text-slate-100">Check your inbox</h1>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            If <span className="text-slate-300 font-medium">{email}</span> is registered, a password reset link has been sent. Check your spam folder if you don't see it within a few minutes.
                        </p>
                        <p className="text-xs text-slate-600">The link expires in 1 hour.</p>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
