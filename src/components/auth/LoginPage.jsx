import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, Briefcase } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../GlassCard';

export const LoginPage = ({ onToggleMode }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const { login, loginWithGoogle } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
        } catch (err) {
            const code = err.code;
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                setError('Invalid email or password.');
            } else if (code === 'auth/too-many-requests') {
                setError('Too many attempts. Please try again later.');
            } else {
                setError(err.message || 'Login failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            await loginWithGoogle();
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                setError(err.message || 'Google sign-in failed.');
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-float"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/10 blur-[120px] rounded-full animate-float [animation-delay:2s]"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md z-10"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-4">
                        <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">WorkShift <span className="text-indigo-500">v3.0</span></h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Powered by Firebase</p>
                </div>

                <GlassCard className="p-8" hover={false}>
                    {/* Google Sign-In */}
                    <button
                        onClick={handleGoogle}
                        disabled={googleLoading}
                        className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50 mb-6"
                    >
                        {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-[1px] bg-white/10"></div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">or email</span>
                        <div className="flex-1 h-[1px] bg-white/10"></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Work Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com"
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 outline-none text-white font-medium transition-all" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 outline-none text-white font-medium transition-all" />
                            </div>
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center">{error}</motion.div>
                        )}

                        <button type="submit" disabled={loading}
                            className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Log In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>)}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">New to WorkShift?</p>
                        <button onClick={onToggleMode} className="mt-2 text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-widest text-xs transition-colors">Create Account</button>
                    </div>
                </GlassCard>

                <p className="mt-8 text-center text-slate-600 text-[9px] font-bold uppercase tracking-[0.3em]">🔒 Secured by Firebase Authentication</p>
            </motion.div>
        </div>
    );
};
