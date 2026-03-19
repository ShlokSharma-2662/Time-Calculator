import React from 'react';
import { Sun, CheckCircle2, Briefcase, Clock3, ShieldCheck, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTimeHelpers } from '../hooks/useTimeHelpers';

export const ShiftCalculator = ({ startTime, setStartTime, synced, shiftDetails }) => {
    const { formatDuration } = useTimeHelpers();

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

    const shiftFormula = `${formatDuration(shiftDetails.fullDayDurationMinutes)} shift + ${shiftDetails.extraChargeableBreakMinutes}m counted break`;

    return (
        <motion.section
            variants={container}
            initial="hidden"
            animate="show"
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors"
        >
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
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-indigo-100/90">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>First {shiftDetails.includedBreakAllowanceMinutes} minutes of breaks do not extend shift end.</span>
                    </div>
                </div>
            </div>

            <div className="p-6 grid gap-4 bg-white dark:bg-slate-800">
                <motion.div
                    variants={item}
                    whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-br from-emerald-100 via-white to-amber-50 dark:from-slate-700 dark:via-slate-800 dark:to-slate-800 border border-emerald-200 dark:border-slate-600 p-5 rounded-2xl shadow-sm cursor-default"
                >
                    <div className="flex-1">
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium text-sm uppercase tracking-wide">Adjusted End Time</span>
                        <div className="text-5xl font-bold text-emerald-950 dark:text-white mt-2">{shiftDetails.adjustedEnd}</div>
                        <div className="mt-2 text-sm text-emerald-800/80 dark:text-slate-300">
                            {shiftFormula} = {shiftDetails.adjustedEnd}
                        </div>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-900 px-3 py-1 text-xs font-medium text-white dark:bg-emerald-500/20 dark:text-emerald-200">
                            <Coffee className="w-3.5 h-3.5" />
                            Only break time beyond {shiftDetails.includedBreakAllowanceMinutes} min is counted
                        </div>
                    </div>
                    <Clock3 className="w-12 h-12 text-emerald-200 dark:text-slate-600" />
                </motion.div>

                <div className="grid gap-4 md:grid-cols-2">
                    <motion.div
                        variants={item}
                        whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)" }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-4 rounded-xl cursor-default"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase">Base End Time</span>
                            <Briefcase className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                        </div>
                        <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">{shiftDetails.fullDay}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scheduled end without counted break extension</div>
                    </motion.div>
                    <motion.div
                        variants={item}
                        whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)" }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-amber-50 dark:bg-slate-900 border border-amber-100 dark:border-slate-700 p-4 rounded-xl cursor-default"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-amber-700 dark:text-amber-300 font-medium text-xs uppercase">Counted Break</span>
                            <Coffee className="w-4 h-4 text-amber-300 dark:text-amber-500" />
                        </div>
                        <div className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-2">{shiftDetails.extraChargeableBreakMinutes} min</div>
                        <div className="text-xs text-amber-700/80 dark:text-amber-200/80 mt-1">
                            {shiftDetails.includedBreakAllowanceMinutes} min free allowance applied first
                        </div>
                    </motion.div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <motion.div
                        variants={item}
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-4 rounded-xl cursor-default"
                    >
                        <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase">Half Day</span>
                        <div className="text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1">{shiftDetails.halfDay}</div>
                    </motion.div>
                    <motion.div
                        variants={item}
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-4 rounded-xl cursor-default"
                    >
                        <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase">Short Leave</span>
                        <div className="text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1">{shiftDetails.shortLeave}</div>
                    </motion.div>
                </div>
            </div>
        </motion.section>
    );
};
