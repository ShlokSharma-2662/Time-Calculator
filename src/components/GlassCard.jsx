import React from 'react';
import { motion } from 'framer-motion';

export const GlassCard = ({ children, className = "", title, icon: Icon, subtitle, hover = true }) => {
    return (
        <motion.div
            whileHover={hover ? { y: -5, scale: 1.01 } : {}}
            className={`glass-card glass-card-hover group relative overflow-hidden ${className}`}
        >
            {/* Subtle Gradient Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full group-hover:bg-indigo-500/20 transition-colors duration-700"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/10 blur-3xl rounded-full group-hover:bg-violet-500/20 transition-colors duration-700"></div>

            <div className="relative z-10">
                {title && (
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {Icon && <div className="p-2.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400">
                                <Icon className="w-5 h-5" />
                            </div>}
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight uppercase">{title}</h3>
                                {subtitle && <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold tracking-wide uppercase opacity-80">{subtitle}</p>}
                            </div>
                        </div>
                    </div>
                )}
                {children}
            </div>
        </motion.div>
    );
};
