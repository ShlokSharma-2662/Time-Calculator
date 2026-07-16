import React, { useState, useEffect } from 'react';
import { Sun, CheckCircle2, Briefcase, Clock3, ShieldCheck, Coffee, Timer, History, Clock, Lock, Unlock, Zap, Settings, Info, Moon } from 'lucide-react';
import { LEAVE_TYPES } from '../utils/leaveHistory';
import { useUI } from '../context/UIContext';
import { motion } from 'framer-motion';
import { useTimeHelpers } from '../hooks/useTimeHelpers';
import { GlassCard } from './GlassCard';

export const ShiftCalculator = ({
    startTime,
    setStartTime,
    synced,
    shiftDetails,
    activeLeave
}) => {
    const { formatDuration } = useTimeHelpers();
    const [activeTarget, setActiveTarget] = useState('fullDay');

    const handlePreset = (type) => {
        if (type === 'now') {
            const now = new Date();
            setStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        } else {
            setStartTime(type);
        }
    };

    // Calculate diff for current countdown
    const [diffMinutes, setDiffMinutes] = useState(0);

    useEffect(() => {
        if (shiftDetails.detectedTargetKey && shiftDetails.detectedTargetKey !== activeTarget) {
            setActiveTarget(shiftDetails.detectedTargetKey);
        }
    }, [shiftDetails.detectedTargetKey]);

    useEffect(() => {
        const updateDiff = () => {
            const now = new Date();
            const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
            const targetTotalMinutes = shiftDetails[`${activeTarget}AdjustedMinutes`];

            if (targetTotalMinutes !== undefined) {
                setDiffMinutes(targetTotalMinutes - currentTotalMinutes);
            }
        };
        updateDiff();
        const interval = setInterval(updateDiff, 10000);
        return () => clearInterval(interval);
    }, [shiftDetails, activeTarget]);

    const isOvertime = diffMinutes < 0;
    const targetLabel = activeTarget === 'fullDay' ? 'Full' : activeTarget === 'halfDay' ? 'Half' : 'Short';
    const targetAdjustedKey = `${activeTarget}Adjusted`;

    return (
        <GlassCard
            title="Start Time"
            icon={Sun}
            subtitle="When did you begin work?"
            className="overflow-hidden"
            hover={false}
        >
            <div className="absolute top-6 right-6">
                {synced && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-indigo-500/20 shadow-sm"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" /> AUTO-SYNCED
                    </motion.span>
                )}
            </div>

            <div className="mt-4">
                <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-7xl font-black bg-transparent border-none focus:outline-none py-6 text-center tracking-tighter tabular-nums text-slate-900 dark:text-white"
                />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 text-center">
                    {activeLeave?.type === LEAVE_TYPES.HALF_1 ? '1ST HALF LEAVE' :
                        activeLeave?.type === LEAVE_TYPES.HALF_2 ? '2ND HALF LEAVE' :
                            'AUTOMATICALLY DETECTED'}
                </p>

                <div className="flex flex-wrap justify-center gap-2">
                    {['now', '09:00', '09:30', '10:00'].map(p => (
                        <button
                            key={p}
                            onClick={() => handlePreset(p)}
                            className="px-4 py-2.5 rounded-xl bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[10px] font-black uppercase tracking-wider transition-all border border-slate-200 dark:border-white/10 flex items-center gap-2"
                        >
                            {p === 'now' ? <History className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
                            {p === 'now' ? 'Now' : p}
                        </button>
                    ))}
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                    <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
                    <span>Includes {shiftDetails.includedBreakAllowanceMinutes}m break allowance</span>
                </div>
            </div>

            <div className="mt-10 space-y-6">
                <div className="flex p-1.5 bg-slate-900/5 dark:bg-white/5 rounded-2xl gap-1 border border-slate-200 dark:border-white/5 shadow-inner">
                    {['fullDay', 'halfDay', 'shortLeave'].map(target => {
                        const TabIcon = target === 'fullDay' ? Briefcase : target === 'halfDay' ? Clock : Coffee;
                        return (
                            <button
                                key={target}
                                onClick={() => setActiveTarget(target)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex flex-col items-center gap-1 ${activeTarget === target
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xl border border-slate-100 dark:border-white/5'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            >
                                <TabIcon className={`w-4 h-4 ${activeTarget === target ? 'text-indigo-500' : 'opacity-20'}`} />
                                {target === 'fullDay' ? 'Full' : target === 'halfDay' ? 'Half' : 'Short'}
                            </button>
                        );
                    })}
                </div>

                <div className={`p-8 rounded-[2rem] border transition-all shadow-lg ${isOvertime
                    ? 'bg-rose-500/5 border-rose-500/30 shadow-rose-500/5'
                    : 'bg-indigo-500/5 border-indigo-500/30 shadow-indigo-500/5'
                    }`}>
                    <div className="flex flex-col items-center text-center">
                        <span className={`font-black text-[10px] uppercase tracking-[0.25em] flex items-center gap-2 mb-3 ${isOvertime ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {isOvertime ? <Timer className="w-4 h-4 animate-pulse" /> : <Clock3 className="w-4 h-4" />}
                            TARGET END TIME
                        </span>
                        <div className={`text-6xl font-black tabular-nums tracking-tighter ${isOvertime ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                            {shiftDetails.isFullLeave ? '--:--' : shiftDetails[targetAdjustedKey]}
                        </div>

                        <div className="mt-6">
                            <div className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[11px] font-black tracking-[0.1em] shadow-2xl ${isOvertime ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/30'}`}>
                                {isOvertime ? (
                                    <>OVERTIME: +{formatDuration(Math.abs(diffMinutes))}</>
                                ) : (
                                    <>REMAINING: {formatDuration(diffMinutes)}</>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/5 dark:bg-white/5 p-5 rounded-3xl border border-slate-200 dark:border-white/5 group transition-all hover:bg-white dark:hover:bg-white/10">
                        <span className="text-slate-500 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.15em] mb-1 block">Standard</span>
                        <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">{shiftDetails[activeTarget]}</div>
                    </div>

                    <div className="bg-slate-900/5 dark:bg-white/5 p-5 rounded-3xl border border-slate-200 dark:border-white/5 group transition-all hover:bg-white dark:hover:bg-white/10">
                        <span className="text-slate-500 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.15em] mb-1 block">Total Breaks</span>
                        <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">{shiftDetails.extraChargeableBreakMinutes + shiftDetails.includedBreakAllowanceMinutes}<span className="text-sm opacity-40 ml-1">m</span></div>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};
