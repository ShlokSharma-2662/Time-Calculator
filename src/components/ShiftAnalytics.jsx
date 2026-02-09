import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Clock, Coffee, Calendar, Target,
    ChevronDown, ChevronUp, BarChart3, Award, Zap,
    Save, Activity, Gauge, PieChart, Download, Clipboard, Lightbulb
} from 'lucide-react';
import {
    getQuickStats,
    getWeeklySummary,
    saveShift,
    getHoursTrend,
    analyzeBreakPatterns,
    getPunctualityScore,
    getMonthlyComparison,
    calculateConsistencyRating,
    getRecommendations,
    checkGoalProgress,
    exportToCSV,
    getStatsForClipboard
} from '../utils/shiftHistory';

export function ShiftAnalytics({ currentShift }) {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [weeklySummary, setWeeklySummary] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [breakPatterns, setBreakPatterns] = useState(null);
    const [punctualityScore, setPunctualityScore] = useState(100);
    const [monthlyComp, setMonthlyComp] = useState(null);
    const [consistencyRating, setConsistencyRating] = useState(100);
    const [recommendations, setRecommendations] = useState([]);
    const [goalProgress, setGoalProgress] = useState(null);

    // Load stats
    useEffect(() => {
        refreshStats();
    }, []);

    const refreshStats = () => {
        setStats(getQuickStats());
        setWeeklySummary(getWeeklySummary());
        setTrendData(getHoursTrend(14)); // Last 14 days
        setBreakPatterns(analyzeBreakPatterns());
        setPunctualityScore(getPunctualityScore());
        setMonthlyComp(getMonthlyComparison());
        setConsistencyRating(calculateConsistencyRating());
        setRecommendations(getRecommendations());
        setGoalProgress(checkGoalProgress());
    };

    // Save current shift
    const handleSaveShift = () => {
        if (currentShift && currentShift.startTime) {
            saveShift(currentShift);
            refreshStats();
            alert('Shift saved! ✅');
        }
    };

    if (!stats) return null;

    const weeklyGoal = 45;
    const weeklyProgress = weeklySummary ? (weeklySummary.totalHours / weeklyGoal) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-xl border border-blue-200 dark:border-slate-700 overflow-hidden"
        >
            {/* Header */}
            <div
                className="p-6 cursor-pointer flex items-center justify-between"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-xl">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            Shift Analytics
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Track patterns, trends & insights
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
                        <div className="px-6 pb-6 space-y-6">
                            {/* Tabs */}
                            <div className="flex gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl">
                                <TabButton
                                    active={activeTab === 'overview'}
                                    onClick={() => setActiveTab('overview')}
                                    icon={<Activity className="w-4 h-4" />}
                                    label="Overview"
                                />
                                <TabButton
                                    active={activeTab === 'trends'}
                                    onClick={() => setActiveTab('trends')}
                                    icon={<TrendingUp className="w-4 h-4" />}
                                    label="Trends"
                                />
                                <TabButton
                                    active={activeTab === 'patterns'}
                                    onClick={() => setActiveTab('patterns')}
                                    icon={<PieChart className="w-4 h-4" />}
                                    label="Patterns"
                                />
                                <TabButton
                                    active={activeTab === 'goals'}
                                    onClick={() => setActiveTab('goals')}
                                    icon={<Target className="w-4 h-4" />}
                                    label="Goals"
                                />
                            </div>

                            {/* Tab Content */}
                            <AnimatePresence>
                                {activeTab === 'overview' && (
                                    <OverviewTab
                                        stats={stats}
                                        weeklySummary={weeklySummary}
                                        weeklyGoal={weeklyGoal}
                                        weeklyProgress={weeklyProgress}
                                        currentShift={currentShift}
                                        onSaveShift={handleSaveShift}
                                    />
                                )}

                                {activeTab === 'trends' && (
                                    <TrendsTab
                                        trendData={trendData}
                                        monthlyComp={monthlyComp}
                                    />
                                )}

                                {activeTab === 'patterns' && (
                                    <PatternsTab
                                        breakPatterns={breakPatterns}
                                        punctualityScore={punctualityScore}
                                        consistencyRating={consistencyRating}
                                    />
                                )}

                                {activeTab === 'goals' && (
                                    <GoalsTab
                                        goalProgress={goalProgress}
                                        recommendations={recommendations}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Tab Button Component
function TabButton({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${active
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

// Overview Tab
function OverviewTab({ stats, weeklySummary, weeklyGoal, weeklyProgress, currentShift, onSaveShift }) {
    return (
        <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
        >
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Clock className="w-4 h-4 text-blue-500" />} label="Avg Start" value={stats.avgStartTime || '--:--'} color="blue" delay={0.1} />
                <StatCard icon={<Zap className="w-4 h-4 text-green-500" />} label="Avg Hours" value={`${stats.avgHours}h`} color="green" delay={0.2} />
                <StatCard icon={<Target className="w-4 h-4 text-purple-500" />} label="Attendance" value={`${stats.attendanceRate}%`} color="purple" delay={0.3} />
                <StatCard icon={<Coffee className="w-4 h-4 text-orange-500" />} label="Avg Break" value={`${stats.avgBreak}m`} color="orange" delay={0.4} />
            </div>

            {/* Weekly Summary */}
            {weeklySummary && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600"
                >
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        This Week
                    </h3>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                            {weeklySummary.totalHours}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            hours • {weeklySummary.daysWorked} days
                        </span>
                    </div>
                    <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(weeklyProgress, 100)}%` }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                            className="absolute h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                        />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {weeklySummary.totalHours} / {weeklyGoal} hours goal ({Math.round(weeklyProgress)}%)
                    </p>
                </motion.div>
            )}

            {/* Current Streak */}
            {stats.currentStreak > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4"
                >
                    <div className="flex items-center gap-3">
                        <Award className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                        <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Current Streak
                            </p>
                            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                                🔥 {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Save Shift Button */}
            {currentShift && currentShift.startTime && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    onClick={onSaveShift}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <Save className="w-5 h-5" />
                    Save Current Shift
                </motion.button>
            )}

            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                📊 {stats.totalShifts} total {stats.totalShifts === 1 ? 'shift' : 'shifts'} recorded
            </div>
        </motion.div>
    );
}

// Trends Tab
function TrendsTab({ trendData, monthlyComp }) {
    const maxHours = trendData.length > 0 ? Math.max(...trendData.map(d => d.hours)) : 10;
    const chartHeight = 150;
    const chartWidth = 500;

    return (
        <motion.div
            key="trends"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
        >
            {/* Hours Trend Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Hours Trend (Last 14 Days)
                </h3>
                {trendData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <svg className="w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                            {/* Grid lines */}
                            {[0, 1, 2, 3, 4].map(i => (
                                <line
                                    key={i}
                                    x1="0"
                                    y1={(chartHeight / 4) * i}
                                    x2={chartWidth}
                                    y2={(chartHeight / 4) * i}
                                    stroke="currentColor"
                                    strokeWidth="0.5"
                                    className="text-slate-200 dark:text-slate-700"
                                />
                            ))}
                            {/* Line path */}
                            <path
                                d={trendData.map((d, i) => {
                                    const x = (i / (trendData.length - 1 || 1)) * chartWidth;
                                    const y = chartHeight - (d.hours / maxHours) * chartHeight;
                                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }).join(' ')}
                                fill="none"
                                stroke="url(#lineGradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                            {/* Data points */}
                            {trendData.map((d, i) => {
                                const x = (i / (trendData.length - 1 || 1)) * chartWidth;
                                const y = chartHeight - (d.hours / maxHours) * chartHeight;
                                return (
                                    <circle
                                        key={i}
                                        cx={x}
                                        cy={y}
                                        r="4"
                                        fill="#3b82f6"
                                        className="dark:fill-cyan-400"
                                    />
                                );
                            })}
                        </svg>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 py-8">No trend data yet</p>
                )}
            </div>

            {/* Monthly Comparison */}
            {monthlyComp && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Monthly Comparison</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-500 mb-1">This Month</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{monthlyComp.thisMonth.totalHours}h</p>
                            <p className="text-xs text-slate-500">{monthlyComp.thisMonth.daysWorked} days</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Last Month</p>
                            <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{monthlyComp.lastMonth.totalHours}h</p>
                            <p className="text-xs text-slate-500">{monthlyComp.lastMonth.daysWorked} days</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Change: <span className={`font-semibold ${monthlyComp.change.hours >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {monthlyComp.change.hours >= 0 ? '+' : ''}{monthlyComp.change.hours}h ({monthlyComp.change.percentage >= 0 ? '+' : ''}{monthlyComp.change.percentage}%)
                            </span>
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// Patterns Tab
function PatternsTab({ breakPatterns, punctualityScore, consistencyRating }) {
    return (
        <motion.div
            key="patterns"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
        >
            {/* Punctuality & Consistency */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium text-slate-500">Punctuality</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{punctualityScore}%</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium text-slate-500">Consistency</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{consistencyRating}%</p>
                </div>
            </div>

            {/* Break Analysis */}
            {breakPatterns && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Coffee className="w-5 h-5 text-orange-500" />
                        Break Analysis
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <p className="text-xs text-slate-500">Average</p>
                            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{breakPatterns.avgBreak}m</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Min</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">{breakPatterns.minBreak}m</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Max</p>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">{breakPatterns.maxBreak}m</p>
                        </div>
                    </div>
                    {breakPatterns.distribution.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Distribution:</p>
                            {breakPatterns.distribution.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 w-20">{item.range}</span>
                                    <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-500 rounded-full"
                                            style={{ width: `${item.count * 20}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-8">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, color, delay }) {
    const colors = {
        blue: 'text-blue-600 dark:text-blue-400',
        green: 'text-green-600 dark:text-green-400',
        purple: 'text-purple-600 dark:text-purple-400',
        orange: 'text-orange-600 dark:text-orange-400'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600"
        >
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
        </motion.div>
    );
}

// Goals Tab
function GoalsTab({ goalProgress, recommendations }) {
    const handleExportCSV = () => {
        const csv = exportToCSV();
        if (csv) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shift_analytics_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            alert('Exported to CSV! 📥');
        } else {
            alert('No data to export');
        }
    };

    const handleCopyStats = () => {
        const stats = getStatsForClipboard();
        navigator.clipboard.writeText(stats);
        alert('Copied to clipboard! 📋');
    };

    return (
        <motion.div
            key="goals"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
        >
            {/* Export Buttons */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={handleExportCSV}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <Download className="w-5 h-5" />
                    Export CSV
                </button>
                <button
                    onClick={handleCopyStats}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold hover:from-purple-600 hover:to-violet-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <Clipboard className="w-5 h-5" />
                    Copy Stats
                </button>
            </div>

            {/* Goal Progress */}
            {goalProgress && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-500" />
                        Your Goals
                    </h3>

                    {/* Weekly Hours Goal */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Weekly Hours
                            </span>
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {goalProgress.weeklyHours.current} / {goalProgress.weeklyHours.target}h
                            </span>
                        </div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all"
                                style={{ width: `${Math.min(goalProgress.weeklyHours.progress, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {Math.round(goalProgress.weeklyHours.progress)}% complete
                        </p>
                    </div>

                    {/* Punctuality Goal */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Punctuality (Target: 90%)
                            </span>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                {goalProgress.punctuality.current}%
                            </span>
                        </div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${goalProgress.punctuality.status === 'achieved'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                        : 'bg-gradient-to-r from-yellow-500 to-orange-600'
                                    }`}
                                style={{ width: `${Math.min(goalProgress.punctuality.progress, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {goalProgress.punctuality.status === 'achieved' ? '✅ Goal achieved!' : '📈 Keep improving'}
                        </p>
                    </div>

                    {/* Break Time Goal */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Break Time (Max: {goalProgress.breakTime.target}m)
                            </span>
                            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                {goalProgress.breakTime.current}m
                            </span>
                        </div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${goalProgress.breakTime.status === 'achieved'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                        : 'bg-gradient-to-r from-red-500 to-rose-600'
                                    }`}
                                style={{ width: `${Math.min(Math.abs(goalProgress.breakTime.progress), 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {goalProgress.breakTime.status === 'achieved' ? '✅ Within budget!' : '⚠️ Exceeding target'}
                        </p>
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        Smart Recommendations
                    </h3>
                    <div className="space-y-3">
                        {recommendations.map((rec, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded-lg border-l-4 ${rec.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-500' :
                                        rec.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                                            rec.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' :
                                                'bg-slate-50 dark:bg-slate-900/20 border-slate-500'
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-2xl">{rec.icon}</span>
                                    <div>
                                        <h4 className="font-semibold text-sm text-slate-800 dark:text-white">
                                            {rec.title}
                                        </h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                            {rec.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(!recommendations || recommendations.length === 0) && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-600 text-center">
                    <p className="text-slate-500 dark:text-slate-400">
                        🎯 No recommendations yet. Keep logging shifts to get insights!
                    </p>
                </div>
            )}
        </motion.div>
    );
}
