import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Timeline = ({ events, currentMinutes = 0 }) => {
    const [hoveredBlock, setHoveredBlock] = useState(null);

    const intervals = useMemo(() => {
        if (!events || events.length === 0) return { blocks: [], totalDuration: 0, startLabel: '', endLabel: '' };

        const result = [];
        const startMin = events[0].minutes;

        // Final end time is either the last event or current time, whichever is greater
        const lastEventMin = events[events.length - 1].minutes;
        const endMin = Math.max(lastEventMin, currentMinutes);
        const totalDuration = endMin - startMin;

        if (totalDuration <= 0) return { blocks: [], totalDuration: 0, startLabel: events[0].displayTime, endLabel: events[0].displayTime };

        // 1. Process all intervals between log events
        for (let i = 0; i < events.length - 1; i++) {
            const current = events[i];
            const next = events[i + 1];
            const duration = next.minutes - current.minutes;
            if (duration <= 0) continue;

            const leftPercent = ((current.minutes - startMin) / totalDuration) * 100;
            const widthPercent = (duration / totalDuration) * 100;

            // Anything after an IN is work until an OUT (or another event)
            // Anything after an OUT is break until an IN
            let type = (current.type === 'IN') ? 'WORK' : 'BREAK';

            result.push({
                id: i,
                left: leftPercent,
                width: widthPercent,
                type,
                startLabel: current.displayTime,
                endLabel: next.displayTime,
                duration
            });
        }

        // 2. Process the active interval from last event to current time
        if (currentMinutes > lastEventMin) {
            const lastEvent = events[events.length - 1];
            const duration = currentMinutes - lastEventMin;
            const leftPercent = ((lastEventMin - startMin) / totalDuration) * 100;
            const widthPercent = (duration / totalDuration) * 100;

            result.push({
                id: 'active',
                left: leftPercent,
                width: widthPercent,
                type: lastEvent.type === 'IN' ? 'WORK' : 'BREAK',
                startLabel: lastEvent.displayTime,
                endLabel: 'Now',
                duration,
                isActive: true
            });
        }

        return {
            blocks: result,
            totalDuration,
            startLabel: events[0].displayTime,
            endLabel: currentMinutes > lastEventMin ? 'Now' : events[events.length - 1].displayTime
        };
    }, [events, currentMinutes]);

    if (!events || events.length === 0 || !intervals.blocks) return null;

    return (
        <div className="mt-6 mb-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-widest">
                <span>{intervals.startLabel}</span>
                <span>{intervals.endLabel}</span>
            </div>
            <div className="relative h-6 w-full bg-slate-100 dark:bg-slate-900/50 rounded-full overflow-hidden flex">
                {intervals.blocks.map((block) => (
                    <div
                        key={block.id}
                        className="absolute h-full"
                        style={{
                            left: `${block.left}%`,
                            width: `${block.width}%`
                        }}
                        onMouseEnter={() => setHoveredBlock(block.id)}
                        onMouseLeave={() => setHoveredBlock(null)}
                    >
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.5, delay: typeof block.id === 'number' ? block.id * 0.05 : 0 }}
                            className={`h-full cursor-pointer transition-all ${block.isActive ? 'animate-pulse opacity-80' : ''} ${block.type === 'WORK'
                                ? 'bg-indigo-500 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-500'
                                : 'bg-amber-400/80 dark:bg-amber-500/40 hover:bg-amber-500 dark:hover:bg-amber-500/60'
                                } ${hoveredBlock === block.id ? 'brightness-110 z-20' : 'z-10'}`}
                            style={{ transformOrigin: 'left' }}
                        />

                        <AnimatePresence>
                            {hoveredBlock === block.id && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
                                >
                                    <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-2 rounded-xl shadow-2xl text-[10px] whitespace-nowrap border border-white/10 dark:border-black/5">
                                        <div className="font-black uppercase tracking-tighter mb-1 flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${block.type === 'WORK' ? 'bg-indigo-400' : 'bg-amber-400'}`}></div>
                                            {block.type} {block.isActive ? '(CURRENTLY)' : ''}
                                        </div>
                                        <div className="text-slate-300 dark:text-slate-600 font-medium">
                                            {block.startLabel} → {block.endLabel}
                                        </div>
                                        <div className="text-indigo-400 dark:text-indigo-600 font-bold mt-0.5">
                                            {block.duration} minutes
                                        </div>
                                        {/* Tooltip Arrow */}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1.5">
                                            <div className="border-[6px] border-transparent border-t-slate-900 dark:border-t-slate-100"></div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
            <div className="flex gap-4 justify-center mt-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Work Phase</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Break Time</span>
                </div>
            </div>
        </div>
    );
};
