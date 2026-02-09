import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import {
    getMonthDates,
    getMonthStartDay,
    isDateInRange,
    isWeekend,
    isNonWorkingDay,
    getHolidayName,
    formatDateISO,
    COMPANY_HOLIDAYS
} from '../utils/sandwichLeaveLogic';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function LeaveCalendar({ startDate, endDate, sandwichResult }) {
    const today = new Date();

    // Parse year/month directly from ISO string to avoid timezone issues
    const getYearFromDate = (dateStr) => {
        if (!dateStr) return today.getFullYear();
        return parseInt(dateStr.split('-')[0], 10);
    };

    const getMonthFromDate = (dateStr) => {
        if (!dateStr) return today.getMonth() + 1;
        return parseInt(dateStr.split('-')[1], 10);
    };

    const [currentYear, setCurrentYear] = useState(getYearFromDate(startDate));
    const [currentMonth, setCurrentMonth] = useState(getMonthFromDate(startDate));

    // Get all dates for current month
    const monthDates = useMemo(() => {
        return getMonthDates(currentYear, currentMonth);
    }, [currentYear, currentMonth]);

    // Get the starting day offset (for calendar grid alignment)
    const startDayOffset = useMemo(() => {
        return getMonthStartDay(currentYear, currentMonth);
    }, [currentYear, currentMonth]);

    // Navigation handlers
    const goToPreviousMonth = () => {
        if (currentMonth === 1) {
            setCurrentMonth(12);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 12) {
            setCurrentMonth(1);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const goToToday = () => {
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth() + 1);
    };

    // Helper to determine date styling
    const getDateStyle = (date) => {
        const dateStr = formatDateISO(date);
        const isInRange = startDate && endDate && isDateInRange(date, startDate, endDate);
        // Direct string comparison to avoid timezone issues
        const isStart = startDate && dateStr === startDate;
        const isEnd = endDate && dateStr === endDate;
        const isWknd = isWeekend(date);
        const isHoliday = isNonWorkingDay(date, COMPANY_HOLIDAYS) && !isWknd;
        const isToday = dateStr === formatDateISO(today);

        // Check if it's a sandwich day (non-working day in range)
        const isSandwich = sandwichResult?.success &&
            sandwichResult?.isSandwich &&
            sandwichResult?.sandwichDates?.some(sd =>
                formatDateISO(sd) === dateStr
            );

        let baseClasses = 'relative flex items-center justify-center h-10 rounded-lg text-sm font-medium transition-all cursor-default';

        if (isStart || isEnd) {
            return baseClasses + ' bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105';
        }

        if (isSandwich) {
            return baseClasses + ' bg-orange-400 dark:bg-orange-600 text-white border-2 border-orange-600 dark:border-orange-400';
        }

        if (isInRange && !isWknd && !isHoliday) {
            // Working day in leave range
            return baseClasses + ' bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100';
        }

        if (isHoliday) {
            return baseClasses + ' bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700';
        }

        if (isWknd) {
            return baseClasses + ' bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
        }

        if (isToday) {
            return baseClasses + ' border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300';
        }

        return baseClasses + ' hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Calendar View
                </h3>

                <button
                    onClick={goToToday}
                    className="px-3 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                    Today
                </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={goToPreviousMonth}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>

                <div className="text-lg font-semibold text-slate-800 dark:text-white">
                    {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </div>

                <button
                    onClick={goToNextMonth}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
            </div>

            {/* Day Names Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map(day => (
                    <div
                        key={day}
                        className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: startDayOffset }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-10" />
                ))}

                {/* Date cells */}
                <AnimatePresence mode="wait">
                    {monthDates.map((date, index) => {
                        const dateStr = formatDateISO(date);
                        const holidayName = getHolidayName(dateStr);

                        return (
                            <motion.div
                                key={dateStr}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.01 }}
                                className="relative group"
                            >
                                <div className={getDateStyle(date)}>
                                    {date.getDate()}

                                    {/* Holiday indicator dot */}
                                    {holidayName && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-500 rounded-full" />
                                    )}
                                </div>

                                {/* Tooltip for holiday name */}
                                {holidayName && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        {holidayName}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-500 to-purple-600" />
                        <span className="text-slate-600 dark:text-slate-400">Start/End</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-200 dark:bg-green-800" />
                        <span className="text-slate-600 dark:text-slate-400">Working Leave</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-orange-400 dark:bg-orange-600 border-2 border-orange-600" />
                        <span className="text-slate-600 dark:text-slate-400">Sandwich Day</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/30 border border-purple-300" />
                        <span className="text-slate-600 dark:text-slate-400">Holiday</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800" />
                        <span className="text-slate-600 dark:text-slate-400">Weekend</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" />
                        <span className="text-slate-600 dark:text-slate-400">Today</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
