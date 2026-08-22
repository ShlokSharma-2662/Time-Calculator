import React, { useMemo } from 'react';
import { Bell, BellOff, Briefcase, Clock, Coffee, LogIn, LogOut, Sun, Sparkles, Timer } from 'lucide-react';
import { useTimeHelpers } from '../hooks/useTimeHelpers';
import { getTargetWorkMinutes } from '../hooks/useShiftCalculations';
import { getHolidayName } from '../utils/sandwichLeaveLogic';
import { buildPunchHealth } from '../utils/punchHealth';
import { formatDate, shiftLocalISODate } from '../utils/dateUtils';
import { PunchHealth } from './PunchHealth';

function formatRemaining(minutes) {
    const value = Math.max(0, Math.floor(Number(minutes) || 0));
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    if (hours <= 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
}

export function TodayStrip({
    shiftDetails,
    logStats,
    workProgress,
    activeLeave = null,
    mtdProgress = 0,
    shiftDuration,
    shiftTarget = 'fullDay',
    setShiftTarget,
    remainingMinutes: remainingMinutesProp,
    isOvertime: isOvertimeProp,
    exitLabel: exitLabelProp,
    use24Hour = false,
    workDate,
    setWorkDate,
    today,
    leaveNotify,
    onNotifyToggle,
}) {
    const { minutesToTime } = useTimeHelpers();
    const activeTarget = shiftTarget || 'fullDay';

    const dateSource = workDate || logStats.detectedDate || today;
    const currentDate = dateSource ? new Date(`${dateSource}T12:00:00`) : new Date();
    const holidayName = getHolidayName(dateSource);
    const targetWorkMinutes = getTargetWorkMinutes((shiftDuration || 9) * 60, activeTarget);
    const workedMinutes = Number(logStats.realTimeEffectiveWork || 0);
    const isOvertime = typeof isOvertimeProp === 'boolean'
        ? isOvertimeProp
        : workedMinutes >= targetWorkMinutes;
    const remainingMinutes = Number.isFinite(remainingMinutesProp)
        ? remainingMinutesProp
        : (isOvertime ? 0 : Math.max(0, targetWorkMinutes - workedMinutes));
    const progress = targetWorkMinutes > 0
        ? Math.max(0, Math.min((workedMinutes / targetWorkMinutes) * 100, 160))
        : (Number.isFinite(workProgress) ? Math.max(0, Math.min(workProgress, 160)) : 0);

    const exitLabel = exitLabelProp
        || (shiftDetails.isFullLeave
            ? '--:--'
            : (shiftDetails[`${activeTarget}Adjusted`] || shiftDetails.activeTargetAdjusted));

    const punchHealth = useMemo(() => {
        if (!logStats?.events?.length) return null;
        return buildPunchHealth({
            events: logStats.events,
            anomalies: logStats.anomalies,
            isHistorical: Boolean(logStats.isHistorical),
        });
    }, [logStats]);

    const logLockedDate = Boolean(logStats?.logDetectedDate);
    const yesterday = today ? shiftLocalISODate(today, -1) : '';
    const dateLabel = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    }).format(currentDate);

    const statusLabel = logStats.isHistorical ? 'Historical' : isOvertime ? 'Overtime' : 'Live';

    return (
        <section className="glass-card space-y-5" aria-label="Today">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <p className="text-sm text-slate-400">{dateLabel}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setWorkDate?.(today)}
                            disabled={logLockedDate}
                            className={`px-3 py-1.5 rounded-lg text-sm border ${dateSource === today
                                ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-100'
                                : 'border-white/10 text-slate-400 hover:text-slate-100'
                                } disabled:opacity-40`}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => setWorkDate?.(yesterday)}
                            disabled={logLockedDate}
                            className={`px-3 py-1.5 rounded-lg text-sm border ${dateSource === yesterday
                                ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-100'
                                : 'border-white/10 text-slate-400 hover:text-slate-100'
                                } disabled:opacity-40`}
                        >
                            Yesterday
                        </button>
                        <input
                            id="work-date"
                            type="date"
                            value={dateSource || ''}
                            max={today}
                            disabled={logLockedDate}
                            onChange={(event) => setWorkDate?.(event.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-sm text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        />
                    </div>
                    {logLockedDate && (
                        <p className="mt-2 text-xs text-slate-500">
                            Using pasted log date {formatDate(logStats.logDetectedDate)}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${isOvertime
                        ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                        : 'border-indigo-400/40 bg-indigo-500/10 text-indigo-200'
                        }`}>
                        <Timer className="w-3.5 h-3.5" />
                        {statusLabel}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/10 text-xs text-slate-300">
                        MTD {Math.round(mtdProgress)}%
                    </span>
                    {activeLeave && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-violet-400/40 bg-violet-500/10 text-xs text-violet-200">
                            <Sparkles className="w-3.5 h-3.5" />
                            {activeLeave.type} leave
                        </span>
                    )}
                    {holidayName && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/35 bg-amber-500/10 text-xs text-amber-100">
                            <Sun className="w-3.5 h-3.5" />
                            {holidayName}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-400">
                        {isOvertime ? 'Over target' : remainingMinutes === 0 ? 'You can leave' : 'Remaining'}
                    </p>
                    <p className={`text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight ${isOvertime ? 'text-rose-300' : 'text-white'}`}>
                        {isOvertime
                            ? `+${formatRemaining(workedMinutes - targetWorkMinutes)}`
                            : remainingMinutes === 0
                                ? exitLabel
                                : formatRemaining(remainingMinutes)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                            <LogIn className="w-4 h-4 text-sky-300" />
                            {minutesToTime(shiftDetails.startMinutes, use24Hour)}
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="inline-flex items-center gap-1.5">
                            <LogOut className="w-4 h-4 text-emerald-300" />
                            {exitLabel}
                        </span>
                    </div>
                </div>

                {leaveNotify?.supported && (
                    <button
                        type="button"
                        onClick={() => onNotifyToggle?.(!leaveNotify.enabled)}
                        className={`self-start sm:self-auto p-2.5 rounded-xl border ${leaveNotify.enabled
                            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                            : 'border-white/15 text-slate-400 hover:text-slate-100'
                            }`}
                        title={leaveNotify.enabled ? 'Leave reminder on' : 'Notify me when I can leave'}
                        aria-pressed={leaveNotify.enabled}
                    >
                        {leaveNotify.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                    </button>
                )}
            </div>

            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                    className={`h-full rounded-full ${isOvertime ? 'bg-rose-400' : 'bg-indigo-400'}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>

            <div className="flex p-1 rounded-xl bg-slate-950/50 border border-white/10 gap-1">
                {['fullDay', 'halfDay', 'shortLeave'].map((target) => {
                    const TabIcon = target === 'fullDay' ? Briefcase : target === 'halfDay' ? Clock : Coffee;
                    const label = target === 'fullDay' ? 'Full' : target === 'halfDay' ? 'Half' : 'Short';
                    return (
                        <button
                            key={target}
                            type="button"
                            onClick={() => setShiftTarget?.(target)}
                            aria-pressed={activeTarget === target}
                            className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 ${activeTarget === target
                                ? 'bg-slate-800 text-indigo-200'
                                : 'text-slate-500 hover:text-slate-200'
                                }`}
                        >
                            <TabIcon className="w-4 h-4" />
                            {label}
                        </button>
                    );
                })}
            </div>

            <PunchHealth health={punchHealth} compact />
        </section>
    );
}
