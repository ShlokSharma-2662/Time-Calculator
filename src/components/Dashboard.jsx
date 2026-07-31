import React, { useMemo } from 'react';
import { GlassCard } from './GlassCard';
import { CircularProgress } from './CircularProgress';
import { WeeklyTrend } from './WeeklyTrend';
import { ArrowUpRight, Sun, Zap, Clock, Timer, LogIn, LogOut, Activity, Sparkles } from 'lucide-react';
import { useTimeHelpers } from '../hooks/useTimeHelpers';
import { getHolidayName } from '../utils/sandwichLeaveLogic';

export const Dashboard = ({
    shiftDetails,
    logStats,
    workProgress,
    activeLeave = null,
    mtdProgress = 0,
    history,
    shiftDuration,
    use24Hour = false
}) => {
    const isOvertime = logStats.isOvertime;
    const { minutesToTime } = useTimeHelpers();
    const currentDate = new Date(logStats.detectedDate || new Date());
    const holidayName = getHolidayName(currentDate.toISOString().slice(0, 10));
    const normalizedProgress = Number.isFinite(workProgress) ? Math.max(0, workProgress) : 0;
    const progressLabel = Math.min(Math.round(normalizedProgress), 100);

    // Calculate productivity relative to goal
    const productivityPercent = useMemo(() => {
        if (!history || Object.keys(history).length === 0) return 0;
        const targetMinutes = (shiftDuration || 9) * 60;
        const recentDays = Object.entries(history)
            .map(([date, data]) => ({ date, data }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 7);
        if (recentDays.length === 0) return 0;

        const totalPercent = recentDays.reduce((acc, { data }) => {
            const effective = data?.effectiveWorkTime || 0;
            // Note: effectiveWorkTime already includes virtual leave minutes from the parser
            return acc + (effective / targetMinutes) * 100;
        }, 0);

        return Math.round((totalPercent / recentDays.length) - 100);
    }, [history, shiftDuration]);

    const remainingMinutes = useMemo(() => {
        if (isOvertime) return 0;
        return Math.max(0, (shiftDuration || 9) * 60 - (logStats.realTimeEffectiveWork || 0));
    }, [isOvertime, shiftDuration, logStats.realTimeEffectiveWork]);

    const dateLabel = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(currentDate);

    return (
        <section className="space-y-6 pb-4" aria-label="Dashboard overview">
            <GlassCard className="dashboard-section p-6 sm:p-7 bg-gradient-to-br from-slate-900/70 via-slate-900/35 to-indigo-500/10" hover={false} animationDelayMs={40}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200/90">Today</p>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{dateLabel}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-300/35 bg-slate-500/10 text-xs font-bold uppercase tracking-wider text-slate-100">
                            MTD {Math.round(mtdProgress)}%
                        </span>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${isOvertime
                            ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                            : 'border-indigo-400/40 bg-indigo-500/10 text-indigo-200'
                            }`}>
                            <Timer className={`w-3.5 h-3.5 ${isOvertime ? 'text-rose-300 animate-pulse-soft' : 'text-indigo-300 animate-pulse-soft'}`} />
                            {isOvertime ? 'Overtime active' : 'Shift in progress'}
                        </span>
                        {activeLeave && (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 text-xs font-bold uppercase tracking-wider text-violet-200 animate-pop-soft">
                                <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                                {activeLeave.type.toUpperCase()} leave
                            </span>
                        )}
                        {holidayName && (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-300/35 bg-amber-500/10 text-xs font-bold uppercase tracking-wider text-amber-200">
                                <Sun className="w-3.5 h-3.5 text-amber-300" />
                                {holidayName}
                            </span>
                        )}
                    </div>
                </div>
                </GlassCard>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-5">
                    <GlassCard className="dashboard-section h-full flex flex-col items-center justify-center py-10 sm:py-12" hover={false} animationDelayMs={100}>
                        <div className="relative">
                            <CircularProgress
                                progress={normalizedProgress}
                                size={280}
                                strokeWidth={16}
                                color={isOvertime ? "#f43f5e" : "#6366f1"}
                            />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] mb-1">Overall progress</div>
                                <div className="text-6xl sm:text-7xl font-black text-white tracking-tighter tabular-nums">
                                    {progressLabel}
                                    <span className="text-2xl sm:text-3xl text-indigo-300/70 ml-1">%</span>
                                </div>
                                {normalizedProgress > 100 ? (
                                    <p className="text-xs text-rose-300 font-semibold mt-2">+{Math.round(normalizedProgress - 100)}% over target</p>
                                ) : remainingMinutes > 0 ? (
                                    <p className="text-xs text-slate-400 font-semibold mt-2">
                                        {remainingMinutes >= 60 ? `${Math.floor(remainingMinutes / 60)}h ` : ''}{remainingMinutes % 60}m left
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </GlassCard>
                </div>

                <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <GlassCard className="dashboard-section" title="Active Work" icon={Zap} subtitle="Real-time productive time" accentColor="indigo" animationDelayMs={140}>
                        <div className="text-4xl font-black text-indigo-300 mt-2 tabular-nums">
                            {Math.floor(logStats.realTimeEffectiveWork / 60)}
                            <span className="text-xl opacity-40 ml-1">h</span>{' '}{logStats.realTimeEffectiveWork % 60}
                            <span className="text-xl opacity-40 ml-1">m</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="dashboard-section" title="Est. Exit" icon={LogOut} subtitle={shiftDetails.activeTargetLabel} accentColor="emerald" animationDelayMs={180}>
                        <div className="text-4xl font-black text-emerald-300 mt-2 tabular-nums">
                            {shiftDetails.isFullLeave ? '--:--' : shiftDetails.activeTargetAdjusted}
                        </div>
                    </GlassCard>

                    <GlassCard className="dashboard-section" title="Shift Start" icon={LogIn} subtitle={activeLeave ? activeLeave.type : "Automatically detected"} accentColor="sky" animationDelayMs={220}>
                        <div className="text-4xl font-black text-sky-300 mt-2 tabular-nums">
                            {minutesToTime(shiftDetails.startMinutes, use24Hour)}
                        </div>
                    </GlassCard>

                    <GlassCard className="dashboard-section" title="Break Time" icon={Clock} subtitle="Total out time recorded" accentColor="amber" animationDelayMs={260}>
                        <div className="text-4xl font-black text-amber-300 mt-2 tabular-nums">
                            {logStats.totalOutTime}
                            <span className="text-xl opacity-40 ml-1">m</span>
                        </div>
                    </GlassCard>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <WeeklyTrend history={history} />

                <GlassCard className="dashboard-section" title="Productivity" icon={ArrowUpRight} subtitle="Relative to 7-day goal" animationDelayMs={320}>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className={`text-5xl font-black tabular-nums ${productivityPercent >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {productivityPercent >= 0 ? '+' : ''}{productivityPercent}
                                <span className="text-2xl opacity-40 ml-1">%</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 uppercase font-semibold tracking-wide">
                                {productivityPercent >= 0 ? 'Above target this week' : 'Below target this week'}
                            </p>
                        </div>
                        <div className={`p-3 rounded-2xl border ${productivityPercent >= 0
                            ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-400/30 text-rose-300'
                            }`}>
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                </GlassCard>
            </div>
        </section>
    );
};
