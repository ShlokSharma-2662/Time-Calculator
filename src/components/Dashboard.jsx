import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { CircularProgress } from './CircularProgress';
import { WeeklyTrend } from './WeeklyTrend';
import { ArrowUpRight, Sun, Zap, Clock, Timer, LogIn, LogOut } from 'lucide-react';
import { useTimeHelpers } from '../hooks/useTimeHelpers';
import { getHolidayName } from '../utils/sandwichLeaveLogic';
import { getLeaveForDate, LEAVE_TYPES } from '../utils/leaveHistory';

export const Dashboard = ({
    shiftDetails,
    logStats,
    workProgress,
    activeLeave = null,
    mtdProgress,
    history,
    shiftDuration,
    use24Hour = false
}) => {
    const isOvertime = logStats.isOvertime;
    const { minutesToTime } = useTimeHelpers();

    // Calculate productivity relative to goal
    const productivityPercent = useMemo(() => {
        if (!history || Object.keys(history).length === 0) return 0;
        const targetMinutes = (shiftDuration || 9) * 60;
        const recentDays = Object.entries(history).slice(0, 7);
        if (recentDays.length === 0) return 0;

        const totalPercent = recentDays.reduce((acc, [, data]) => {
            const effective = data?.effectiveWorkTime || 0;
            // Note: effectiveWorkTime already includes virtual leave minutes from the parser
            return acc + (effective / targetMinutes) * 100;
        }, 0);

        return Math.round(totalPercent / recentDays.length - 100);
    }, [history, shiftDuration]);

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
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Overall Progress</div>
                            <div className="text-7xl font-black text-slate-800 dark:text-white tracking-tighter flex items-center justify-center">
                                {Math.floor(workProgress)}<span className="text-3xl text-indigo-500/50 ml-1">%</span>
                            </div>

                            {/* Leave Indicator Badge */}
                            {activeLeave && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 rounded-full"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                        {activeLeave.type.toUpperCase()} APPLIED
                                    </span>
                                </motion.div>
                            )}

                            <div className="mt-6 flex flex-col items-center gap-3">
                                {getHolidayName(new Date().toISOString().slice(0, 10)) && (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 mb-1"
                                    >
                                        <Sun className="w-4 h-4 text-indigo-400" />
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">
                                            Public Holiday: {getHolidayName(new Date().toISOString().slice(0, 10))}
                                        </span>
                                    </motion.div>
                                )}
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 shadow-sm">
                                    <Timer className={`w-3.5 h-3.5 ${isOvertime ? 'text-rose-500 animate-pulse' : 'text-indigo-500'}`} />
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                        {isOvertime ? 'OVERTIME ACTIVE' : 'SHIFT IN PROGRESS'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Quick Stats Grid */}
            <div className="md:col-span-12 lg:col-span-12 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <GlassCard title="Active Work" icon={Zap} subtitle="Real-time productivity">
                    <div className="text-4xl font-black text-indigo-400 mt-2 tabular-nums">
                        {Math.floor(logStats.realTimeEffectiveWork / 60)}<span className="text-xl opacity-40 ml-1">h</span> {logStats.realTimeEffectiveWork % 60}<span className="text-xl opacity-40 ml-1">m</span>
                    </div>
                </GlassCard>

                <GlassCard title="Est. Exit" icon={LogOut} subtitle={shiftDetails.activeTargetLabel}>
                    <div className="text-4xl font-black text-white mt-2 tabular-nums">
                        {shiftDetails.isFullLeave ? '--:--' : shiftDetails.activeTargetAdjusted}
                    </div>
                </GlassCard>

                <GlassCard title="Shift Start" icon={LogIn} subtitle={activeLeave ? activeLeave.type : "Automatically detected"}>
                    <div className="text-4xl font-black text-white mt-2 tabular-nums">
                        {minutesToTime(shiftDetails.startMinutes, use24Hour)}
                    </div>
                </GlassCard>

                <GlassCard title="Break Time" icon={Clock} subtitle="Total out time recorded">
                    <div className="text-4xl font-black text-amber-500 mt-2 tabular-nums text-glow-orange">
                        {logStats.totalOutTime}<span className="text-xl opacity-40 ml-1">m</span>
                    </div>
                </GlassCard>
            </div>

            {/* Secondary Row: Real Chart & Productivity */}
            <div className="md:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <WeeklyTrend history={history} />

                <GlassCard title="Productivity" icon={ArrowUpRight} subtitle="Relative to goal">
                    <div className="flex flex-col justify-center h-full">
                        <div className={`text-5xl font-black tabular-nums ${productivityPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {productivityPercent >= 0 ? '+' : ''}{productivityPercent}<span className="text-2xl opacity-40 ml-1">%</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-tight leading-tight">
                            {productivityPercent >= 0 ? 'Above target' : 'Below target'} <br /> this week
                        </p>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};
