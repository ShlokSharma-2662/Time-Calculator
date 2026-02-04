import React, { useState } from 'react';
import { ClipboardList, Trash2, CheckCircle2, Copy, ArrowRight, AlertCircle } from 'lucide-react';
import { Timeline } from './Timeline';
import { useTimeHelpers } from '../hooks/useTimeHelpers';

export const LogAnalyzer = ({ logInput, setLogInput, stats }) => {
    const { events, breaks, totalOutTime, effectiveWorkTime, firstInTime, lastOutTime } = stats;
    const { formatDuration } = useTimeHelpers();
    const [copied, setCopied] = useState(false);

    const handleCopySummary = () => {
        const summary = `Start: ${firstInTime || '?'} | End: ${lastOutTime || '?'} | Breaks: ${totalOutTime}m | Net Work: ${formatDuration(effectiveWorkTime)}`;
        navigator.clipboard.writeText(summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClearLogs = () => {
        if (confirm("Clear all logs?")) {
            setLogInput("");
        }
    };

    return (
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
                    <ClipboardList className="w-5 h-5 text-indigo-500" /> Attendance Log Analyzer
                </h2>
                <div className="flex gap-2">
                    {logInput && (
                        <button
                            onClick={handleClearLogs}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Clear logs"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <textarea
                        value={logInput}
                        onChange={(e) => setLogInput(e.target.value)}
                        placeholder="Paste your messy logs here (e.g., '09:56 AMIn, 12:30 PMOut')..."
                        className="w-full h-32 p-3 rounded-lg border border-slate-300 dark:border-slate-600 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:placeholder-slate-600"
                    />
                    <p className="text-xs text-slate-400 mt-2 text-right">
                        {events.length} events parsed
                    </p>
                </div>

                {events.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">

                        {/* Visual Timeline */}
                        <Timeline events={events} />

                        <div className="grid grid-cols-2 gap-4">
                            {/* Net Work Time Card */}
                            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50">
                                <div className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">Effective Work</div>
                                <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{formatDuration(effectiveWorkTime)}</div>
                            </div>

                            {/* Total Out Time Card */}
                            <div className={`p-4 rounded-xl border ${totalOutTime > 60 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50'} flex flex-col justify-center`}>
                                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${totalOutTime > 60 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    Total Breaks
                                </div>
                                <div className={`text-2xl font-bold ${totalOutTime > 60 ? 'text-red-800 dark:text-red-200' : 'text-emerald-800 dark:text-emerald-200'}`}>
                                    {totalOutTime} min
                                </div>
                            </div>
                        </div>

                        {/* Copy Button */}
                        <button
                            onClick={handleCopySummary}
                            className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copied to Clipboard!" : "Copy Summary"}
                        </button>

                        {/* Breaks List */}
                        {breaks.length > 0 ? (
                            <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                    Identified Breaks
                                </div>
                                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                    {breaks.map((b, idx) => (
                                        <div key={idx} className="px-4 py-3 flex justify-between items-center text-sm bg-white dark:bg-slate-800">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <span>{b.start}</span>
                                                <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                                                <span>{b.end}</span>
                                            </div>
                                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                {b.duration} min
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {/* Raw Events Debug */}
                        <details className="group">
                            <summary className="cursor-pointer text-xs text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1 w-fit">
                                View Parsed Events <ArrowRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                            </summary>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                {events.map((e) => (
                                    <div key={e.id} className={e.type === 'IN' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-500'}>
                                        {e.displayTime} {e.type}
                                    </div>
                                ))}
                            </div>
                        </details>
                    </div>
                )}
            </div>
        </section>
    );
};
