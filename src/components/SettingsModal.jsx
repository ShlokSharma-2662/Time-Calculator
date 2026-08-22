import React, { useRef, useState } from 'react';
import { X, Download, Upload, Trash2, Calendar, ArrowRight, IndianRupee, Percent, Lock, KeyRound, Clock3 } from 'lucide-react';
import { downloadBackup, importAllData, clearAllData } from '../utils/dataManagement';
import { useUI } from '../context/UIContext';
import { HolidayManager } from './HolidayManager';
import { useFinancialSettings } from '../hooks/useFinancialSettings';
import { PasscodeModal } from './PasscodeModal';

const fieldClass = 'w-full p-3 rounded-xl border border-white/10 bg-slate-950 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';
const panelClass = 'flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-white/10';

export const SettingsModal = ({
    isOpen,
    onClose,
    shiftDuration,
    setShiftDuration,
    startTime,
    setStartTime,
}) => {
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
                    showSuccess('Data restored. Reloading…');
                    setTimeout(() => window.location.reload(), 2000);
                }
            } catch (err) {
                showError('Could not restore backup: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleClear = () => {
        confirm({
            title: 'Clear all data?',
            message: 'This cannot be undone.',
            onConfirm: () => {
                clearAllData();
                showSuccess('Data cleared. Reloading…');
                setTimeout(() => window.location.reload(), 2000);
            }
        });
    };

    const handlePreset = (type) => {
        if (type === 'now') {
            const now = new Date();
            setStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
            return;
        }
        setStartTime(type);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/70 backdrop-blur-md">
            <div className="bg-slate-950 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-white/10 flex flex-col">
                <div className="p-5 border-b border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Settings</h3>
                            <p className="text-sm text-slate-400">Shift, salary, holidays, and backup</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden max-h-[80vh]">
                    <div className="lg:col-span-4 p-6 border-r border-white/10 overflow-y-auto bg-slate-950">
                        <div className="space-y-6">
                            <h4 className="text-sm text-slate-400">Shift</h4>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Duration (hours)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={shiftDuration}
                                    onChange={(e) => setShiftDuration(Number(e.target.value))}
                                    className={fieldClass}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Start time</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className={fieldClass}
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {['now', '09:00', '09:30', '10:00'].map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => handlePreset(preset)}
                                            className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-slate-300 hover:text-white hover:bg-white/5 inline-flex items-center gap-1"
                                        >
                                            <Clock3 className="w-3.5 h-3.5" />
                                            {preset === 'now' ? 'Now' : preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={panelClass}>
                                <div className="flex items-center gap-3">
                                    <Lock className="w-4 h-4 text-indigo-300" />
                                    <span className="text-sm text-slate-200">Privacy mode</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => togglePrivacy()}
                                    className={`w-12 h-7 rounded-full p-1 ${isPrivacyMode ? 'bg-indigo-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isPrivacyMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6 pt-8">
                            <h4 className="text-sm text-slate-400">Salary</h4>
                            <div>
                                <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                    <IndianRupee className="w-3.5 h-3.5" />
                                    Annual CTC
                                </label>
                                <input
                                    type="number"
                                    value={settings.annualCTC}
                                    onChange={(e) => updateSettings({ annualCTC: Number(e.target.value) })}
                                    className={fieldClass}
                                />
                            </div>
                            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-sm text-slate-200">
                                        <KeyRound className="w-4 h-4 text-indigo-300" />
                                        Passcode
                                    </div>
                                    {hasPasscode && (
                                        <button type="button" onClick={() => setPasscode(null)} className="text-xs text-rose-300">
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPasscodeModalOpen(true)}
                                    className="w-full py-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 rounded-lg text-sm border border-indigo-500/20"
                                >
                                    {hasPasscode ? 'Change passcode' : 'Set passcode'}
                                </button>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                    <Percent className="w-3.5 h-3.5" />
                                    Basic % of gross
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={settings.basicPercentOfGross}
                                    onChange={(e) => updateSettings({ basicPercentOfGross: Number(e.target.value) })}
                                    className={fieldClass}
                                />
                            </div>
                        </div>

                        <div className="space-y-3 pt-8 pb-8">
                            <h4 className="text-sm text-slate-400">Backup</h4>
                            <button type="button" onClick={downloadBackup} className="w-full flex items-center justify-between px-4 py-3 bg-slate-950 text-slate-200 rounded-xl border border-white/10 hover:border-indigo-400/40 text-sm">
                                <span className="inline-flex items-center gap-2"><Download className="w-4 h-4 text-indigo-300" /> Export</span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between px-4 py-3 bg-slate-950 text-slate-200 rounded-xl border border-white/10 hover:border-indigo-400/40 text-sm">
                                <span className="inline-flex items-center gap-2"><Upload className="w-4 h-4 text-indigo-300" /> Restore</span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json" />
                            <button type="button" onClick={handleClear} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/10 text-rose-300 rounded-xl border border-rose-500/20 text-sm">
                                <Trash2 className="w-4 h-4" />
                                Clear all data
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-8 min-h-0 bg-slate-950">
                        <div className="h-full overflow-y-auto p-6">
                            <HolidayManager />
                        </div>
                    </div>
                </div>

                <div className="p-4 px-6 border-t border-white/10 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>

            <PasscodeModal
                isOpen={isPasscodeModalOpen}
                onClose={() => setIsPasscodeModalOpen(false)}
                onSuccess={(code) => {
                    setPasscode(code);
                    setIsPasscodeModalOpen(false);
                    showSuccess('Passcode updated');
                }}
                isSettingMode={true}
            />
        </div>
    );
};
