import React from 'react';
import { Sun, CheckCircle2, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

export const ShiftCalculator = ({ startTime, setStartTime, synced, shiftDetails }) => {
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
                </div>
            </div>

            <div className="p-6 grid gap-4 bg-white dark:bg-slate-800">
                {/* Primary Card: Full Day */}
                <motion.div
                    variants={item}
                    whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-700 dark:to-slate-800 border border-indigo-100 dark:border-slate-600 p-5 rounded-xl flex justify-between items-center shadow-sm cursor-default"
                >
                    <div>
                        <span className="text-indigo-600 dark:text-indigo-300 font-medium text-sm uppercase tracking-wide">Day End</span>
                        <div className="text-4xl font-bold text-indigo-900 dark:text-white mt-1">{shiftDetails.fullDay}</div>
                        <div className="text-indigo-400 dark:text-indigo-300 text-xs mt-1">Full Shift</div>
                    </div>
                    <Briefcase className="w-10 h-10 text-indigo-200 dark:text-slate-600" />
                </motion.div>

                {/* Grid for Secondary Times */}
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
