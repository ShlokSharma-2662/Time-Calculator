import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info
};

const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
};

export const Toast = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            <AnimatePresence>
                {toasts.map(toast => {
                    const Icon = icons[toast.type];
                    const colorClass = colors[toast.type];

                    return (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.95 }}
                            className={`${colorClass} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md`}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <p className="flex-1 text-sm font-medium">{toast.message}</p>
                            <button
                                onClick={() => onDismiss(toast.id)}
                                className="text-white/80 hover:text-white transition-colors"
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
