import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FaIndustry } from 'react-icons/fa';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import toast from 'react-hot-toast';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(form.email, form.password);
        if (result.success) {
            toast.success('Welcome back!');
            navigate('/dashboard');
        } else {
            toast.error(result.message);
        }
    };

    const quickLogin = (email, password) => setForm({ email, password });

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{
                backgroundImage: `linear-gradient(135deg, rgba(10,22,40,0.95) 40%, rgba(21,45,74,0.90) 100%),
                    url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1400&q=80')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="w-full max-w-sm"
            >
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    {/* Logo */}
                    <div className="text-center mb-7">
                        <div className="inline-flex p-3.5 bg-navy-700 rounded-2xl mb-4 shadow-lg">
                            <FaIndustry className="text-white" size={28} />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">Factory Management</h1>
                        <p className="text-slate-500 text-sm mt-1">Sign in to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-1.5">Email</label>
                            <div className="relative">
                                <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="form-input pl-9"
                                    placeholder="admin@factory.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-1.5">Password</label>
                            <div className="relative">
                                <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="form-input pl-9 pr-10"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full mt-1 py-3"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Quick login */}
                    <div className="mt-5 pt-5 border-t border-slate-100">
                        <p className="text-slate-400 text-xs text-center mb-3">Quick login (demo)</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Admin', email: 'admin@factory.com', pass: 'Fms@Admin#2024' },
                                { label: 'Store Mgr', email: 'store@factory.com', pass: 'Fms@Store#2024' },
                                { label: 'Prod Mgr', email: 'prod@factory.com', pass: 'Fms@Prod#2024' },
                                { label: 'Sales Mgr', email: 'sales@factory.com', pass: 'Fms@Sales#2024' },
                            ].map(u => (
                                <button
                                    key={u.label}
                                    onClick={() => quickLogin(u.email, u.pass)}
                                    className="text-xs py-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:border-navy-700 hover:text-navy-700 hover:bg-navy-50 transition-all font-medium"
                                >
                                    {u.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
