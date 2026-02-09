import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Lightbulb, Calendar, AlertTriangle,
    ChevronDown, ChevronUp, BarChart3, Target, Sparkles
} from 'lucide-react';
import {
    calculateSandwichRisk,
    suggestAlternativeDates,
    getUpcomingLongWeekends,
    getRiskLevel
} from '../utils/leaveOptimization';
import {
    getLeaveHistory,
    analyzeMonthlyPatterns,
    getInsights
} from '../utils/leaveHistory';

export function SmartAnalytics({ currentLeave }) {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('insights');

    // Get history and patterns
    const history = getLeaveHistory();
    const monthlyPatterns = analyzeMonthlyPatterns();
    const insights = getInsights();
    const upcomingOpportunities = getUpcomingLongWeekends();

    // Calculate suggestions for current leave selection
    const currentSuggestions = useMemo(() => {
        if (!currentLeave?.startDate || !currentLeave?.endDate) return null;

        const risk = calculateSandwichRisk(currentLeave.startDate, currentLeave.endDate);
        const alternatives = suggestAlternativeDates(currentLeave.startDate, currentLeave.endDate);
        const riskInfo = getRiskLevel(risk);

        return {
            risk,
            riskInfo,
            alternatives: alternatives.slice(0, 3) // Top 3
        };
    }, [currentLeave]);

    // Calculate max value for chart scaling
    const maxDays = Math.max(...monthlyPatterns.map(m => m.days), 1);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-xl border border-indigo-200 dark:border-slate-700 overflow-hidden"
        >
            {/* Header */}
            <div
                className="p-6 cursor-pointer flex items-center justify-between"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            Smart Analytics
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            AI-powered leave insights & recommendations
                        </p>
                    </div>
                </div>

                <button className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700 transition-colors">
                    {expanded ? (
                        <ChevronUp className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    ) : (
                        <ChevronDown className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    )}
                </button>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="px-6 pb-6">
                            {/* Tabs */}
                            <div className="flex gap-2 mb-6 bg-white dark:bg-slate-800 p-1.5 rounded-xl">
                                <button
                                    onClick={() => setActiveTab('insights')}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'insights'
                                        ? 'bg-indigo-500 text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <Lightbulb className="w-4 h-4 inline mr-2" />
                                    Insights
                                </button>
                                <button
                                    onClick={() => setActiveTab('opportunities')}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'opportunities'
                                        ? 'bg-indigo-500 text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <Target className="w-4 h-4 inline mr-2" />
                                    Opportunities
                                </button>
                                <button
                                    onClick={() => setActiveTab('trends')}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'trends'
                                        ? 'bg-indigo-500 text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <BarChart3 className="w-4 h-4 inline mr-2" />
                                    Trends
                                </button>
                            </div>

                            {/* Tab Content */}
                            <AnimatePresence>
                                {activeTab === 'insights' && (
                                    <motion.div
                                        key="insights"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-4"
                                    >
                                        {/* Current Leave Risk */}
                                        {currentSuggestions && (
                                            <div className={`rounded-xl p-4 border-2 ${currentSuggestions.riskInfo.color === 'green'
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-400'
                                                : currentSuggestions.riskInfo.color === 'orange'
                                                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400'
                                                    : 'bg-red-50 dark:bg-red-900/20 border-red-400'
                                                }`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
                                                            Current Selection Risk
                                                        </h3>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                                            Sandwich risk: <strong>{currentSuggestions.riskInfo.level}</strong> ({currentSuggestions.risk}%)
                                                        </p>
                                                    </div>
                                                    <div className={`text-3xl font-bold ${currentSuggestions.riskInfo.color === 'green' ? 'text-green-600' :
                                                        currentSuggestions.riskInfo.color === 'orange' ? 'text-orange-600' :
                                                            'text-red-600'
                                                        }`}>
                                                        {currentSuggestions.risk}%
                                                    </div>
                                                </div>

                                                {/* Alternative Suggestions */}
                                                {currentSuggestions.alternatives.length > 0 && currentSuggestions.risk > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                                            💡 Better Alternatives:
                                                        </p>
                                                        <div className="space-y-2">
                                                            {currentSuggestions.alternatives.map((alt, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="bg-white dark:bg-slate-800 rounded-lg p-2 text-sm flex items-center justify-between"
                                                                >
                                                                    <div>
                                                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                                                            {new Date(alt.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                                            {' - '}
                                                                            {new Date(alt.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                                        </span>
                                                                        <span className="text-xs text-slate-500 ml-2">({alt.shift})</span>
                                                                    </div>
                                                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${alt.risk === 0 ? 'bg-green-100 text-green-700' :
                                                                        alt.risk < 30 ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-orange-100 text-orange-700'
                                                                        }`}>
                                                                        {alt.risk}% risk
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* General Insights */}
                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                                <Lightbulb className="w-5 h-5 text-yellow-500" />
                                                Your Insights
                                            </h3>
                                            {insights.map((insight, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.1 }}
                                                    className={`rounded-lg p-3 flex items-start gap-3 ${insight.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' :
                                                        insight.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200' :
                                                            'bg-blue-50 dark:bg-blue-900/20 border border-blue-200'
                                                        }`}
                                                >
                                                    <span className="text-2xl">{insight.icon}</span>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                                                        {insight.message}
                                                    </p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'opportunities' && (
                                    <motion.div
                                        key="opportunities"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-4"
                                    >
                                        <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                            <Target className="w-5 h-5 text-indigo-500" />
                                            Upcoming Opportunities (Next 3 Months)
                                        </h3>

                                        {upcomingOpportunities.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No special opportunities found in the next 3 months</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {upcomingOpportunities.map((opp, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <h4 className="font-semibold text-slate-800 dark:text-white">
                                                                    {opp.holiday}
                                                                </h4>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                    {new Date(opp.date).toLocaleDateString('en-IN', {
                                                                        weekday: 'long',
                                                                        month: 'long',
                                                                        day: 'numeric'
                                                                    })}
                                                                </p>
                                                            </div>
                                                            {opp.efficiency !== Infinity && (
                                                                <div className="bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                                                                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                                                        {opp.efficiency}x
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                                                            {opp.suggestion}
                                                        </p>
                                                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                            <span>💼 {opp.leaveDaysNeeded} day{opp.leaveDaysNeeded !== 1 ? 's' : ''} leave</span>
                                                            <span>🎉 {opp.totalDaysOff} days off total</span>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'trends' && (
                                    <motion.div
                                        key="trends"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-4"
                                    >
                                        <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-purple-500" />
                                            Leave Trends by Month
                                        </h3>

                                        {history.leaves.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No leave history yet</p>
                                                <p className="text-xs mt-1">Plan your first leave to see trends!</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Stats Cards */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Total Leaves</p>
                                                        <p className="text-2xl font-bold text-slate-800 dark:text-white">
                                                            {history.stats.totalLeavesTaken}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Avg/Month</p>
                                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                            {history.stats.averagePerMonth}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Favorite Month</p>
                                                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                            {history.stats.favoriteMonth || '-'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Sandwich Rate</p>
                                                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                                            {history.stats.sandwichRate}%
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Bar Chart */}
                                                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                                                    <div className="space-y-2">
                                                        {monthlyPatterns.map((month, idx) => (
                                                            <div key={idx} className="flex items-center gap-3">
                                                                <div className="w-12 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                                    {month.shortName}
                                                                </div>
                                                                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${(month.days / maxDays) * 100}%` }}
                                                                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                                                                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full flex items-center justify-end pr-2"
                                                                    >
                                                                        {month.days > 0 && (
                                                                            <span className="text-xs font-semibold text-white">
                                                                                {month.days}
                                                                            </span>
                                                                        )}
                                                                    </motion.div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
