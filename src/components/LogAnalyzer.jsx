import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardList,
    Trash2,
    Copy,
    CheckCircle2,
    ArrowRight,
    MapPin,
    Activity,
    ChevronDown
} from 'lucide-react';
import { Timeline } from './Timeline';
import { GlassCard } from './GlassCard';
import { useUI } from '../context/UIContext';
import { parseAttendanceLogInput, buildCleanAttendanceLog } from '../utils/attendanceLogParser';

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

function SessionCard({ session, index, totalMinutes }) {
    const hasMachineJump = session.startMachine && session.endMachine && session.startMachine !== session.endMachine;
    const durationPercent = totalMinutes > 0 ? Math.min(100, Math.round((session.durationMinutes / totalMinutes) * 100)) : 0;

    return (
        <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs text-slate-400">Session {index + 1}</p>
                    <p className="text-lg font-semibold text-slate-100 tabular-nums">
                        {session.start}<span className="text-sm text-slate-500"> → </span>{session.end}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full border border-emerald-300/30 bg-emerald-500/10 text-emerald-200 text-xs">
                        {formatPunchDuration(session.durationMinutes)}
                    </span>
                    {hasMachineJump && (
                        <span className="px-2.5 py-1 rounded-full border border-rose-300/35 bg-rose-500/10 text-rose-200 text-xs inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            Machine changed
                        </span>
                    )}
                </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    {session.startMachine || 'Unknown'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="inline-flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-indigo-300" />
                    {session.endMachine || session.startMachine || 'Unknown'}
                </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 text-right">{durationPercent}% of paired work</p>
        </div>
    );
}

export const LogAnalyzer = ({ logInput, setLogInput, stats, currentTimeMinutes }) => {
    const { showSuccess } = useUI();
    const [showSessions, setShowSessions] = useState(false);

    const handleCopy = () => {
        if (!stats) return;
        const summary = [
            'WorkShift summary',
            `First in: ${stats.firstInTime || 'Not found'}`,
            `Date: ${stats.detectedDate || 'Unknown'}`,
            `Worked: ${formatMinutes(stats.totalSessionMinutes)}`,
            `Breaks: ${formatMinutes(stats.totalOutTime)}`,
            `Effective: ${formatMinutes(stats.realTimeEffectiveWork)}`,
        ].join('\n');
        navigator.clipboard.writeText(summary);
        showSuccess('Summary copied.');
    };

    const hasEvents = Boolean(stats?.events && stats.events.length > 0);
    const sessions = Array.isArray(stats?.sessions) ? stats.sessions : [];
    const totalSessionMinutes = Number(stats?.totalSessionMinutes || 0);

    const handlePaste = (event) => {
        const pastedText = event.clipboardData.getData('text/plain') || '';
        if (!pastedText) return;
        event.preventDefault();
        const parsed = parseAttendanceLogInput(pastedText);
        const cleaned = buildCleanAttendanceLog(parsed);
        setLogInput(cleaned || ((prev) => `${prev}${pastedText}`));
    };

    return (
        <GlassCard
            title="Paste today's punches"
            icon={ClipboardList}
            subtitle="HRMS rows are cleaned automatically"
            hover={false}
        >
            <div className="absolute top-5 right-5 flex gap-2">
                <button
                    type="button"
                    onClick={() => setLogInput('')}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-300/25"
                    title="Clear logs"
                >
                    <Trash2 className="w-4 h-4 text-rose-300" />
                </button>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-300/25 disabled:opacity-40"
                    title="Copy summary"
                    disabled={!stats}
                >
                    <Copy className="w-4 h-4 text-emerald-300" />
                </button>
            </div>

            <div className="mt-2">
                <textarea
                    value={logInput}
                    onChange={(e) => setLogInput(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Paste Daily In / Out punch text here"
                    className="w-full h-48 p-4 rounded-xl bg-slate-950/60 border border-white/10 outline-none text-sm tabular-nums text-slate-200 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:border-indigo-400/60"
                />

                <AnimatePresence>
                    {hasEvents && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="mt-6 space-y-4"
                        >
                            <Timeline events={stats.events} currentMinutes={currentTimeMinutes} />

                            <button
                                type="button"
                                onClick={() => setShowSessions((value) => !value)}
                                className="w-full flex items-center justify-between text-sm text-slate-300 border border-white/10 rounded-xl px-3 py-2 hover:bg-white/5"
                            >
                                <span>Sessions ({sessions.length})</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showSessions ? 'rotate-180' : ''}`} />
                            </button>

                            {showSessions && (
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
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!hasEvents && (
                    <p className="mt-4 text-sm text-slate-400">
                        Paste a log to see the timeline and punch health.
                    </p>
                )}
            </div>
        </GlassCard>
    );
};
