import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Zap, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../../services/authService.js';
import useAuthStore from '../../store/authStore.js';
import toast from 'react-hot-toast';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setAuth } = useAuthStore();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) { setError('Please enter email and password'); return; }
        setLoading(true); setError('');
        try {
            const res = await authService.login(form);
            const { token, user } = res.data.data;
            setAuth(user, token);
            toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-dark-bg flex">
            {/* Left branding panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-dark-card border-r border-dark-border">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23334155' fill-opacity='0.5'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")" }} />
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/15 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-glow">
                            <Zap size={20} className="text-white" />
                        </div>
                        <span className="font-display font-bold text-xl text-slate-100">ProBill ERP</span>
                    </div>
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 w-fit px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                            <span className="text-xs text-primary-light font-medium">Enterprise Financial Platform</span>
                        </div>
                        <h2 className="font-display font-bold text-4xl text-slate-100 leading-tight">
                            Your finances,<br /><span className="text-gradient">intelligently managed</span>
                        </h2>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                            SAP-inspired billing workflows with AI-powered insights. P2P, O2C, R2R, and payment management in one platform.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {['Procure to Pay', 'Order to Cash', 'Payment Runs', 'AI Insights', 'RBAC'].map(f => (
                                <span key={f} className="px-3 py-1 bg-dark-hover border border-dark-border rounded-full text-xs text-slate-400">{f}</span>
                            ))}
                        </div>
                    </div>
                    <div />
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md animate-slide-up">
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Zap size={16} className="text-white" /></div>
                        <span className="font-display font-bold text-lg text-slate-100">ProBill ERP</span>
                    </div>
                    <div className="mb-8">
                        <h1 className="font-display font-bold text-2xl text-slate-100">Sign in to your account</h1>
                        <p className="text-slate-400 text-sm mt-1">No account? <Link to="/register" className="text-primary-light hover:text-primary font-medium">Create one free</Link></p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="flex items-center gap-2.5 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm animate-fade-in">
                                <AlertCircle size={16} className="flex-shrink-0" />{error}
                            </div>
                        )}
                        <div>
                            <label className="input-label">Email address</label>
                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" className="input-field" autoFocus />
                        </div>
                        <div>
                            <label className="input-label">Password</label>
                            <div className="relative">
                                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="input-field pr-12" />
                                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary w-full h-11 flex items-center justify-center gap-2">
                            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</> : <>Sign In <ArrowRight size={16} /></>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;