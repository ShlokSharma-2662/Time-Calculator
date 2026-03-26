import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getYearlyHeatmapData } from '../utils/shiftHistory';

export function WorkHeatmap() {
    const data = useMemo(() => getYearlyHeatmapData(), []);

    // Generate dates for the last 52 weeks (364 days)
    const weeks = useMemo(() => {
        const result = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Start from 52 weeks ago (aligned to Sunday)
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364);
        while (startDate.getDay() !== 0) {
            startDate.setDate(startDate.getDate() - 1);
        }

        let currentWeek = [];
        const iterDate = new Date(startDate);

        for (let i = 0; i < 371; i++) { // ~53 weeks to ensure coverage
            const dateStr = iterDate.toISOString().split('T')[0];
            const dayData = data[dateStr] || { hours: 0, intensity: 0 };

            currentWeek.push({
                date: dateStr,
                displayDate: iterDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
                ...dayData
            });

            if (currentWeek.length === 7) {
                result.push(currentWeek);
                currentWeek = [];
            }

            iterDate.setDate(iterDate.getDate() + 1);
            if (iterDate > today && iterDate.getDay() === 0) break;
        }

        return result;
    }, [data]);

    const getIntensityClass = (intensity) => {
        switch (intensity) {
            case 4: return 'bg-indigo-600 dark:bg-indigo-500';
            case 3: return 'bg-indigo-400 dark:bg-indigo-600';
            case 2: return 'bg-indigo-300 dark:bg-indigo-700';
            case 1: return 'bg-indigo-100 dark:bg-indigo-900/40';
            default: return 'bg-slate-100 dark:bg-slate-800/50';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600 overflow-hidden">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center justify-between">
                <span>Work Pattern Heatmap</span>
                <span className="text-xs font-normal text-slate-500">Last 52 Weeks</span>
            </h3>

            <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                {weeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-1 flex-shrink-0">
                        {week.map((day, dayIdx) => (
                            <motion.div
                                key={day.date}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: (weekIdx * 7 + dayIdx) * 0.001 }}
                                className={`w-3 h-3 rounded-[2px] cursor-help relative group ${getIntensityClass(day.intensity)}`}
                            >
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 shadow-xl">
                                    <p className="font-bold">{day.displayDate}</p>
                                    <p>{day.hours || 0} hours worked</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-[1px] bg-slate-100 dark:bg-slate-800/50" />
                    <div className="w-2 h-2 rounded-[1px] bg-indigo-100 dark:bg-indigo-900/40" />
                    <div className="w-2 h-2 rounded-[1px] bg-indigo-300 dark:bg-indigo-700" />
                    <div className="w-2 h-2 rounded-[1px] bg-indigo-400 dark:bg-indigo-600" />
                    <div className="w-2 h-2 rounded-[1px] bg-indigo-600 dark:bg-indigo-500" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
}
