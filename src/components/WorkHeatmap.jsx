import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getYearlyHeatmapData } from '../utils/shiftHistory';
import { getHolidayName } from '../utils/sandwichLeaveLogic';

export function WorkHeatmap({ history }) {
    const data = useMemo(() => getYearlyHeatmapData(history), [history]);

    // Format local date as YYYY-MM-DD to avoid UTC conversion shifts
    const getLocalDateStr = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Generate dates for the last 52 weeks (364 days)
    const { weeks, monthLabels } = useMemo(() => {
        const weekResult = [];
        const now = new Date();
        const today = new Date(now);
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
            const dateStr = getLocalDateStr(iterDate);
            const isFuture = iterDate > now;
            
            // Force 0 for future dates OR get from history
            const dayData = isFuture ? { hours: 0, intensity: 0 } : (data[dateStr] || { hours: 0, intensity: 0 });
            const holidayName = getHolidayName(dateStr);

            currentWeek.push({
                date: dateStr,
                displayDate: iterDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
                isFuture,
                holidayName,
                ...dayData
            });

            if (currentWeek.length === 7) {
                weekResult.push(currentWeek);
                currentWeek = [];
            }

            iterDate.setDate(iterDate.getDate() + 1);
            if (iterDate > today && iterDate.getDay() === 0) break;
        }

        // Reverse for "Latest First"
        const finalWeeks = [...weekResult].reverse();

        // Calculate Month Labels based on reversed weeks
        const finalMonthLabels = [];
        let lastMonth = '';

        finalWeeks.forEach((week, idx) => {
            const monthName = new Date(week[0].date).toLocaleDateString('en-US', { month: 'short' });
            if (monthName !== lastMonth) {
                finalMonthLabels.push({ month: monthName, weekIndex: idx });
                lastMonth = monthName;
            }
        });

        return { weeks: finalWeeks, monthLabels: finalMonthLabels };
    }, [data]);

    const getIntensityClass = (intensity, isFuture) => {
        if (isFuture) return 'bg-slate-50 dark:bg-slate-900/20 opacity-30 select-none';

        switch (intensity) {
            case 4: return 'bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.3)]';
            case 3: return 'bg-indigo-400 dark:bg-indigo-600';
            case 2: return 'bg-indigo-300 dark:bg-indigo-700';
            case 1: return 'bg-indigo-100 dark:bg-indigo-900/40';
            default: return 'bg-slate-100 dark:bg-slate-800/50';
        }
    };

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center justify-between">
                <span>Work Pattern Heatmap</span>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase tracking-wider">Latest First</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Last 52 Weeks</span>
                </div>
            </h3>

            <div className="flex gap-1 overflow-x-auto pb-4 pt-4 scrollbar-hide relative">
                {/* Day Labels - Sticky on the left */}
                <div className="flex flex-col gap-1 pr-3 mt-4 sticky left-0 bg-white/10 dark:bg-slate-800/20 backdrop-blur-sm z-20 h-[calc(7*16px)]">
                    {dayLabels.map((day, idx) => (
                        <span key={day} className="h-3 text-[9px] font-black text-slate-400 leading-3 uppercase pr-1 h-3">
                            {[1, 3, 5].includes(idx) ? day : ''}
                        </span>
                    ))}
                </div>

                {/* Heatmap Grid & Month Labels - Together inside scrollable div */}
                <div className="flex gap-1 relative pt-4">
                    {weeks.map((week, weekIdx) => {
                        // Find if this week has a month label
                        const monthLabel = monthLabels.find(l => l.weekIndex === weekIdx);

                        return (
                            <div key={weekIdx} className="flex flex-col gap-1 flex-shrink-0 relative">
                                {/* Inline Month Label */}
                                {monthLabel && (
                                    <span className="absolute -top-5 left-0 text-[10px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                                        {monthLabel.month}
                                    </span>
                                )}

                                {week.map((day, dayIdx) => (
                                    <motion.div
                                        key={day.date}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: (weekIdx * 7 + dayIdx) * 0.0005 }}
                                        className={`w-3 h-3 rounded-[2px] cursor-help relative group ${getIntensityClass(day.intensity, day.isFuture)}`}
                                    >
                                        {/* Holiday Marker */}
                                        {day.holidayName && (
                                            <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_3px_rgba(79,70,229,0.5)] z-10" />
                                        )}

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30 shadow-2xl border border-white/10">
                                            <p className="font-black mb-0.5">{day.displayDate}</p>
                                            {day.holidayName && (
                                                <p className="text-indigo-400 font-black mb-1 flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                                                    {day.holidayName}
                                                </p>
                                            )}
                                            <p className="opacity-70 font-bold">
                                                {day.isFuture ? 'Upcoming Day' : `${day.hours || 0} hours worked`}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <span>Less</span>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-slate-100 dark:bg-slate-800/50" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-indigo-100 dark:bg-indigo-900/40" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-indigo-300 dark:bg-indigo-700" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-indigo-400 dark:bg-indigo-600" />
                    <div className="w-2.5 h-2.5 rounded-[1px] bg-indigo-600 dark:bg-indigo-500" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
}
