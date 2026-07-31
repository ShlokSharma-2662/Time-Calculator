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
    CheckCircle2,
    ArrowRight,
    MapPin,
    Activity
} from 'lucide-react';
import { Timeline } from './Timeline';
import { GlassCard } from './GlassCard';
import { useUI } from '../context/UIContext';
import { parseAttendanceLogInput, buildCleanAttendanceLog } from '../utils/attendanceLogParser';

const MONTHS = {
    Jan: 'January',
    Feb: 'February',
    Mar: 'March',
    Apr: 'April',
    May: 'May',
    Jun: 'June',
    Jul: 'July',
    Aug: 'August',
    Sep: 'September',
    Oct: 'October',
    Nov: 'November',
    Dec: 'December',
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

function formatPunchDuration(totalMinutes) {
    const value = Math.max(0, Number(totalMinutes) || 0);
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
}

function HrmsSummaryPanel({ hrmsSync, manualOverride, setManualOverride }) {
    if (!hrmsSync?.selectedDate && !hrmsSync?.syncedAt) return null;

    const status = hrmsSync.status || (hrmsSync.isToday ? 'today' : 'past');
    const statusMeta = status === 'today'
        ? { text: 'Today • Live', color: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35' }
        : status === 'future'
            ? { text: 'Upcoming', color: 'bg-sky-500/15 text-sky-200 border-sky-400/35' }
            : { text: 'Past day', color: 'bg-amber-500/15 text-amber-200 border-amber-400/35' };

    return (
        <div className="mb-6 rounded-[1.3rem] border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-slate-900/10 to-violet-500/10 p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-indigo-300 mb-1">
                        <CalendarDays className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">HRMS Sync</span>
                    </div>
                    <p className="text-lg font-black text-slate-100">
                        {formatHrmsDate(hrmsSync.selectedDate)}
                    </p>
                    <p className="text-[11px] text-slate-300/90 font-bold">
                        {hrmsSync.syncedAt ? `Synced at ${formatSyncTime(hrmsSync.syncedAt)}` : 'Waiting for a synced attendance day'}
                    </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.16em] border ${statusMeta.color}`}>
                    {statusMeta.text}
                </span>
            </div>

            {hrmsSync.hasData ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div className="rounded-2xl bg-slate-900/45 border border-slate-200/10 p-3">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Day Start</p>
                            <p className="text-xl font-black tabular-nums text-slate-100">{hrmsSync.firstIn || '—'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-900/45 border border-slate-200/10 p-3">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Day End</p>
                            <p className="text-xl font-black tabular-nums text-slate-100">{hrmsSync.lastOut || '—'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-900/45 border border-slate-200/10 p-3">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Punches</p>
                            <p className="text-xl font-black tabular-nums text-slate-100">{hrmsSync.punchCount || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-900/45 border border-slate-200/10 p-3">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Break Time</p>
                            <p className="text-xl font-black tabular-nums text-slate-100">{hrmsSync.breakMinutes || 0}<span className="text-sm opacity-50 ml-1">m</span></p>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                        <p className="text-[11px] font-bold text-slate-300">
                            {manualOverride
                                ? 'Manual mode enabled. You can paste and edit attendance data.'
                                : 'Attendance logs are auto-filled from HRMS sync data.'}
                        </p>
                        <button
                            onClick={() => setManualOverride((prev) => !prev)}
                            className="shrink-0 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-indigo-500/30 bg-slate-900/20 hover:bg-indigo-500/15 text-indigo-300 transition-all flex items-center gap-1.5"
                        >
                            {manualOverride ? <Link2 className="w-3.5 h-3.5" /> : <PencilLine className="w-3.5 h-3.5" />}
                            {manualOverride ? 'Use HRMS' : 'Manual Input'}
                        </button>
                    </div>
                </>
            ) : (
                <p className="mt-4 text-sm text-slate-300/90 font-medium">
                    HRMS connection is active. Select a date in the HRMS attendance report to auto-load punches.
                </p>
            )}
        </div>
    );
}

function SessionCard({ session, index, totalMinutes }) {
    const hasMachineJump = session.startMachine && session.endMachine && session.startMachine !== session.endMachine;
    const durationPercent = totalMinutes > 0 ? Math.min(100, Math.round((session.durationMinutes / totalMinutes) * 100)) : 0;
    const percentBar = Math.max(3, Math.min(100, durationPercent));

    return (
        <div className="rounded-2xl border border-slate-200/10 bg-slate-900/35 px-4 py-3 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-xl bg-indigo-500/15 border border-indigo-300/20 text-indigo-300 text-[11px] font-black flex items-center justify-center">
                        {index + 1}
                    </span>
                    <div className="leading-tight">
                        <div className="text-xs uppercase tracking-[0.18em] text-indigo-200/80 font-black">Session {index + 1}</div>
                        <div className="text-xl font-black text-slate-100 tabular-nums">
                            {session.start}<span className="text-sm opacity-80"> → </span>{session.end}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-full border border-emerald-300/30 bg-emerald-500/10 text-emerald-200 text-xs font-black uppercase tracking-widest">
                        {formatPunchDuration(session.durationMinutes)}
                    </div>
                    {hasMachineJump && (
                        <div className="px-3 py-1.5 rounded-full border border-rose-300/35 bg-rose-500/10 text-rose-200 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            Changed
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-300 font-semibold">
                <div className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    In at {session.startMachine || 'Unknown'}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <div className="inline-flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-300" />
                    Out at {session.endMachine || session.startMachine || 'Unknown'}
                </div>
            </div>

            <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-[width] duration-500"
                    style={{ width: `${percentBar}%` }}
                    aria-hidden="true"
                />
            </div>
            <div className="mt-1 text-[10px] text-slate-500 text-right tracking-wide">{durationPercent}% of day shift</div>
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
        showSuccess('Summary copied to clipboard!');
    };

    const hasEvents = Boolean(stats?.events && stats.events.length > 0);
    const sessions = Array.isArray(stats?.sessions) ? stats.sessions : [];
    const sessionCount = Number(stats?.sessionCount || 0);
    const totalSessionMinutes = Number(stats?.totalSessionMinutes || 0);
    const totalBreakMinutes = Number(stats?.totalOutTime || 0);
    const shortTimeOffMinutes = Number(stats?.shortTimeOffMinutes || 0);
    const showManualInput = !hrmsSync?.hasData || manualOverride;
    const subtitle = showManualInput ? 'Paste your attendance entries here' : 'Auto-filled from HRMS sync';

    const handleClear = () => {
        setLogInput('');
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
            title="Attendance Session Ledger"
            icon={ClipboardList}
            subtitle={subtitle}
        >
            <div className="absolute top-5 right-5 flex gap-2">
                <button
                    onClick={handleClear}
                    className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-300/25 transition-all"
                    title="Clear Logs"
                >
                    <Trash2 className="w-4 h-4 text-rose-300" />
                </button>
                <button
                    onClick={handleCopy}
                    className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-300/25 transition-all"
                    title="Copy Summary"
                    disabled={!stats}
                >
                    <Copy className="w-4 h-4 text-emerald-300" />
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
                        placeholder="Paste HRMS Daily In Out Punch, then we parse and clean only the useful lines"
                        className="w-full h-56 p-6 rounded-[1.5rem] bg-slate-950/50 border border-slate-200/10 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 outline-none text-base font-black transition-all resize-none text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-600 tabular-nums"
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

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                                <div className="p-5 rounded-[1.2rem] bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-400/25">
                                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-indigo-200">Effective Work</p>
                                    <div className="text-3xl font-black text-slate-100 tabular-nums mt-1.5">
                                        {Math.floor(stats.realTimeEffectiveWork / 60)}<span className="text-lg opacity-40 ml-1 mr-2">h</span>
                                        {stats.realTimeEffectiveWork % 60}<span className="text-lg opacity-40 ml-1">m</span>
                                    </div>
                                    <p className="text-[9px] text-indigo-100/80 mt-1.5">Real time + short time-off</p>
                                </div>

                                <div className="p-5 rounded-[1.2rem] bg-slate-900/45 border border-slate-200/10">
                                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-300">Worked from Punches</p>
                                    <div className="text-3xl font-black text-slate-100 tabular-nums mt-1.5">
                                        {Math.floor(totalSessionMinutes / 60)}<span className="text-lg opacity-40 ml-1 mr-2">h</span>
                                        {totalSessionMinutes % 60}<span className="text-lg opacity-40 ml-1">m</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1.5">In-to-out paired sessions</p>
                                </div>

                                <div className="p-5 rounded-[1.2rem] bg-slate-900/45 border border-slate-200/10">
                                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-300">Session Count</p>
                                    <div className="text-3xl font-black text-slate-100 tabular-nums mt-1.5">
                                        {sessionCount}
                                        <span className="text-lg opacity-40 ml-1">#</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1.5">Punch pairs that are valid</p>
                                </div>

                                <div className="p-5 rounded-[1.2rem] bg-amber-500/10 border border-amber-400/25">
                                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-200">Total Break</p>
                                    <div className="text-3xl font-black text-slate-100 tabular-nums mt-1.5">
                                        {Math.floor(totalBreakMinutes / 60)}<span className="text-lg opacity-40 ml-1 mr-2">h</span>
                                        {totalBreakMinutes % 60}<span className="text-lg opacity-40 ml-1">m</span>
                                    </div>
                                    <p className="text-[9px] text-amber-100/80 mt-1.5">Out-to-In gap aggregation</p>
                                </div>

                                <div className="p-5 rounded-[1.2rem] bg-emerald-500/10 border border-emerald-400/25">
                                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-200">Short Time-Off</p>
                                    <div className="text-3xl font-black text-slate-100 tabular-nums mt-1.5">
                                        {shortTimeOffMinutes}<span className="text-lg opacity-40 ml-1">m</span>
                                    </div>
                                    <p className="text-[9px] text-emerald-100/80 mt-1.5">Captured from HRMS request rows</p>
                                </div>
                            </div>

                            <div className="mt-8">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                    <p className="text-sm font-black text-slate-100 uppercase tracking-[0.18em]">Session Ledger</p>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">
                                        {sessions.length} records
                                    </span>
                                </div>

                            <div className="space-y-2">
                                {sessions.map((session, index) => (
                                    <SessionCard
                                        key={`${session.start}-${session.end}-${index}`}
                                        session={session}
                                            index={index}
                                            totalMinutes={Math.max(1, totalSessionMinutes)}
                                    />
                                ))}
                            </div>
	                        </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!hasEvents && (
                    <div className="mt-8 p-6 rounded-[1.5rem] border border-dashed border-slate-300/20 bg-slate-900/30 text-slate-300 text-sm font-semibold">
                        Paste HRMS daily punch text to generate your session ledger.
                    </div>
                )}
            </div>
        </GlassCard>
    );
};

