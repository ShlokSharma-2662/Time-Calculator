import React, { useMemo } from 'react';

export const Timeline = ({ events }) => {
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
            <div className="relative h-6 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden flex">
                {intervals.blocks.map((block) => (
                    <div
                        key={block.id}
                        className={`absolute h-full transition-all duration-300 ${block.type === 'WORK'
                                ? 'bg-indigo-500 dark:bg-indigo-600 z-10'
                                : 'bg-amber-300 dark:bg-amber-500/50 z-0'
                            }`}
                        style={{
                            left: `${block.left}%`,
                            width: `${block.width}%`
                        }}
                        title={`${block.type}: ${block.startLabel} - ${block.endLabel} (${block.duration}m)`}
                    />
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
