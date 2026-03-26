import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { getMergedHolidays, addCustomHoliday, removeCustomHoliday } from '../utils/holidayPersistence';
import { HOLIDAYS_BY_FY, refreshHolidays } from '../utils/sandwichLeaveLogic';
import { useUI } from '../context/UIContext';
import { formatDate } from '../utils/shiftHistory';

export function HolidayManager() {
    const { showSuccess, showError, confirm } = useUI();
    const [holidays, setHolidays] = useState([]);
    const [newDate, setNewDate] = useState('');
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadHolidays();
    }, []);

    const loadHolidays = () => {
        setHolidays(getMergedHolidays(HOLIDAYS_BY_FY));
    };

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newDate || !newName) return;

        // Simple sanitization: strip HTML tags and trim
        const sanitizedName = newName.replace(/<[^>]*>/g, '').trim();
        if (!sanitizedName) {
            showError("Please enter a valid holiday name.");
            return;
        }

        try {
            addCustomHoliday(newDate, sanitizedName);
            refreshHolidays();
            loadHolidays();
            setNewDate('');
            setNewName('');
            showSuccess(`Holiday "${sanitizedName}" added!`);
        } catch (err) {
            showError(err.message);
        }
    };

    const handleDelete = (date, name) => {
        confirm({
            title: 'Delete Holiday?',
            message: `Are you sure you want to remove "${name}"?`,
            onConfirm: () => {
                removeCustomHoliday(date);
                refreshHolidays();
                loadHolidays();
                showSuccess('Holiday removed.');
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Public Holidays</h4>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-11 gap-2 items-end bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="md:col-span-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Date</label>
                    <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>
                <div className="md:col-span-5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Holiday Name</label>
                    <input
                        type="text"
                        placeholder="e.g. New Year's Day"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>
                <div className="md:col-span-2">
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold text-sm shadow-lg shadow-indigo-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>
            </form>

            {/* List */}
            <div className="max-h-64 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                {holidays.map((h, idx) => (
                    <div
                        key={`${h.date}-${idx}`}
                        className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${h.isCustom
                            ? 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100/50 dark:border-indigo-500/20'
                            : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-700/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${h.isCustom ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                            <div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{h.name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                                    {formatDate(h.date)}
                                    {!h.isCustom && ` • ${h.fy}`}
                                </p>
                            </div>
                        </div>

                        {h.isCustom ? (
                            <button
                                onClick={() => handleDelete(h.date, h.name)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="Remove holiday"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">System</span>
                        )}
                    </div>
                ))}

                {holidays.length === 0 && (
                    <div className="text-center py-8 opacity-50">
                        <ShieldAlert className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-xs font-medium">No holidays defined.</p>
                    </div>
                )}
            </div>

            <p className="text-[10px] text-slate-400 italic text-center px-4">
                Note: Custom holidays will be prioritized over system holidays if dates overlap. They are used in the dashboard, heatmap, and leave checker.
            </p>
        </div>
    );
}
