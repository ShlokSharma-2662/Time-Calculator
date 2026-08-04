import React, { useRef, useState } from 'react';
import { X, Download, Upload, Trash2, Calendar, ArrowRight, IndianRupee, Percent, ShieldCheck, Lock, KeyRound } from 'lucide-react';
import { downloadBackup, importAllData, clearAllData } from '../utils/dataManagement';
import { useUI } from '../context/UIContext';
import { HolidayManager } from './HolidayManager';
import { useFinancialSettings } from '../hooks/useFinancialSettings';
import { PasscodeModal } from './PasscodeModal';

export const SettingsModal = ({ isOpen, onClose, shiftDuration, setShiftDuration, use24Hour: _use24Hour, setUse24Hour: _setUse24Hour }) => {
    const { showSuccess, showError, confirm } = useUI();
    const { settings, updateSettings, isPrivacyMode, togglePrivacy, hasPasscode, setPasscode } = useFinancialSettings();
    const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleRestore = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (importAllData(json)) {
                    showSuccess('Data restored successfully! The page will now reload.');
                    setTimeout(() => window.location.reload(), 2000);
                }
            } catch (err) {
                showError('Error restoring data: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleClear = () => {
        confirm({
            title: 'Clear All Data?',
            message: 'Are you sure you want to clear all data? This cannot be undone.',
            onConfirm: () => {
                clearAllData();
                showSuccess('Data cleared! The page will now reload.');
                setTimeout(() => window.location.reload(), 2000);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 md:p-14 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tight">System Settings</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure your WorkShift experience</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden max-h-[80vh]">
                    {/* Left Column: General & Data */}
                    <div className="lg:col-span-4 p-8 py-10 border-r border-slate-100 dark:border-slate-800 overflow-y-auto scrollbar-thin transition-all bg-slate-50/30 dark:bg-slate-900/30">
                        {/* Preferences */}
                        <div className="space-y-8">
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">General Preferences</h4>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">
                                        Shift Duration (Hrs)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={shiftDuration}
                                        onChange={(e) => setShiftDuration(Number(e.target.value))}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <Lock className="w-4 h-4 text-indigo-500" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Privacy Mode</span>
                                    </div>
                                    <button
                                        onClick={() => togglePrivacy()}
                                        className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${isPrivacyMode ? 'bg-indigo-500 shadow-lg shadow-indigo-500/30' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${isPrivacyMode ? 'translate-x-7' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Financial Configuration */}
                        <div className="space-y-8 pt-8">
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Financial Engineering</h4>

                            <div className="space-y-6">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">
                                        <IndianRupee className="w-3.5 h-3.5" />
                                        Annual CTC (Gross)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.annualCTC}
                                        onChange={(e) => updateSettings({ annualCTC: Number(e.target.value) })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-sm"
                                    />
                                </div>

                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <KeyRound className="w-4 h-4 text-indigo-500" />
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Financial Passcode</span>
                                        </div>
                                        {hasPasscode && (
                                            <button
                                                onClick={() => setPasscode(null)}
                                                className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsPasscodeModalOpen(true)}
                                        className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-indigo-500/20"
                                    >
                                        {hasPasscode ? 'Change Passcode' : 'Set Security Passcode'}
                                    </button>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">
                                        <Percent className="w-3.5 h-3.5" />
                                        Basic % of Gross
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={settings.basicPercentOfGross}
                                        onChange={(e) => updateSettings({ basicPercentOfGross: Number(e.target.value) })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Data Management */}
                        <div className="space-y-8 pt-8 pb-12">
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Data Engineering</h4>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={downloadBackup}
                                    className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all font-bold text-xs group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Download className="w-4 h-4 text-indigo-500" />
                                        <span>Export Backup</span>
                                    </div>
                                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json" />

                                <button
                                    onClick={handleClear}
                                    className="flex items-center justify-center gap-2 mt-4 px-4 py-3 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all font-bold text-xs border border-rose-100 dark:border-rose-900/20"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Destructive Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Holiday Manager */}
                    <div className="lg:col-span-8 p-0 flex flex-col min-h-0 bg-white dark:bg-slate-900">
                        <div className="flex-1 overflow-y-auto p-8 py-10 pb-16 scrollbar-thin">
                            <HolidayManager />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 px-8 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                        Live System Status: Secured
                    </p>
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all font-black uppercase tracking-widest text-xs"
                    >
                        Save & Close
                    </button>
                </div>
            </div>

            <PasscodeModal
                isOpen={isPasscodeModalOpen}
                onClose={() => setIsPasscodeModalOpen(false)}
                onSuccess={(code) => {
                    setPasscode(code);
                    setIsPasscodeModalOpen(false);
                    showSuccess('Passcode updated securely');
                }}
                isSettingMode={true}
            />
        </div>
    );
};
