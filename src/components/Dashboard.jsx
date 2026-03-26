import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { CircularProgress } from './CircularProgress';
import { Zap, Clock, Timer, LogIn, LogOut, ArrowUpRight, TrendingUp } from 'lucide-react';

export const Dashboard = ({ shiftDetails, logStats, workProgress, startTime }) => {
    const isOvertime = logStats.realTimeEffectiveWork > (shiftDetails.fullDayMinutes || 540);

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-4">
            {/* Hero Section - Work Progress Ring */}
            <div className="md:col-span-12 lg:col-span-12 xl:col-span-5">
                <GlassCard className="h-full flex flex-col items-center justify-center py-10" hover={false}>
                    <div className="relative">
                        <CircularProgress
                            progress={workProgress}
                            size={280}
                            strokeWidth={16}
                            color={isOvertime ? "#f43f5e" : "#6366f1"}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                            <span className="text-[10px] font-black text-slate-400 dark:text-indigo-300/50 uppercase tracking-[0.2em] mb-2 leading-none">Overall Progress</span>
                            <span className="text-7xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                                {Math.floor(workProgress)}<span className="text-2xl text-slate-400/60 ml-1">%</span>
                            </span>
                            <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                                <Timer className={`w-3.5 h-3.5 ${isOvertime ? 'text-rose-500 animate-pulse' : 'text-indigo-500'}`} />
                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                                    {isOvertime ? 'OVERTIME ACTIVE' : 'SHIFT IN PROGRESS'}
                                </span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Quick Stats Grid */}
            <div className="md:col-span-12 lg:col-span-12 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <GlassCard title="Active Work" icon={Zap} subtitle="Real-time productivity">
                    <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-2 tabular-nums">
                        {Math.floor(logStats.realTimeEffectiveWork / 60)}<span className="text-xl opacity-40 ml-1">h</span> {logStats.realTimeEffectiveWork % 60}<span className="text-xl opacity-40 ml-1">m</span>
                    </div>
                </GlassCard>

                <GlassCard title="Est. Exit" icon={LogOut} subtitle={`${shiftDetails.fullDayLabel} Target`}>
                    <div className="text-4xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">
                        {shiftDetails.fullDayAdjusted}
                    </div>
                </GlassCard>

                <GlassCard title="Shift Start" icon={LogIn} subtitle="Automatically detected">
                    <div className="text-4xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">
                        {startTime}
                    </div>
                </GlassCard>

                <GlassCard title="Break Time" icon={Clock} subtitle="Total out time recorded">
                    <div className="text-4xl font-black text-orange-500 dark:text-amber-500 mt-2 tabular-nums text-glow-orange">
                        {logStats.totalOutTime}<span className="text-xl opacity-40 ml-1">m</span>
                    </div>
                </GlassCard>
            </div>

            {/* Secondary Row: Trend & Analysis */}
            <div className="md:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <GlassCard className="lg:col-span-2" title="Daily Trend" icon={TrendingUp} subtitle="Historical performance">
                    <div className="h-28 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-900/[0.02] dark:bg-white/[0.02]">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 italic">Visualization Engine Loading...</span>
                    </div>
                </GlassCard>

                <GlassCard title="Productivity" icon={ArrowUpRight} subtitle="Relative to goal">
                    <div className="flex flex-col justify-center h-full">
                        <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            +22<span className="text-2xl opacity-40 ml-1">%</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 uppercase font-black tracking-tight leading-tight">
                            Consistently above target <br /> this week
                        </p>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};
