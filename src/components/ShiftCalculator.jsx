import React, { useState, useEffect } from 'react';
import { Sun, CheckCircle2, Briefcase, Clock3, ShieldCheck, Coffee, Timer, History, Goal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTimeHelpers } from '../hooks/useTimeHelpers';

export const ShiftCalculator = ({ startTime, setStartTime, synced, shiftDetails }) => {
    const { formatDuration } = useTimeHelpers();
    const [activeTarget, setActiveTarget] = useState('fullDay');
    const [now, setNow] = useState(new Date());

    // Update 'now' every minute for accurately countdown
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    // Preset helper
    const handlePreset = (time) => {
        if (time === 'now') {
            const current = new Date();
            setStartTime(`${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`);
        } else {
            setStartTime(time);
        }
    };

    // Calculate remaining/overtime
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const targetAdjustedKey = `${activeTarget}Adjusted`;
    const targetDurationKey = `${activeTarget}DurationMinutes`;

    // We need minutes since start for countdown
    const targetEndMinutes = shiftDetails.startMinutes + shiftDetails[targetDurationKey] + shiftDetails.extraChargeableBreakMinutes;
    const diffMinutes = targetEndMinutes - currentTotalMinutes;
    const isOvertime = diffMinutes < 0;

    const targetLabel = {
        fullDay: 'Full Day',
        halfDay: 'Half Day',
        shortLeave: 'Short Leave'
    }[activeTarget];

    return (
        <motion.section
            variants={container}
            initial="hidden"
            animate="show"
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors"
        >
            {/* Start Time Section */}
            <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white transition-colors">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-indigo-200">
                            <Sun className="w-5 h-5" /> Start Time
                        </h2>
                        <p className="text-slate-400 text-xs mt-1">When did you begin work?</p>
                    </div>
                    {synced && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"
                        >
                            <CheckCircle2 className="w-3 h-3" /> Auto-Synced
                        </motion.span>
                    )}
                </div>

                <div className="mt-4">
                    <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full text-5xl font-bold bg-transparent border-b-2 border-slate-700 dark:border-slate-600 focus:border-indigo-400 focus:outline-none py-2 text-center tracking-wider font-mono dark:text-white"
                    />

                    {/* Presets */}
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {['now', '09:00', '09:30', '10:00'].map(p => (
                            <button
                                key={p}
                                onClick={() => handlePreset(p)}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold uppercase transition-colors border border-slate-700 flex items-center gap-1.5"
                            >
                                {p === 'now' ? <History className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
                                {p === 'now' ? 'Now' : p}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-indigo-100/70 border-t border-slate-800 pt-3">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>First {shiftDetails.includedBreakAllowanceMinutes} minutes of breaks are covered.</span>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-4 bg-white dark:bg-slate-800">
                {/* Target Selector */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl gap-1">
                    {['fullDay', 'halfDay', 'shortLeave'].map(target => (
                        <button
                            key={target}
                            onClick={() => setActiveTarget(target)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${activeTarget === target
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800'}`}
                        >
                            <Goal className={`w-3 h-3 ${activeTarget === target ? 'text-indigo-500' : ''}`} />
                            {target === 'fullDay' ? 'Full' : target === 'halfDay' ? 'Half' : 'Short'}
                        </button>
                    ))}
                </div>

                {/* Main End Time Card */}
                <motion.div
                    key={activeTarget}
                    variants={item}
                    initial="hidden"
                    animate="show"
                    whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                    className={`bg-gradient-to-br border p-5 rounded-2xl shadow-sm transition-colors ${isOvertime
                            ? 'from-rose-50 to-orange-50 dark:from-rose-900/10 dark:to-orange-900/10 border-rose-200 dark:border-rose-900/30'
                            : 'from-emerald-50 to-indigo-50 dark:from-emerald-900/10 dark:to-indigo-900/10 border-emerald-200 dark:border-emerald-900/30'
                        }`}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <span className={`font-medium text-xs uppercase tracking-wide flex items-center gap-2 ${isOvertime ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                {isOvertime ? <Timer className="w-3.5 h-3.5 animate-pulse" /> : <Clock3 className="w-3.5 h-3.5" />}
                                Adjusted {targetLabel} End
                            </span>
                            <div className={`text-5xl font-bold mt-2 ${isOvertime ? 'text-rose-950 dark:text-rose-100' : 'text-emerald-950 dark:text-emerald-100'}`}>
                                {shiftDetails[targetAdjustedKey]}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${isOvertime ? 'bg-rose-600 text-white' : 'bg-emerald-900 text-white dark:bg-emerald-500/20 dark:text-emerald-200'}`}>
                                    {isOvertime ? (
                                        <>Overtime: +{formatDuration(Math.abs(diffMinutes))}</>
                                    ) : (
                                        <>Remaining: {formatDuration(diffMinutes)}</>
                                    )}
                                </div>
                                <div className="px-3 py-1 rounded-full bg-slate-900/5 dark:bg-white/5 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <Coffee className="w-3 h-3" />
                                    +{shiftDetails.extraChargeableBreakMinutes}m counted
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Secondary Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <motion.div
                        variants={item}
                        className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-4 rounded-xl"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 font-medium text-[10px] uppercase">Base End Time</span>
                            <Briefcase className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{shiftDetails[activeTarget]}</div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-1">Without extra breaks</p>
                    </motion.div>

                    <motion.div
                        variants={item}
                        className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-4 rounded-xl"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 font-medium text-[10px] uppercase">Break Usage</span>
                            <Coffee className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{shiftDetails.extraChargeableBreakMinutes + shiftDetails.includedBreakAllowanceMinutes}m</div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-1">{shiftDetails.includedBreakAllowanceMinutes}m free allowance used</p>
                    </motion.div>
                </div>
            </div>
        </motion.section>
    );
};
