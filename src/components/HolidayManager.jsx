import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { getMergedHolidays, addCustomHoliday, removeCustomHoliday } from '../utils/holidayPersistence';
import { HOLIDAYS_BY_FY } from '../utils/sandwichLeaveLogic';
import { useUI } from '../context/UIContext';
import { formatDate } from '../utils/dateUtils';

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
                loadHolidays();
                showSuccess('Holiday removed.');
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-semibold text-white">Public holidays</h4>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-11 gap-2 items-end bg-slate-900/50 p-3 rounded-xl border border-white/10">
                <div className="md:col-span-4">
                    <label className="block text-xs text-slate-400 mb-1 ml-1">Date</label>
                    <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full p-2 text-sm rounded-lg border border-white/10 bg-slate-950 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        required
                    />
                </div>
                <div className="md:col-span-5">
                    <label className="block text-xs text-slate-400 mb-1 ml-1">Holiday name</label>
                    <input
                        type="text"
                        placeholder="e.g. New Year's Day"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full p-2 text-sm rounded-lg border border-white/10 bg-slate-950 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        required
                    />
                </div>
                <div className="md:col-span-2">
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm"
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
                        className={`group flex items-center justify-between p-3 rounded-xl border ${h.isCustom
                            ? 'bg-indigo-900/10 border-indigo-500/20'
                            : 'bg-slate-800/20 border-white/10'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${h.isCustom ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                            <div>
                                <p className="text-sm font-medium text-slate-200">{h.name}</p>
                                <p className="text-xs text-slate-400">
                                    {formatDate(h.date)}
                                    {!h.isCustom && ` · ${h.fy}`}
                                </p>
                            </div>
                        </div>

                        {h.isCustom ? (
                            <button
                                onClick={() => handleDelete(h.date, h.name)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-900/20 rounded-lg"
                                title="Remove holiday"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <span className="text-[10px] text-slate-500 border border-white/10 px-1.5 py-0.5 rounded">System</span>
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
                Note: Custom holidays override system holidays on the same date. They affect leave calculations and the heatmap.
            </p>
        </div>
    );
}
