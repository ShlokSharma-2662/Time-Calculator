import React from 'react';
import { X } from 'lucide-react';

export const SettingsModal = ({ isOpen, onClose, shiftDuration, setShiftDuration, use24Hour, setUse24Hour }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Settings</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Shift Duration */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Full day duration (hours)
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            value={shiftDuration}
                            onChange={(e) => setShiftDuration(Number(e.target.value))}
                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Time Format */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Use 24-hour format</span>
                        <button
                            onClick={() => setUse24Hour(!use24Hour)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${use24Hour ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${use24Hour ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
