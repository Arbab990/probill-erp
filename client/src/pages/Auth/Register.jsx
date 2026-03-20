import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { authService } from '../../services/authService.js';
import useAuthStore from '../../store/authStore.js';
import toast from 'react-hot-toast';

const FEATURES = ['P2P — Procure to Pay', 'Order to Cash management', 'AI-powered insights', '6 RBAC roles', 'Invoice PDF + email', 'Payment batch runs'];

const Register = () => {
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', companyName: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const validate = () => {
        if (!form.name.trim()) return 'Enter your full name';
        if (!form.email.trim()) return 'Enter your email';
        if (!form.companyName.trim()) return 'Enter your company name';
        if (form.password.length < 8) return 'Password must be 8+ characters';
        if (form.password !== form.confirmPassword) return 'Passwords do not match';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) { setError(err); return; }
        setLoading(true); setError('');
        try {
            const res = await authService.register({ name: form.name, email: form.email, password: form.password, companyName: form.companyName });
            const { token, user } = res.data.data;
            setAuth(user, token);
            toast.success('Company account created! Welcome to ProBill ERP.');
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-dark-bg flex">
            <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-dark-card border-r border-dark-border">
                <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-primary/15 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-secondary/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-glow"><Zap size={20} className="text-white" /></div>
                        <span className="font-display font-bold text-xl text-slate-100">ProBill ERP</span>
                    </div>
                    <div className="space-y-6">
                        <h2 className="font-display font-bold text-3xl text-slate-100 leading-tight">
                            Everything your<br /><span className="text-gradient">finance team needs</span>
                        </h2>
                        <ul className="space-y-3">
                            {FEATURES.map(f => (
                                <li key={f} className="flex items-center gap-3">
                                    <div className="w-5 h-5 bg-success/20 border border-success/30 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Check size={11} className="text-success" />
                                    </div>
                                    <span className="text-sm text-slate-300">{f}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div />
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
                <div className="w-full max-w-md animate-slide-up">
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Zap size={16} className="text-white" /></div>
                        <span className="font-display font-bold text-lg text-slate-100">ProBill ERP</span>
                    </div>
                    <div className="mb-8">
                        <h1 className="font-display font-bold text-2xl text-slate-100">Create your company account</h1>
                        <p className="text-slate-400 text-sm mt-1">Already have an account? <Link to="/login" className="text-primary-light hover:text-primary font-medium">Sign in</Link></p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2.5 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm animate-fade-in">
                                <AlertCircle size={16} className="flex-shrink-0" />{error}
                            </div>
                        )}
                        <div>
                            <label className="input-label">Company Name</label>
                            <input type="text" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Acme Corp Pvt. Ltd." className="input-field" autoFocus />
                        </div>
                        <div>
                            <label className="input-label">Your Full Name</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Smith" className="input-field" />
                        </div>
                        <div>
                            <label className="input-label">Work Email</label>
                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@acmecorp.com" className="input-field" />
                        </div>
                        <div>
                            <label className="input-label">Password</label>
                            <div className="relative">
                                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" className="input-field pr-12" />
                                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="input-label">Confirm Password</label>
                            <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repeat password" className="input-field" />
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary w-full h-11 mt-2 flex items-center justify-center gap-2">
                            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : <>Create Company Account <ArrowRight size={16} /></>}
                        </button>
                    </form>
                    <p className="mt-5 text-xs text-slate-600 text-center">Your first account automatically becomes Super Admin.</p>
                </div>
            </div>
        </div>
    );
};

export default Register;