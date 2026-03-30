import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, X, ShieldAlert, BadgeCheck } from 'lucide-react';

export function PasscodeModal({ isOpen, onClose, onSuccess, isSettingMode = false }) {
    const [passcode, setPasscode] = useState('');
    const [confirmPasscode, setConfirmPasscode] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setPasscode('');
            setConfirmPasscode('');
            setError('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (isSettingMode) {
            if (passcode.length < 4) {
                setError('Passcode must be at least 4 characters');
                return;
            }
            if (passcode !== confirmPasscode) {
                setError('Passcodes do not match');
                return;
            }
            onSuccess(passcode);
        } else {
            const success = onSuccess(passcode);
            if (!success) {
                setError('Incorrect passcode');
                setPasscode('');
            }
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="glass-card max-w-sm w-full border-white/10 p-8 relative overflow-hidden"
                >
                    {/* Background Detail */}
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Lock className="w-24 h-24" />
                    </div>

                    <div className="flex flex-col items-center text-center mb-8">
                        <div className={`p-4 rounded-2xl mb-4 ${isSettingMode ? 'bg-emerald-500/10' : 'bg-indigo-500/10'}`}>
                            {isSettingMode ? (
                                <BadgeCheck className="w-8 h-8 text-emerald-500" />
                            ) : (
                                <Lock className="w-8 h-8 text-indigo-500" />
                            )}
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight">
                            {isSettingMode ? 'Set Privacy Passcode' : 'Authentication Required'}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                            {isSettingMode ? 'Secure your financial data' : 'Enter passcode to reveal details'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="password"
                                    value={passcode}
                                    onChange={(e) => setPasscode(e.target.value)}
                                    placeholder={isSettingMode ? "New Passcode" : "••••"}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center text-2xl font-black text-white placeholder:text-white/10 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all tracking-[0.5em]"
                                    autoComplete="off"
                                />
                            </div>

                            {isSettingMode && (
                                <input
                                    type="password"
                                    value={confirmPasscode}
                                    onChange={(e) => setConfirmPasscode(e.target.value)}
                                    placeholder="Confirm Passcode"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center text-xl font-black text-white placeholder:text-white/10 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all tracking-[0.5em]"
                                    autoComplete="off"
                                />
                            )}
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest justify-center"
                            >
                                <ShieldAlert className="w-3 h-3" />
                                {error}
                            </motion.div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 bg-white/5 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`flex-1 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition-all ${isSettingMode
                                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                                    }`}
                            >
                                {isSettingMode ? 'Save Securely' : 'Authorize'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
