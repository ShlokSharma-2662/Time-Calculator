import React from 'react';
import { useReducedMotion } from 'framer-motion';

export const GlassCard = ({ children, className = "", title, icon: Icon, subtitle, hover = true, animate = true, animationDelayMs = 0 }) => {
    const prefersReducedMotion = useReducedMotion();
    const hoverClass = hover && !prefersReducedMotion ? 'glass-card-hover' : '';
    const enterClass = animate && !prefersReducedMotion ? 'animate-enter-up' : '';
    const animationStyle = animate && !prefersReducedMotion ? { animationDelay: `${animationDelayMs}ms` } : undefined;

    return (
        <div
            className={`glass-card ${hoverClass} ${enterClass} group relative overflow-hidden focus-within:ring-2 focus-within:ring-indigo-400/70 ${className}`}
            style={animationStyle}
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
                                <h3 className="text-sm font-bold text-slate-100 tracking-tight">{title}</h3>
                                {subtitle && <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase opacity-90">{subtitle}</p>}
                            </div>
                        </div>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};
