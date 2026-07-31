import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardList,
    Trash2,
    Copy,
    Timer,
    CalendarDays,
    Link2,
    PencilLine,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import { Timeline } from './Timeline';
import { GlassCard } from './GlassCard';
import { useUI } from '../context/UIContext';
import { parseAttendanceLogInput, buildCleanAttendanceLog } from '../utils/attendanceLogParser';

const MONTHS = {
    Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
    May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
    Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
};

function formatHrmsDate(value) {
    const match = String(value || '').match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (!match) return value || '—';
    const year = 2000 + Number(match[3]);
    const month = MONTHS[match[2]] || match[2];
    return `${Number(match[1])} ${month} ${year}`;
}

function formatSyncTime(epochMs) {
    if (!epochMs) return '';
    const date = new Date(epochMs);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMinutes(totalMinutes) {
    const value = Math.max(0, Math.floor(Number(totalMinutes) || 0));
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${hours}h ${minutes}m`;
}

function HrmsSummaryPanel({ hrmsSync, manualOverride, setManualOverride }) {
    if (!hrmsSync?.selectedDate && !hrmsSync?.syncedAt) return null;

    const status = hrmsSync.status || (hrmsSync.isToday ? 'today' : 'past');
    const statusMeta = status === 'today'
        ? { text: 'Today • Live', color: 'bg-indigo-500 text-white' }
        : status === 'future'
            ? { text: 'Upcoming', color: 'bg-teal-500 text-white' }
            : { text: 'Past day', color: 'bg-amber-500 text-white' };

    return (
        <div className="mb-6 rounded-[1.25rem] border border-indigo-500/20 bg-indigo-500/5 p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-indigo-500 mb-1">
                        <CalendarDays className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">HRMS Sync</span>
                    </div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{formatHrmsDate(hrmsSync.selectedDate)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                        {hrmsSync.syncedAt ? `Synced at ${formatSyncTime(hrmsSync.syncedAt)}` : 'Waiting for a synced attendance day'}
                    </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusMeta.color}`}>
                    {statusMeta.text}
                </span>
            </div>

            {hrmsSync.hasData ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div className="rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3">
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Day Start</p>
                            <p className="text-xl font-black tabular-nums text-slate-900 dark:text-white">{hrmsSync.firstIn || '—'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3">
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Day End</p>
                            <p className="text-xl font-black tabular-nums text-slate-900 dark:text-white">{hrmsSync.lastOut || '—'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3">
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Punches</p>
                            <p className="text-xl font-black tabular-nums text-slate-900 dark:text-white">{hrmsSync.punchCount || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3">
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Break Time</p>
                            <p className="text-xl font-black tabular-nums text-slate-900 dark:text-white">{hrmsSync.breakMinutes || 0}<span className="text-sm opacity-50 ml-1">m</span></p>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {manualOverride
                                ? 'Manual log mode enabled. You can paste and edit attendance data.'
                                : 'Attendance logs are auto-filled from HRMS sync data.'}
                        </p>
                        <button
                            onClick={() => setManualOverride((prev) => !prev)}
                            className="shrink-0 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-indigo-500/30 bg-white dark:bg-slate-900 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-all flex items-center gap-1.5"
                        >
                            {manualOverride ? <Link2 className="w-3.5 h-3.5" /> : <PencilLine className="w-3.5 h-3.5" />}
                            {manualOverride ? 'Use HRMS' : 'Manual Input'}
                        </button>
                    </div>
                </>
            ) : (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    HRMS connection is active. Select a date in the HRMS attendance report to auto-load punches.
                </p>
            )}
        </div>
    );
}

export const LogAnalyzer = ({ logInput, setLogInput, stats, currentTimeMinutes, hrmsSync, clearHrmsSync }) => {
    const { showSuccess } = useUI();
    const [manualOverride, setManualOverride] = React.useState(false);

    React.useEffect(() => {
        if (hrmsSync?.hasData) {
            setManualOverride(false);
        }
    }, [hrmsSync?.syncedAt, hrmsSync?.selectedDate, hrmsSync?.hasData]);

    const handleCopy = () => {
        if (!stats) return;

        const sessionCount = Number(stats.sessionCount || 0);
        const totalSessionMinutes = Number(stats.totalSessionMinutes || 0);
        const shortTimeOffMinutes = Number(stats.shortTimeOffMinutes || 0);
        const anomalies = Array.isArray(stats.anomalies) ? stats.anomalies : [];
        const blankApproverRemarks = Array.isArray(stats.blankApproverRemarks) ? stats.blankApproverRemarks : [];

        const anomalyLines = anomalies.length > 0
            ? anomalies.map((anomaly) => `- ${anomaly.message || anomaly}`).join('\n')
            : ['- No anomalies detected'].join('\n');

        const blankRemarkLines = blankApproverRemarks.length > 0
            ? blankApproverRemarks.map((remark) => `- ${remark.date || 'Unknown date'} ${remark.time24 || 'Unknown time'} (${remark.machine || 'Unknown machine'})`).join('\n')
            : ['- No blank approver remarks'].join('\n');

        const summary = `
WorkShift Parsed Summary
------------------
First In: ${stats.firstInTime || 'Not found'}
Detected Date: ${stats.detectedDate || 'Unknown'}
Sessions: ${sessionCount}
Worked (from punches): ${formatMinutes(totalSessionMinutes)}
Total Breaks: ${formatMinutes(stats.totalOutTime)}
Short Time-Off: ${shortTimeOffMinutes}m
Effective Work (with short time-off): ${formatMinutes(stats.realTimeEffectiveWork)}
--------------------------------
Flagged Anomalies:
${anomalyLines}
--------------------------------
Blank Approver Remarks:
${blankRemarkLines}
------------------
Generated by WorkShift Calc
        `.trim();
        navigator.clipboard.writeText(summary);
        showSuccess("Summary copied to clipboard!");
    };

    const hasEvents = Boolean(stats?.events && stats.events.length > 0);
    const anomalyList = Array.isArray(stats?.anomalies) ? stats.anomalies : [];
    const blankRemarks = Array.isArray(stats?.blankApproverRemarks) ? stats.blankApproverRemarks : [];
    const sessionCount = Number(stats?.sessionCount || 0);
    const totalSessionMinutes = Number(stats?.totalSessionMinutes || 0);
    const shortTimeOffMinutes = Number(stats?.shortTimeOffMinutes || 0);
    const showManualInput = !hrmsSync?.hasData || manualOverride;
    const subtitle = showManualInput ? 'Paste your attendance entries here' : 'Auto-filled from HRMS sync';

    const handleClear = () => {
        setLogInput("");
        if (clearHrmsSync) {
            clearHrmsSync();
        }
        setManualOverride(false);
    };

    const handlePaste = (event) => {
        const pastedText = event.clipboardData.getData('text/plain') || '';
        if (!pastedText) return;

        event.preventDefault();

        const parsed = parseAttendanceLogInput(pastedText);
        const cleaned = buildCleanAttendanceLog(parsed);

        if (cleaned) {
            setLogInput(cleaned);
            return;
        }

        setLogInput((prev) => `${prev}${pastedText}`);
    };

    return (
        <GlassCard
            title="Activity Logs"
            icon={ClipboardList}
            subtitle={subtitle}
        >
            <div className="absolute top-6 right-6 flex gap-2">
                <button
                    onClick={handleClear}
                    className="p-2.5 rounded-xl bg-slate-900/5 dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-600 transition-all border border-slate-200 dark:border-white/10"
                    title="Clear Logs"
                >
                    <Trash2 className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-rose-500" />
                </button>
                <button
                    onClick={handleCopy}
                    className="p-2.5 rounded-xl bg-slate-900/5 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all border border-slate-200 dark:border-white/10"
                    title="Copy Summary"
                    disabled={!stats}
                >
                    <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-emerald-500" />
                </button>
            </div>

            <div className="mt-6">
                <HrmsSummaryPanel
                    hrmsSync={hrmsSync}
                    manualOverride={manualOverride}
                    setManualOverride={setManualOverride}
                />

                {showManualInput && (
                    <textarea
                        value={logInput}
                        onChange={(e) => setLogInput(e.target.value)}
                        onPaste={handlePaste}
                        placeholder="Example:\nIn 09:00\nOut 13:00\nIn 14:00"
                        className="w-full h-56 p-6 rounded-[2rem] bg-slate-950/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 outline-none text-base font-bold transition-all resize-none text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 tabular-nums"
                    />
                )}

                <AnimatePresence>
                    {hasEvents && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mt-8"
                        >
                            <Timeline events={stats.events} currentMinutes={currentTimeMinutes} />

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                                <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 shadow-sm group hover:bg-indigo-500/10 transition-all cursor-default">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Timer className="w-4 h-4 text-indigo-500 animate-pulse" />
                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Effective Work</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                                        {Math.floor(stats.realTimeEffectiveWork / 60)}<span className="text-lg opacity-40 ml-1 mr-2">h</span>
                                        {stats.realTimeEffectiveWork % 60}<span className="text-lg opacity-40 ml-1">m</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-black mt-2 uppercase italic tracking-wider opacity-60">Real-time tracker â€¢ Active now</p>
                                </div>

                                <div className="p-6 rounded-[2rem] bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 group hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all cursor-default">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Timer className="w-4 h-4 text-slate-500" />
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Total Break</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                                        {Math.floor(stats.totalOutTime / 60)}<span className="text-lg opacity-40 ml-1 mr-2">h</span>
                                        {stats.totalOutTime % 60}<span className="text-lg opacity-40 ml-1">m</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-black mt-2 uppercase italic tracking-wider opacity-60">Total idle time today</p>
                                </div>

                                <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 group hover:bg-indigo-500/10 transition-all cursor-default">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Sessions</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                                        {sessionCount}<span className="text-lg opacity-40 ml-1 mr-2">#</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-black mt-2 uppercase italic tracking-wider opacity-60">
                                        {formatMinutes(totalSessionMinutes)} worked
                                    </p>
                                </div>

                                <div className="p-6 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/30 group hover:bg-emerald-500/15 transition-all cursor-default">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-300 uppercase tracking-[0.2em]">Short Time-Off</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                                        {shortTimeOffMinutes}<span className="text-lg opacity-40 ml-1 mr-2">m</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-black mt-2 uppercase italic tracking-wider opacity-60">Captured from HRMS section</p>
                                </div>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </GlassCard>
    );
};

