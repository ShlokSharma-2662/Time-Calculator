import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Trash2, Info, X } from 'lucide-react';

const TYPE_CONFIG = {
    warning: { icon: AlertCircle, iconBg: 'bg-amber-500 shadow-amber-500/20', btnBg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' },
    danger:  { icon: Trash2,       iconBg: 'bg-rose-500 shadow-rose-500/20',   btnBg: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'   },
    info:    { icon: Info,          iconBg: 'bg-sky-500 shadow-sky-500/20',     btnBg: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20' },
};

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, type = 'warning' }) => {
    const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.warning;
    const IconComp = cfg.icon;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/10"
                    >
                        {/* Decorative background */}
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
                        
                        <div className="p-8">
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-xl ${cfg.iconBg}`}>
                                    <IconComp className="w-8 h-8 text-white" />
                                </div>
                                
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
                                    {title || 'Are you sure?'}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    {message}
                                </p>
                            </div>

                            <div className="mt-8 flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-95 text-white ${cfg.btnBg}`}
                                >
                                    Yes, Proceed
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
