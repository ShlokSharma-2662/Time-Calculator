import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Trash2, Plus, Coffee, Moon, Sun } from 'lucide-react';
import { getLeaveHistory, addLeaveToHistory, removeLeaveFromHistory, LEAVE_TYPES } from '../utils/leaveHistory';
import { formatDate } from '../utils/dateUtils';
import { useUI } from '../context/UIContext';

export function LeaveTracker() {
    const { showSuccess, confirm } = useUI();
    const [history, setHistory] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState(LEAVE_TYPES.FULL);
    const [shortDuration, setShortDuration] = useState(60); // minutes

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = () => {
        const data = getLeaveHistory();
        setHistory(data.leaves);
    };

    const handleAdd = (e) => {
        e.preventDefault();

        const leaveData = {
            date,
            type,
            durationMinutes: type === LEAVE_TYPES.SHORT ? parseInt(shortDuration) : 0
        };

        addLeaveToHistory(leaveData);
        loadHistory();
        showSuccess('Leave logged successfully! 🏖️');
    };

    const handleDelete = (id, type) => {
        confirm({
            title: 'Delete Leave?',
            message: `Remove this ${type} log?`,
            onConfirm: () => {
                removeLeaveFromHistory(id);
                loadHistory();
                showSuccess('Leave removed.');
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700"
        >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
                        <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Leave Management</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Log your absences & time-off</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Form */}
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                    <div className="md:col-span-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                            required
                        />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full p-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold cursor-pointer"
                        >
                            {Object.values(LEAVE_TYPES).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        {type === LEAVE_TYPES.SHORT ? (
                            <>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Minutes</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="540"
                                    value={shortDuration}
                                    onChange={(e) => setShortDuration(e.target.value)}
                                    className="w-full p-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                />
                            </>
                        ) : (
                            <div className="h-[52px] flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                N/A
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            className="w-full h-[46px] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Log
                        </button>
                    </div>
                </form>

                {/* List */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Recent Logs
                    </h4>

                    <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                        <AnimatePresence mode="popLayout">
                            {history.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <Coffee className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No recent leaves</p>
                                </div>
                            ) : (
                                history.map((leave) => (
                                    <motion.div
                                        key={leave.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="group flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-500/30 transition-all shadow-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${leave.type === LEAVE_TYPES.FULL ? 'bg-orange-500/10 text-orange-500' :
                                                leave.type === LEAVE_TYPES.SHORT ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-indigo-500/10 text-indigo-500'
                                                }`}>
                                                {leave.type === LEAVE_TYPES.FULL ? <Calendar className="w-4 h-4" /> :
                                                    leave.type === LEAVE_TYPES.SHORT ? <Clock className="w-4 h-4" /> :
                                                        leave.type === LEAVE_TYPES.HALF_1 ? <Sun className="w-4 h-4" /> :
                                                            <Moon className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">
                                                    {leave.type === LEAVE_TYPES.SHORT ? `${leave.durationMinutes}m Off` : leave.type}
                                                </p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                                                    {formatDate(leave.date || leave.startDate)}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDelete(leave.id, leave.type)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[10px] text-slate-500 italic text-center leading-relaxed">
                    Note: Logs are automatically factored into your Dashboard adherence metrics.
                    Full days remove the target entirely, while half days and short-offs reduce it proportionally.
                </p>
            </div>
        </motion.div>
    );
}
