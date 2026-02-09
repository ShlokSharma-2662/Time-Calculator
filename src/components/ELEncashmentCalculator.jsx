import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, AlertCircle, CheckCircle2, IndianRupee, Save, History, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateELEncashment } from '../utils/elCalculations';
import { useLeaveBalance } from '../hooks/useLeaveBalance';

export function ELEncashmentCalculator() {
    const [openingBalance, setOpeningBalance] = useState('');
    const [earnedEL, setEarnedEL] = useState('');
    const [availedEL, setAvailedEL] = useState('');
    const [maxCarryForward, setMaxCarryForward] = useState('300');
    const [result, setResult] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [saved, setSaved] = useState(false);

    // Use leave balance hook
    const { current, history, saveBalance, loadFromHistory, deleteHistoryEntry } = useLeaveBalance();

    // Load last saved balance on mount
    useEffect(() => {
        if (current && !openingBalance && !earnedEL && !availedEL) {
            setOpeningBalance(String(current.opening || ''));
            setEarnedEL(String(current.earned || ''));
            setAvailedEL(String(current.availed || ''));
            if (current.maxCarryForward) {
                setMaxCarryForward(String(current.maxCarryForward));
            }
        }
    }, []);

    const handleCalculate = () => {
        const calculation = calculateELEncashment(
            Number(openingBalance),
            Number(earnedEL),
            Number(availedEL),
            Number(maxCarryForward)
        );
        setResult(calculation);
    };

    // Auto-calculate when inputs change
    React.useEffect(() => {
        if (openingBalance && earnedEL && availedEL && maxCarryForward) {
            handleCalculate();
        } else {
            setResult(null);
        }
    }, [openingBalance, earnedEL, availedEL, maxCarryForward]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-700"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl">
                        <Calculator className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            EL Encashment Calculator
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Financial Year 2025-26
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (openingBalance && earnedEL && availedEL) {
                                saveBalance({
                                    opening: Number(openingBalance),
                                    earned: Number(earnedEL),
                                    availed: Number(availedEL),
                                    maxCarryForward: Number(maxCarryForward)
                                });
                                setSaved(true);
                                setTimeout(() => setSaved(false), 2000);
                            }
                        }}
                        disabled={!openingBalance || !earnedEL || !availedEL}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {saved ? 'Saved!' : 'Save'}
                    </button>
                    {history.length > 0 && (
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                        >
                            <History className="w-4 h-4" />
                            History
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setOpeningBalance('');
                            setEarnedEL('');
                            setAvailedEL('');
                            setMaxCarryForward('300');
                            setResult(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Balance History */}
            <AnimatePresence>
                {showHistory && history.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-4 overflow-hidden"
                    >
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Saved Balance History
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {history.map((entry, index) => (
                                <motion.div
                                    key={entry.timestamp}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600 flex items-center justify-between group hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {new Date(entry.date).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Opening: {entry.opening} | Earned: {entry.earned} | Availed: {entry.availed}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setOpeningBalance(String(entry.opening));
                                            setEarnedEL(String(entry.earned));
                                            setAvailedEL(String(entry.availed));
                                            if (entry.maxCarryForward) {
                                                setMaxCarryForward(String(entry.maxCarryForward));
                                            }
                                            setShowHistory(false);
                                        }}
                                        className="px-3 py-1.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        Load
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Opening Balance */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Opening Balance (as of Apr 1, 2025)
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                        placeholder="e.g., 280"
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                {/* Earned EL */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Earned EL (FY 2025-26)
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={earnedEL}
                        onChange={(e) => setEarnedEL(e.target.value)}
                        placeholder="e.g., 30"
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                {/* Availed EL */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Availed EL (FY 2025-26)
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={availedEL}
                        onChange={(e) => setAvailedEL(e.target.value)}
                        placeholder="e.g., 10"
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                {/* Max Carry Forward */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Max Carry Forward Limit
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={maxCarryForward}
                        onChange={(e) => setMaxCarryForward(e.target.value)}
                        placeholder="e.g., 300"
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
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
                            {/* Closing Balance */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-blue-200 dark:border-slate-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            Closing Balance (Mar 31, 2026)
                                        </p>
                                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                                            {result.closingBalance} days
                                        </p>
                                    </div>
                                    <CheckCircle2 className="w-8 h-8 text-blue-500" />
                                </div>
                            </div>

                            {/* Result Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Encashable EL */}
                                <div className={`rounded-xl p-4 border ${result.encashableEL > 0
                                    ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-700'
                                    : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                                    }`}>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        Encashable EL
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <p className={`text-2xl font-bold ${result.encashableEL > 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                            {result.encashableEL}
                                        </p>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">days</span>
                                    </div>
                                    {result.encashableEL > 0 && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                                            <IndianRupee className="w-3 h-3" />
                                            Eligible for encashment
                                        </p>
                                    )}
                                </div>

                                {/* Carry Forward */}
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        Carry Forward to FY 2026-27
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                                            {result.carryForward}
                                        </p>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">days</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                        Max allowed: {result.maxCarryForward} days
                                    </p>
                                </div>
                            </div>

                            {/* Info Message */}
                            {result.encashableEL === 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Your closing balance is within the carry forward limit. No EL is available for encashment.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Error Display
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-red-700 dark:text-red-300 mb-2">
                                        Validation Errors:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-400">
                                        {result.errors.map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                        ))}
                                    </ul>
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
                        <strong>How it works:</strong> Enter your EL details to calculate how many days you can encash.
                        EL exceeding the maximum carry forward limit becomes eligible for encashment.
                    </p>
                </div>
            )}
        </motion.div>
    );
}
