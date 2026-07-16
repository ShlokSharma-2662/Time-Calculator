import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from './GlassCard';
import { TrendingUp } from 'lucide-react';

export const WeeklyTrend = ({ history }) => {
    const chartData = useMemo(() => {
        if (!history || Object.keys(history).length === 0) return [];

        const today = new Date();
        const days = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            const entry = history[key];
            let hours = 0;

            if (entry) {
                // Try to extract effective work time from different possible formats
                if (entry.effectiveWorkTime) {
                    hours = Math.round((entry.effectiveWorkTime / 60) * 10) / 10;
                } else if (entry.realTimeEffectiveWork) {
                    hours = Math.round((entry.realTimeEffectiveWork / 60) * 10) / 10;
                } else if (typeof entry === 'string') {
                    // If it's just raw log data, estimate ~8h
                    hours = 0;
                }
            }

            days.push({ day: dayName, hours, date: key });
        }

        return days;
    }, [history]);

    const hasData = chartData.some(d => d.hours > 0);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{label}</p>
                    <p className="text-lg font-black text-white tabular-nums">
                        {payload[0].value}<span className="text-sm opacity-40 ml-1">hrs</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <GlassCard className="lg:col-span-2" title="Weekly Trend" icon={TrendingUp} subtitle="Last 7 days performance">
            {hasData ? (
                <div className="h-32 mt-2">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                                domain={[0, (dataMax) => Math.max(10, Math.ceil(dataMax) + 1)]}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="hours"
                                stroke="#6366f1"
                                strokeWidth={3}
                                fill="url(#colorHours)"
                                dot={{ r: 4, fill: '#6366f1', stroke: '#020617', strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: '#818cf8', stroke: '#020617', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-white/[0.02]">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 italic">
                        No history data yet — save entries to see trends
                    </span>
                </div>
            )}
        </GlassCard>
    );
};
