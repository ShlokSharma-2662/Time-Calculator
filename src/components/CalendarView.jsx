import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Circle, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHolidayName } from '../utils/sandwichLeaveLogic';

export const CalendarView = ({ history, onLoadEntry, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const numDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-12 w-full" />);
    }

    for (let d = 1; d <= numDays; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasData = !!history[dateStr];
        const isToday = new Date().toISOString().slice(0, 10) === dateStr;
        const holidayName = getHolidayName(dateStr);

        days.push(
            <motion.button
                key={d}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={holidayName ? `Holiday: ${holidayName}` : ''}
                onClick={() => {
                    if (hasData) {
                        // Keep History open until confirm runs; App closes it on proceed.
                        onLoadEntry({ ...history[dateStr], date: dateStr });
                    }
                }}
                className={`h-12 w-full flex flex-col items-center justify-center rounded-xl relative transition-all border
                    ${hasData 
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 cursor-pointer' 
                        : holidayName
                            ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/20 text-indigo-400 cursor-default'
                            : 'bg-transparent border-transparent text-slate-400 cursor-default'}
                    ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800' : ''}
                `}
            >
                <span className={`text-xs font-bold ${holidayName ? 'text-indigo-500' : ''}`}>{d}</span>
                {hasData && (
                    <div className="absolute bottom-1.5 flex gap-0.5">
                        <Circle className="w-1 h-1 fill-indigo-500 text-indigo-500" />
                        {holidayName && <Star className="w-1 h-1 fill-indigo-400 text-indigo-400" />}
                    </div>
                )}
                {!hasData && holidayName && (
                    <div className="absolute bottom-1.5">
                        <Star className="w-1.5 h-1.5 fill-indigo-400 text-indigo-400" />
                    </div>
                )}
            </motion.button>
        );
    }

    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-2">
                <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    {monthNames[month]} <span className="text-indigo-500">{year}</span>
                </h4>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                    <div key={day} className="text-[10px] font-black text-slate-400 uppercase pb-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days}
            </div>

            <div className="mt-4 flex items-center gap-4 px-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    <div className="w-2 h-2 rounded-full bg-indigo-500/20 border border-indigo-500/30"></div>
                    Logged
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    <div className="w-2 h-2 flex items-center justify-center">
                        <Star className="w-2.5 h-2.5 fill-indigo-400 text-indigo-400" />
                    </div>
                    Holiday
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    <div className="w-2 h-2 rounded-[2px] ring-1 ring-indigo-500"></div>
                    Today
                </div>
            </div>
        </div>
    );
};
