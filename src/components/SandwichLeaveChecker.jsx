import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sandwich, Calendar, AlertTriangle, CheckCircle2, XCircle, Eye, EyeOff, Save } from 'lucide-react';
import { evaluateSandwichLeave, formatDateDisplay, getDateTypeLabel, COMPANY_HOLIDAYS } from '../utils/sandwichLeaveLogic';
import { LeaveCalendar } from './LeaveCalendar';
import { addLeaveToHistory } from '../utils/leaveHistory';

export function SandwichLeaveChecker({ onLeaveChange }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [leaveType, setLeaveType] = useState('EL');
    const [result, setResult] = useState(null);
    const [showCalendar, setShowCalendar] = useState(true);

    // Calculate sandwich leave when inputs change
    useEffect(() => {
        if (startDate && endDate) {
            const evaluation = evaluateSandwichLeave(startDate, endDate, leaveType, COMPANY_HOLIDAYS);
            setResult(evaluation);

            // Notify parent component of leave selection
            if (onLeaveChange) {
                onLeaveChange({ startDate, endDate, leaveType });
            }
        } else {
            setResult(null);
            if (onLeaveChange) {
                onLeaveChange(null);
            }
        }
    }, [startDate, endDate, leaveType, onLeaveChange]);

    // Save leave to history
    const saveToHistory = () => {
        if (result && result.success && startDate && endDate) {
            addLeaveToHistory({
                startDate,
                endDate,
                type: leaveType,
                days: result.totalLeaveDays,
                sandwiched: result.isSandwich
            });
            alert('Leave saved to history! ✅');
        }
    };

    // Get today's date in YYYY-MM-DD format for min date
    const today = new Date().toISOString().split('T')[0];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-700"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-3 rounded-xl">
                        <Sandwich className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            Sandwich Leave Checker
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Check if weekends/holidays will be counted as leave
                        </p>
                    </div>
                </div>

                {/* Save to History Button */}
                {result && result.success && (
                    <button
                        onClick={saveToHistory}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-sm font-medium"
                    >
                        <Save className="w-4 h-4" />
                        Save to History
                    </button>
                )}
            </div>

            {/* Input Fields */}
            <div className="space-y-4 mb-6">
                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start Date */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <Calendar className="w-4 h-4" />
                            Leave Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <Calendar className="w-4 h-4" />
                            Leave End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || today}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Leave Type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Leave Type
                    </label>
                    <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all cursor-pointer"
                    >
                        <option value="EL">Earned Leave (EL)</option>
                        <option value="Marriage Leave">Marriage Leave</option>
                        <option value="Comp-Off">Comp-Off</option>
                        <option value="LWP">Leave Without Pay (LWP)</option>
                    </select>
                </div>
            </div>

            {/* Results */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    {result.success ? (
                        <div className="space-y-4">
                            {/* Main Result Card */}
                            <div className={`rounded-xl p-6 border-2 ${result.isSandwich
                                ? 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-400 dark:border-orange-600'
                                : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-400 dark:border-green-600'
                                }`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            {result.isSandwich ? (
                                                <XCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                                            ) : (
                                                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                                            )}
                                            <h3 className={`text-xl font-bold ${result.isSandwich
                                                ? 'text-orange-700 dark:text-orange-300'
                                                : 'text-green-700 dark:text-green-300'
                                                }`}>
                                                {result.isSandwich ? 'Sandwich Leave: YES' : 'Sandwich Leave: NO'}
                                            </h3>
                                        </div>
                                        <p className={`text-sm ${result.isSandwich
                                            ? 'text-orange-600 dark:text-orange-400'
                                            : 'text-green-600 dark:text-green-400'
                                            }`}>
                                            {result.reason}
                                        </p>
                                    </div>
                                </div>

                                {/* Statistics */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3">
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Leave Days</p>
                                        <p className="text-2xl font-bold text-slate-800 dark:text-white">
                                            {result.totalLeaveDays}
                                        </p>
                                    </div>
                                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3">
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Working Days</p>
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {result.workingDays}
                                        </p>
                                    </div>
                                    {result.isSandwich && (
                                        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3">
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Extra Days Counted</p>
                                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                                {result.extraDays}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sandwich Dates Details */}
                            {result.isSandwich && result.sandwichDates.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                        Dates Counted as Leave:
                                    </h4>
                                    <div className="space-y-2">
                                        {result.sandwichDates.map((date, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="bg-white dark:bg-slate-800 rounded-lg px-4 py-2 border border-orange-200 dark:border-orange-800 flex items-center justify-between"
                                            >
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {formatDateDisplay(date)}
                                                </span>
                                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                                                    {getDateTypeLabel(date, COMPANY_HOLIDAYS)}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Impact Warning */}
                            {result.isSandwich && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-orange-800 dark:text-orange-300 mb-1">
                                            Impact on Leave Balance
                                        </p>
                                        <p className="text-sm text-orange-700 dark:text-orange-400">
                                            This leave will consume <strong>{result.totalLeaveDays} days</strong> from your {leaveType} balance,
                                            including {result.extraDays} non-working day{result.extraDays > 1 ? 's' : ''}.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Error Display
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-red-700 dark:text-red-300 mb-1">
                                        Invalid Input
                                    </p>
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {result.error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Help Text */}
            {!result && (
                <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-4 mt-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>Sandwich Leave Rule:</strong> If weekends or company holidays fall between your leave dates,
                        or if you take leave immediately before and after a weekend/holiday, those non-working days will be counted as leave.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                        Exception: Single working day leave is not subject to sandwich rule.
                    </p>
                </div>
            )}

            {/* Calendar View Section */}
            {startDate && endDate && (
                <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                            Visual Calendar
                        </h3>
                        <button
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors text-sm font-medium"
                        >
                            {showCalendar ? (
                                <>
                                    <EyeOff className="w-4 h-4" />
                                    Hide Calendar
                                </>
                            ) : (
                                <>
                                    <Eye className="w-4 h-4" />
                                    Show Calendar
                                </>
                            )}
                        </button>
                    </div>

                    {showCalendar && (
                        <LeaveCalendar
                            startDate={startDate}
                            endDate={endDate}
                            sandwichResult={result}
                        />
                    )}
                </div>
            )}
        </motion.div>
    );
}
