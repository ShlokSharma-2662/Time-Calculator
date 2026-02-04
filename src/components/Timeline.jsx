import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Timeline = ({ events }) => {
    const [hoveredBlock, setHoveredBlock] = useState(null);

    const intervals = useMemo(() => {
        if (!events || events.length < 2) return [];

        const result = [];
        // Start from the first event
        const startMin = events[0].minutes;
        const endMin = events[events.length - 1].minutes;
        const totalDuration = endMin - startMin;

        if (totalDuration <= 0) return [];

        for (let i = 0; i < events.length - 1; i++) {
            const current = events[i];
            const next = events[i + 1];

            // Duration of this block
            const duration = next.minutes - current.minutes;
            if (duration <= 0) continue;

            const leftPercent = ((current.minutes - startMin) / totalDuration) * 100;
            const widthPercent = (duration / totalDuration) * 100;

            let type = 'UNKNOWN';
            if (current.type === 'IN' && next.type === 'OUT') type = 'WORK';
            if (current.type === 'OUT' && next.type === 'IN') type = 'BREAK';

            if (type !== 'UNKNOWN') {
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
        }
        return { blocks: result, totalDuration, startLabel: events[0].displayTime, endLabel: events[events.length - 1].displayTime };
    }, [events]);

    if (!events || events.length < 2 || !intervals.blocks) return null;

    return (
        <div className="mt-6 mb-2">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{intervals.startLabel}</span>
                <span>{intervals.endLabel}</span>
            </div>
            <div className="relative h-6 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-visible flex">
                {intervals.blocks.map((block) => (
                    <div
                        key={block.id}
                        className="relative"
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
                            transition={{ duration: 0.5, delay: block.id * 0.1 }}
                            className={`h-6 cursor-pointer transition-all ${block.type === 'WORK'
                                    ? 'bg-indigo-500 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-500'
                                    : 'bg-amber-300 dark:bg-amber-500/50 hover:bg-amber-400 dark:hover:bg-amber-500/70'
                                } ${hoveredBlock === block.id ? 'scale-y-125 shadow-lg z-20' : 'z-10'}`}
                            style={{ transformOrigin: 'left' }}
                        />

                        <AnimatePresence>
                            {hoveredBlock === block.id && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
                                >
                                    <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap">
                                        <div className="font-bold mb-1">{block.type}</div>
                                        <div className="text-slate-300 dark:text-slate-600">
                                            {block.startLabel} → {block.endLabel}
                                        </div>
                                        <div className="text-slate-400 dark:text-slate-500 font-mono">
                                            {block.duration} minutes
                                        </div>
                                        {/* Arrow */}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                            <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-100"></div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
            <div className="flex gap-4 justify-center mt-2">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Work</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-300 dark:bg-amber-500/50"></div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Break</span>
                </div>
            </div>
        </div>
    );
};
