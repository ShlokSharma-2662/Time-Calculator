import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info
};

const accents = {
    success: { border: 'border-l-emerald-500', icon: 'text-emerald-400', ring: 'ring-emerald-500/20' },
    error:   { border: 'border-l-rose-500',    icon: 'text-rose-400',    ring: 'ring-rose-500/20'    },
    info:    { border: 'border-l-sky-500',      icon: 'text-sky-400',     ring: 'ring-sky-500/20'     },
};

export const Toast = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            <AnimatePresence>
                {toasts.map(toast => {
                    const Icon = icons[toast.type] ?? Info;
                    const a = accents[toast.type] ?? accents.info;

                    return (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -16, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 80, scale: 0.95 }}
                            className={`glass border-l-4 ${a.border} ring-1 ${a.ring} px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md`}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${a.icon}`} />
                            <p className="flex-1 text-sm font-semibold text-slate-100">{toast.message}</p>
                            <button
                                onClick={() => onDismiss(toast.id)}
                                className="text-slate-400 hover:text-white transition-colors p-0.5 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
