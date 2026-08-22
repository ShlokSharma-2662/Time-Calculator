import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Clock, Coffee, Calendar, Target,
    ChevronDown, ChevronUp, BarChart3, Award, Zap,
    Save, Activity, Gauge, PieChart, Download, Clipboard, Lightbulb
} from 'lucide-react';
import { WorkHeatmap } from './WorkHeatmap';
import {
    getQuickStats,
    getWeeklySummary,
    getMonthlySummary,
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
import { useUI } from '../context/UIContext';
import { getHolidayName } from '../utils/sandwichLeaveLogic';

export function ShiftAnalytics({ currentShift, history, onSaveShift }) {
    const { showSuccess, showInfo } = useUI();
    const [expanded, setExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [analyticsData, setAnalyticsData] = useState(null);

    const refreshStats = useCallback(() => {
        setAnalyticsData({
            stats: getQuickStats(history),
            weeklySummary: getWeeklySummary(history),
            monthlySummary: getMonthlySummary(history),
            trendData: getHoursTrend(history, 14),
            breakPatterns: analyzeBreakPatterns(history),
            punctualityScore: getPunctualityScore(history),
            monthlyComp: getMonthlyComparison(history),
            consistencyRating: calculateConsistencyRating(history),
            recommendations: getRecommendations(history),
            goalProgress: checkGoalProgress(history),
        });
    }, [history]);

    // Load stats
    useEffect(() => {
        refreshStats();
    }, [history, refreshStats]); // Refresh when history changes

    // Save current shift
    const handleSaveShift = () => {
        if (currentShift && currentShift.startTime) {
            if (typeof onSaveShift === 'function') {
                onSaveShift();
            }
            refreshStats();
            showSuccess('Shift saved successfully! (done)');
        }
    };

    if (!analyticsData) return null;

    const { stats, weeklySummary, monthlySummary, trendData, breakPatterns,
        punctualityScore, monthlyComp, consistencyRating, recommendations, goalProgress } = analyticsData;

    const weeklyGoal = 45;
    const weeklyProgress = weeklySummary ? (weeklySummary.totalHours / weeklyGoal) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card bg-gradient-to-br from-slate-900/85 via-slate-900/55 to-indigo-500/10 rounded-[1.5rem] shadow-[0_0_70px_rgba(99,102,241,0.12)] border border-indigo-500/25 overflow-hidden"
        >
            {/* Header */}
            <div
                className="p-6 cursor-pointer flex items-center justify-between"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-sky-500 p-3 rounded-2xl shadow-lg shadow-indigo-500/25">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            Analytics
                        </h2>
                        <p className="text-sm text-slate-400">
                            Patterns, trends, and insights
                        </p>
                    </div>
                </div>

                <button className="p-2 rounded-lg hover:bg-indigo-500/20 transition-colors text-indigo-200">
                    {expanded ? (
                        <ChevronUp className="w-6 h-6" />
                    ) : (
                        <ChevronDown className="w-6 h-6" />
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
                            <div className="flex gap-2 bg-slate-900/45 border border-indigo-500/20 p-1.5 rounded-2xl">
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
                                        monthlySummary={monthlySummary}
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
                                        history={history}
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
                                        showSuccess={showSuccess}
                                        showInfo={showInfo}
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

function TabButton({ active, onClick, icon, label }) {
    return (
            <button
                onClick={onClick}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group ${active
                ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                : 'text-slate-400 hover:bg-slate-900/60'
                }`}
            >
                <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-300'} transition-colors`}>
                    {icon}
                </span>
                {label}
            </button>
    );
}

// Overview Tab
function OverviewTab({ stats, weeklySummary, monthlySummary, weeklyGoal: _weeklyGoal, weeklyProgress: _weeklyProgress, currentShift, onSaveShift }) {
    return (
        <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
        >
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<Clock className="w-5 h-5 text-indigo-300" />}
                    label="Avg Start"
                    value={stats.avgStartTime || '--:--'}
                    color="blue"
                    delay={0.1}
                />
                <StatCard
                    icon={<Zap className="w-5 h-5 text-emerald-300" />}
                    label="Avg Hours"
                    value={`${stats.avgHours}h`}
                    color="green"
                    delay={0.2}
                />
                <StatCard
                    icon={<Target className="w-5 h-5 text-violet-300" />}
                    label="Attendance"
                    value={`${stats.attendanceRate}%`}
                    color="purple"
                    delay={0.3}
                />
                <StatCard
                    icon={<Coffee className="w-5 h-5 text-orange-300" />}
                    label="Avg Break"
                    value={`${stats.avgBreak}m`}
                    color="orange"
                    delay={0.4}
                />
            </div>

            {/* Weekly Summary & Streak Section */}
            <div className="space-y-6">
                {/* Weekly Summary */}
                {weeklySummary && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        {/* This Week Card */}
                <div className="bg-slate-950/35 border border-indigo-400/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                </div>
                                <h4 className="font-black text-sm text-white uppercase tracking-widest">This Week</h4>
                            </div>
                            <div className="flex items-end gap-3 mb-6">
                                <div className="text-5xl font-black text-white leading-none tracking-tighter tabular-nums">
                                    {Math.floor(weeklySummary?.totalHours || 0)}
                                </div>
                                <div className="flex flex-col mb-1">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">hours worked</div>
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                                        {weeklySummary?.daysWorked || 0} days
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, ((weeklySummary?.totalHours || 0) / 45) * 100)}%` }}
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500">
                                        {Math.round(((weeklySummary?.totalHours || 0) / 45) * 100)}% of target
                                    </span>
                                    <span className="text-slate-400">Goal: 45h</span>
                                </div>
                            </div>
                        </div>

                        {/* This Month Card (NEW) */}
                <div className="bg-slate-950/35 border border-indigo-400/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-all duration-700"></div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30">
                                    <Calendar className="w-5 h-5 text-purple-400" />
                                </div>
                                <h4 className="font-black text-sm text-white uppercase tracking-widest">This Month</h4>
                            </div>
                            <div className="flex items-end gap-3 mb-6">
                                <div className="text-5xl font-black text-white leading-none tracking-tighter tabular-nums">
                                    {Math.floor(monthlySummary?.totalHours || 0)}
                                </div>
                                <div className="flex flex-col mb-1">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">hours worked</div>
                                    <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mt-1">
                                        {monthlySummary?.daysWorked || 0} days
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, ((monthlySummary?.totalHours || 0) / 180) * 100)}%` }}
                                        className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-rose-500"
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500">
                                        {Math.round(((monthlySummary?.totalHours || 0) / 180) * 100)}% of target
                                    </span>
                                    <span className="text-slate-400">Goal: 180h</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Current Streak - Now Horizontal at the end */}
                {stats.currentStreak > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-400/30 rounded-2xl p-6 flex items-center justify-between relative overflow-hidden group"
                    >
                        <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none"></div>
                        <div className="flex items-center gap-6">
                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl shadow-inner">
                                <Award className="w-10 h-10 text-amber-300 animate-pulse" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-amber-200 uppercase tracking-widest mb-1">
                                    Continuous Achievement
                                </p>
                                <p className="text-slate-300 text-sm font-medium">
                                    You've maintained an active streak of consistency!
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-5xl font-black text-amber-300 flex items-center gap-3">
                                <span className="text-3xl">🔥</span> {stats.currentStreak}
                                <span className="text-xl font-bold text-amber-200/80">
                                    {stats.currentStreak === 1 ? 'day' : 'days'}
                                </span>
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Save Current Session (if active) */}
            {currentShift && currentShift.startTime && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-950/45 border border-blue-400/20 rounded-2xl p-4 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 border border-blue-500/25 p-2 rounded-lg">
                            <Activity className="w-5 h-5 text-blue-300" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-100">Active Session Detected</p>
                            <p className="text-xs text-slate-400">Ready to save your current progress?</p>
                        </div>
                    </div>
                    <button
                        onClick={onSaveShift}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white text-sm font-black rounded-xl transition-all shadow-md hover:shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Save Now
                    </button>
                </motion.div>
            )}

            <div className="text-center text-xs font-bold text-slate-400 pt-2 uppercase tracking-widest">
                📊 {stats.totalShifts} Total Shifts Logged
            </div>
        </motion.div>
    );
}

// Trends Tab
function TrendsTab({ trendData, monthlyComp, history }) {
    const maxHours = trendData.length > 0 ? Math.max(...trendData.map(d => d.hours), 12) : 12;
    const chartHeight = 180; // Increased height for labels
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = 500;
    const effectiveWidth = chartWidth - padding.left - padding.right;
    const effectiveHeight = chartHeight - padding.top - padding.bottom;

    return (
        <motion.div
            key="trends"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
        >
            {/* Work Pattern Heatmap */}
            <WorkHeatmap history={history} />

            {/* Hours Trend Chart */}
            <div className="bg-slate-950/35 border border-indigo-400/20 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-slate-100 mb-6 flex items-center gap-3">
                        <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                            <TrendingUp className="w-5 h-5 text-blue-300" />
                        </div>
                    Hours Trend (Last 14 Days)
                </h3>
                {trendData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <svg className="w-full min-w-[500px]" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                            {/* Y-Axis Labels & Grid Lines */}
                            {[0, 4, 8, 12].map(hours => {
                                const y = padding.top + effectiveHeight - (hours / maxHours) * effectiveHeight;
                                return (
                                    <g key={hours}>
                                        <line
                                            x1={padding.left}
                                            y1={y}
                                            x2={chartWidth - padding.right}
                                            y2={y}
                                            stroke="currentColor"
                                            strokeWidth="0.5"
                                            strokeDasharray="4 4"
                                            className="text-slate-500"
                                        />
                                        <text
                                            x={padding.left - 10}
                                            y={y}
                                            textAnchor="end"
                                            alignmentBaseline="middle"
                                            className="text-[10px] font-black fill-slate-400 tabular-nums uppercase"
                                        >
                                            {hours}h
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Line path */}
                            <path
                                d={trendData.map((d, i) => {
                                    const x = padding.left + (i / (trendData.length - 1 || 1)) * effectiveWidth;
                                    const y = padding.top + effectiveHeight - (d.hours / maxHours) * effectiveHeight;
                                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }).join(' ')}
                                fill="none"
                                stroke="url(#lineGradient)"
                                strokeWidth="4"
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

                            {/* Data points & X-Axis Labels */}
                            {trendData.map((d, i) => {
                                const x = padding.left + (i / (trendData.length - 1 || 1)) * effectiveWidth;
                                const y = padding.top + effectiveHeight - (d.hours / maxHours) * effectiveHeight;
                                const date = new Date(d.date);
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                                const dayNum = date.getDate();
                                const holidayName = getHolidayName(d.date);

                                return (
                                    <g key={i} className="group cursor-help">
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r="5"
                                            fill={holidayName ? "#6366f1" : "#3b82f6"}
                                            className={`${holidayName ? 'fill-indigo-500' : 'dark:fill-cyan-400'} stroke-white dark:stroke-slate-800 stroke-2`}
                                        />
                                        {/* X-Axis Label */}
                                        <text
                                            x={x}
                                            y={chartHeight - 10}
                                            textAnchor="middle"
                                            className={`text-[9px] font-black uppercase tracking-tighter ${holidayName ? 'fill-indigo-500' : 'fill-slate-400 dark:fill-slate-500'}`}
                                        >
                                            {dayName}
                                        </text>
                                        <text
                                            x={x}
                                            y={chartHeight - 22}
                                            textAnchor="middle"
                                            className={`text-[8px] font-bold ${holidayName ? 'fill-indigo-400' : 'fill-slate-300 dark:fill-slate-600'}`}
                                        >
                                            {dayNum}
                                        </text>

                                        {/* Hover Tooltip (Basic SVG) */}
                                        <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <rect
                                                x={x - 40}
                                                y={y - 45}
                                                width="80"
                                                height={holidayName ? 35 : 25}
                                                rx="6"
                                                className="fill-slate-900 border border-white/10 shadow-2xl"
                                            />
                                            <text
                                                x={x}
                                                y={y - 32}
                                                textAnchor="middle"
                                                className="text-[10px] fill-indigo-200 font-black"
                                            >
                                                {d.hours}h Worked
                                            </text>
                                            {holidayName && (
                                                <text
                                                    x={x}
                                                    y={y - 20}
                                                    textAnchor="middle"
                                                    className="text-[8px] fill-indigo-400 font-bold"
                                                >
                                                    {holidayName}
                                                </text>
                                            )}
                                        </g>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                ) : (
                        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/20 rounded-2xl bg-slate-900/40">
                        <TrendingUp className="w-8 h-8 text-slate-500 mb-2" />
                        <p className="text-sm font-bold text-slate-400 italic">No trend data yet</p>
                    </div>
                )}
            </div>

            {/* Monthly Comparison */}
            {monthlyComp && (
                <div className="bg-slate-950/35 border border-slate-700/40 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-100 mb-4">Monthly Comparison</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-400 mb-1">This Month</p>
                            <p className="text-2xl font-bold text-blue-300">{monthlyComp.thisMonth.totalHours}h</p>
                            <p className="text-xs text-slate-400">{monthlyComp.thisMonth.daysWorked} days</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 mb-1">Last Month</p>
                            <p className="text-2xl font-bold text-slate-300">{monthlyComp.lastMonth.totalHours}h</p>
                            <p className="text-xs text-slate-400">{monthlyComp.lastMonth.daysWorked} days</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700/40">
                        <p className="text-sm text-slate-300">
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
            className="space-y-6"
        >
            {/* Punctuality & Consistency */}
            <div className="grid grid-cols-2 gap-6">
                <StatCard
                    icon={<Gauge className="w-5 h-5 text-emerald-500" />}
                    label="Punctuality"
                    value={`${punctualityScore}%`}
                    color="green"
                    delay={0.1}
                />
                <StatCard
                    icon={<Activity className="w-5 h-5 text-violet-300" />}
                    label="Consistency"
                    value={`${consistencyRating}%`}
                    color="purple"
                    delay={0.2}
                />
            </div>

            {/* Break Analysis */}
            {breakPatterns && (
            <div className="bg-slate-950/35 border border-indigo-400/20 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-slate-100 mb-6 flex items-center gap-3">
                        <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg">
                            <Coffee className="w-5 h-5 text-orange-300" />
                        </div>
                        Break Analysis
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="text-center p-3 rounded-xl bg-slate-900/30 border border-indigo-500/20">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Average</p>
                            <p className="text-2xl font-black text-orange-300">{breakPatterns.avgBreak}m</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-slate-900/30 border border-indigo-500/20">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Minimum</p>
                            <p className="text-2xl font-black text-emerald-300">{breakPatterns.minBreak}m</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-slate-900/30 border border-indigo-500/20">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Maximum</p>
                            <p className="text-2xl font-black text-rose-300">{breakPatterns.maxBreak}m</p>
                        </div>
                    </div>
                    {breakPatterns.distribution.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Frequency Distribution</p>
                            {breakPatterns.distribution.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 group">
                                    <span className="text-xs font-bold text-slate-400 w-24">{item.range}</span>
                                    <div className="flex-1 h-3 bg-slate-700/60 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(item.count / Math.max(...breakPatterns.distribution.map(d => d.count))) * 100}%` }}
                                            transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }}
                                            className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full"
                                        />
                                    </div>
                                    <span className="text-xs font-black text-slate-300 w-8 text-right">{item.count}</span>
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
    const colorMap = {
        blue: {
            bg: 'bg-indigo-500/10',
            text: 'text-indigo-300',
            border: 'border-indigo-500/25'
        },
        green: {
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-300',
            border: 'border-emerald-500/25'
        },
        purple: {
            bg: 'bg-violet-500/10',
            text: 'text-violet-300',
            border: 'border-violet-500/25'
        },
        orange: {
            bg: 'bg-orange-500/10',
            text: 'text-orange-300',
            border: 'border-orange-500/25'
        }
    };

    const style = colorMap[color] || colorMap.blue;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`p-5 rounded-2xl border ${style.border} ${style.bg} backdrop-blur-sm flex flex-col gap-3 group transition-all hover:scale-[1.02] hover:shadow-lg`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${style.border} bg-slate-900/55 shadow-sm group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-2xl font-black ${style.text} tracking-tight`}>{value}</p>
        </motion.div>
    );
}

// Goals Tab
function GoalsTab({ goalProgress, recommendations, showSuccess, showInfo }) {
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
            showSuccess('Exported to CSV successfully!');
        } else {
            showInfo('No data to export.');
        }
    };

    const handleCopyStats = () => {
        const stats = getStatsForClipboard();
        navigator.clipboard.writeText(stats);
        showSuccess('Copied to clipboard!');
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
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-400 hover:to-emerald-400 transition-all shadow-lg hover:shadow-xl shadow-green-500/20"
                >
                    <Download className="w-5 h-5" />
                    Export CSV
                </button>
                <button
                    onClick={handleCopyStats}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg hover:shadow-xl shadow-violet-500/20"
                >
                    <Clipboard className="w-5 h-5" />
                    Copy Stats
                </button>
            </div>

            {/* Goal Progress */}
            {goalProgress && (
                <div className="bg-slate-950/35 border border-indigo-500/20 rounded-xl p-4">
                        <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-500" />
                        Your Goals
                    </h3>

                    {/* Weekly Hours Goal */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-300">
                                Weekly Hours
                            </span>
                            <span className="text-sm font-bold text-indigo-300">
                                {goalProgress.weeklyHours.current} / {goalProgress.weeklyHours.target}h
                            </span>
                        </div>
                        <div className="h-3 bg-slate-700/60 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all"
                                style={{ width: `${Math.min(goalProgress.weeklyHours.progress, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {Math.round(goalProgress.weeklyHours.progress)}% complete
                        </p>
                    </div>

                    {/* Punctuality Goal */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-300">
                                Punctuality (Target: 90%)
                            </span>
                            <span className="text-sm font-bold text-emerald-300">
                                {goalProgress.punctuality.current}%
                            </span>
                        </div>
                        <div className="h-3 bg-slate-700/60 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${goalProgress.punctuality.status === 'achieved'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                    : 'bg-gradient-to-r from-yellow-500 to-orange-600'
                                    }`}
                                style={{ width: `${Math.min(goalProgress.punctuality.progress, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {goalProgress.punctuality.status === 'achieved' ? '✅ Goal achieved!' : '📈 Keep improving'}
                        </p>
                    </div>

                    {/* Break Time Goal */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-300">
                                Break Time (Max: {goalProgress.breakTime.target}m)
                            </span>
                            <span className="text-sm font-bold text-amber-300">
                                {goalProgress.breakTime.current}m
                            </span>
                        </div>
                        <div className="h-3 bg-slate-700/60 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${goalProgress.breakTime.status === 'achieved'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                    : 'bg-gradient-to-r from-red-500 to-rose-600'
                                    }`}
                                style={{ width: `${Math.min(Math.abs(goalProgress.breakTime.progress), 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {goalProgress.breakTime.status === 'achieved' ? '✅ Within budget!' : '⚠️ Exceeding target'}
                        </p>
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <div className="bg-slate-950/35 border border-indigo-500/20 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-300" />
                        Smart Recommendations
                    </h3>
                    <div className="space-y-3">
                        {recommendations.map((rec, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded-lg border-l-4 ${rec.type === 'success' ? 'bg-emerald-500/10 border-emerald-500' :
                                    rec.type === 'warning' ? 'bg-amber-500/10 border-amber-500' :
                                        rec.type === 'info' ? 'bg-blue-500/10 border-blue-500' :
                                            'bg-slate-500/10 border-slate-500'
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-2xl">{rec.icon}</span>
                                    <div>
                                        <h4 className="font-semibold text-sm text-slate-100">
                                            {rec.title}
                                        </h4>
                                        <p className="text-xs text-slate-300 mt-1">
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
                <div className="bg-slate-950/35 border border-indigo-500/20 rounded-xl p-8 text-center">
                    <p className="text-slate-300">
                        🎯 No recommendations yet. Keep logging shifts to get insights!
                    </p>
                </div>
            )}
        </motion.div>
    );
}

