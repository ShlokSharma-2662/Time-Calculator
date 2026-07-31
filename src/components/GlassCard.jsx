import React from 'react';
import { useReducedMotion } from 'framer-motion';

const ACCENTS = {
    indigo: {
        iconWrap: 'bg-indigo-500/10 text-indigo-400',
        glowTop: 'bg-indigo-500/10 group-hover:bg-indigo-500/20',
        glowBottom: 'bg-violet-500/10 group-hover:bg-violet-500/20',
        topLine: 'from-indigo-500/50',
    },
    emerald: {
        iconWrap: 'bg-emerald-500/10 text-emerald-400',
        glowTop: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
        glowBottom: 'bg-teal-500/10 group-hover:bg-teal-500/20',
        topLine: 'from-emerald-500/50',
    },
    sky: {
        iconWrap: 'bg-sky-500/10 text-sky-400',
        glowTop: 'bg-sky-500/10 group-hover:bg-sky-500/20',
        glowBottom: 'bg-blue-500/10 group-hover:bg-blue-500/20',
        topLine: 'from-sky-500/50',
    },
    amber: {
        iconWrap: 'bg-amber-500/10 text-amber-400',
        glowTop: 'bg-amber-500/10 group-hover:bg-amber-500/20',
        glowBottom: 'bg-orange-500/10 group-hover:bg-orange-500/20',
        topLine: 'from-amber-500/50',
    },
    rose: {
        iconWrap: 'bg-rose-500/10 text-rose-400',
        glowTop: 'bg-rose-500/10 group-hover:bg-rose-500/20',
        glowBottom: 'bg-red-500/10 group-hover:bg-red-500/20',
        topLine: 'from-rose-500/50',
    },
    violet: {
        iconWrap: 'bg-violet-500/10 text-violet-400',
        glowTop: 'bg-violet-500/10 group-hover:bg-violet-500/20',
        glowBottom: 'bg-purple-500/10 group-hover:bg-purple-500/20',
        topLine: 'from-violet-500/50',
    },
};

export const GlassCard = ({ children, className = "", title, icon: Icon, subtitle, hover = true, animate = true, animationDelayMs = 0, accentColor = 'indigo' }) => {
    const prefersReducedMotion = useReducedMotion();
    const hoverClass = hover && !prefersReducedMotion ? 'glass-card-hover' : '';
    const enterClass = animate && !prefersReducedMotion ? 'animate-enter-up' : '';
    const animationStyle = animate && !prefersReducedMotion ? { animationDelay: `${animationDelayMs}ms` } : undefined;
    const accent = ACCENTS[accentColor] ?? ACCENTS.indigo;

    return (
        <div
            className={`glass-card ${hoverClass} ${enterClass} group relative overflow-hidden focus-within:ring-2 focus-within:ring-indigo-400/70 ${className}`}
            style={animationStyle}
        >
            {/* Accent top-line */}
            {accentColor !== 'indigo' && (
                <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${accent.topLine} via-transparent to-transparent`} />
            )}

            {/* Studio Light Layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-white/[0.02] opacity-40 pointer-events-none" />
            <div className={`absolute -top-28 -right-28 w-64 h-64 blur-[120px] rounded-full transition-colors duration-700 ${accent.glowTop}`}></div>
            <div className={`absolute -bottom-28 -left-28 w-64 h-64 blur-[120px] rounded-full transition-colors duration-700 ${accent.glowBottom}`}></div>

            <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[1.5rem]" aria-hidden="true" />

            <div className="relative z-10">
                {title && (
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {Icon && (
                                <div className={`p-2.5 rounded-2xl ${accent.iconWrap}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            )}
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
