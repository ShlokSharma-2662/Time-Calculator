/**
 * Shift History Tracking
 * Manages shift data persistence and analytics
 */

const STORAGE_KEY = 'shift_analytics_data';
const HISTORY_STORAGE_KEY = 'workShift_history';

/**
 * Format date string from YYYY-MM-DD to DD-MM-YYYY
 */
export function formatDate(dateStr) {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
}

/**
 * Helper to transform main history object to shifts array
 */
export function transformHistoryToShifts(history) {
    if (!history) return [];

    return Object.entries(history)
        .map(([date, data]) => ({
            date: date,
            startTime: data.startTime || '00:00',
            totalBreak: data.totalOutTime || 0,
            workingHours: data.effectiveWorkTime ? Math.round((data.effectiveWorkTime / 60) * 10) / 10 : 0,
            fullDayEnd: data.lastOutTime,
            halfDayEnd: null, // Not explicitly tracked in raw logs
            timestamp: new Date(date).toISOString()
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Get all shift data
 * Note: Now expects history to be passed from the hook/context for real-time sync
 */
export function getShiftHistory(history) {
    const shifts = transformHistoryToShifts(history);
    const stored = localStorage.getItem(STORAGE_KEY);
    let goals = {
        targetStartTime: '09:30',
        weeklyHoursTarget: 45,
        maxBreakMinutes: 60
    };

    if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.goals) goals = parsed.goals;
    }

    return {
        shifts,
        stats: calculateStats(shifts),
        goals
    };
}

/**
 * Save a new shift (for backward compatibility or explicit save)
 */
export function saveShift(shiftData) {
    // We mainly rely on the App's auto-save to workShift_history now.
    // This function can remain for explicit analytics-only data if needed,
    // but we'll prioritize the unified history.
    console.log("Analytics saveShift called with:", shiftData);
}

/**
 * Calculate comprehensive statistics
 */
function calculateStats(shifts) {
    if (!shifts || shifts.length === 0) {
        return {
            totalShifts: 0,
            avgStartTime: null,
            avgHours: 0,
            avgBreak: 0,
            attendanceRate: 0,
            currentStreak: 0
        };
    }

    // Average start time
    const startTimes = shifts.filter(s => s.startTime).map(s => {
        const [hours, minutes] = s.startTime.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0); // Convert to minutes since midnight
    });

    const avgMinutes = startTimes.length > 0 ? startTimes.reduce((sum, t) => sum + t, 0) / startTimes.length : 570; // Default 9:30
    const avgHrsCalc = Math.floor(avgMinutes / 60);
    const avgMins = Math.floor(avgMinutes % 60);
    const avgStartTime = `${String(avgHrsCalc).padStart(2, '0')}:${String(avgMins).padStart(2, '0')}`;

    // Average working hours
    const totalHours = shifts.reduce((sum, s) => sum + (s.workingHours || 0), 0);
    const avgWorkHours = totalHours / shifts.length;

    // Average break
    const totalBreak = shifts.reduce((sum, s) => sum + (s.totalBreak || 0), 0);
    const avgBreak = totalBreak / shifts.length;

    // Attendance rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentShifts = shifts.filter(s => new Date(s.date) >= thirtyDaysAgo);
    const workingDays = getWorkingDaysSince(thirtyDaysAgo);
    const attendanceRate = workingDays > 0 ? (recentShifts.length / workingDays * 100) : 0;

    // Current streak
    const currentStreak = calculateStreak(shifts);

    return {
        totalShifts: shifts.length,
        avgStartTime,
        avgHours: parseFloat(avgWorkHours.toFixed(1)),
        avgBreak: Math.round(avgBreak),
        attendanceRate: Math.round(attendanceRate),
        currentStreak
    };
}

/**
 * Calculate working days since a date (Mon-Fri)
 */
function getWorkingDaysSince(startDate) {
    const today = new Date();
    let count = 0;
    const current = new Date(startDate);

    while (current <= today) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // Not Sunday or Saturday
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
}

/**
 * Calculate current attendance streak
 */
function calculateStreak(shifts) {
    if (!shifts || shifts.length === 0) return 0;

    // Sort by date (newest first)
    const sorted = [...shifts].sort((a, b) => new Date(b.date) - new Date(a.date));

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentDate = new Date(today);

    for (const shift of sorted) {
        const shiftDate = new Date(shift.date);
        shiftDate.setHours(0, 0, 0, 0);

        // Skip weekends
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate.setDate(currentDate.getDate() - 1);
        }

        if (shiftDate.getTime() === currentDate.getTime()) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            // Check if streak is still alive (either shift is today or was yesterday)
            const diff = (today.getTime() - shiftDate.getTime()) / (1000 * 60 * 60 * 24);
            if (diff > 1 && streak === 0) break; // Streak broken
            if (streak > 0) break;
        }
    }

    return streak;
}

/**
 * The following functions now all accept 'history' for unified data source
 */

export function getQuickStats(history) {
    const data = getShiftHistory(history);
    return data.stats;
}

export function getWeeklySummary(history) {
    const data = getShiftHistory(history);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeek = data.shifts.filter(s => {
        const shiftDate = new Date(s.date);
        return shiftDate >= startOfWeek;
    });

    const totalHours = thisWeek.reduce((sum, s) => sum + s.workingHours, 0);
    const avgHours = thisWeek.length > 0 ? totalHours / thisWeek.length : 0;

    return {
        totalHours: parseFloat(totalHours.toFixed(1)),
        avgHours: parseFloat(avgHours.toFixed(1)),
        daysWorked: thisWeek.length,
        shifts: thisWeek
    };
}

export function getMonthlySummary(history) {
    const data = getShiftHistory(history);
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonth = data.shifts.filter(s => {
        const shiftDate = new Date(s.date);
        return shiftDate >= startOfMonth;
    });

    const totalHours = thisMonth.reduce((sum, s) => sum + s.workingHours, 0);
    const avgHours = thisMonth.length > 0 ? totalHours / thisMonth.length : 0;

    return {
        totalHours: parseFloat(totalHours.toFixed(1)),
        avgHours: parseFloat(avgHours.toFixed(1)),
        daysWorked: thisMonth.length,
        shifts: thisMonth
    };
}

/**
 * Calculate Month-to-Date Adherence
 * Compares actual hours vs expected hours for the current month
 * For 'today' or any in-progress day, 'expected' is till current time
 */
export function getMonthToDateAdherence(history, currentDayStats, shiftDurationMinutes) {
    const today = new Date().toISOString().slice(0, 10);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const shiftDurationHours = shiftDurationMinutes / 60;

    let totalActualMinutes = 0;
    let totalTargetMinutes = 0;

    // 1. Process historical entries for this month
    Object.entries(history).forEach(([date, data]) => {
        const d = new Date(date);
        if (d >= startOfMonth && date !== today) {
            totalActualMinutes += data.effectiveWorkTime || 0;
            // For past days, we expect a full shift if there's any log
            // If there's no log for a weekday, technically it's a 'missed' day, 
            // but we'll stick to 'logged days' for adherence.
            totalTargetMinutes += shiftDurationMinutes;
        }
    });

    // 2. Process today (the active shift)
    if (currentDayStats) {
        const actualToday = currentDayStats.effectiveWorkTime || 0;
        let targetToday = 0;

        if (currentDayStats.lastOutTime && !currentDayStats.isCurrentlyOut) {
            // If the day is 'Finished' (has a last out and not currently active)
            // Or if actual work already exceeds the goal
            if (actualToday >= shiftDurationMinutes) {
                targetToday = shiftDurationMinutes;
            } else {
                // If they finished early, target is still the full shift?
                // The user said "if log for full day is available then calculate using that"
                targetToday = shiftDurationMinutes;
            }
        } else {
            // Shift is in progress
            // Target is either the elapsed time since start (excluding breaks)
            // or the full shift duration if we've already crossed it.
            if (currentDayStats.firstInTime) {
                const [h, m] = currentDayStats.firstInTime.split(':').map(Number);
                const startTimeMinutes = h * 60 + m;
                const now = new Date();
                const nowMinutes = now.getHours() * 60 + now.getMinutes();

                const elapsedMinutes = Math.max(0, nowMinutes - startTimeMinutes - (currentDayStats.totalOutTime || 0));
                targetToday = Math.min(shiftDurationMinutes, elapsedMinutes);
            }
        }

        totalActualMinutes += actualToday;
        totalTargetMinutes += targetToday;
    }

    if (totalTargetMinutes === 0) return 100; // Perfect adherence if nothing expected yet
    const adherence = (totalActualMinutes / totalTargetMinutes) * 100;
    return Math.min(100, Math.round(adherence));
}

export function getHoursTrend(history, days = 30) {
    const data = getShiftHistory(history);
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    const trendData = data.shifts
        .filter(s => new Date(s.date) >= startDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(s => ({
            date: s.date,
            hours: s.workingHours,
            startTime: s.startTime
        }));

    return trendData;
}

export function analyzeBreakPatterns(history) {
    const data = getShiftHistory(history);

    if (data.shifts.length === 0) {
        return {
            avgBreak: 0,
            maxBreak: 0,
            minBreak: 0,
            distribution: []
        };
    }

    const breaks = data.shifts
        .filter(s => s.totalBreak > 0)
        .map(s => s.totalBreak);

    const avgBreak = breaks.reduce((sum, b) => sum + b, 0) / (breaks.length || 1);
    const maxBreak = breaks.length > 0 ? Math.max(...breaks) : 0;
    const minBreak = breaks.length > 0 ? Math.min(...breaks) : 0;

    const distribution = [
        { range: '0-30 min', count: breaks.filter(b => b <= 30).length },
        { range: '31-60 min', count: breaks.filter(b => b > 30 && b <= 60).length },
        { range: '61-90 min', count: breaks.filter(b => b > 60 && b <= 90).length },
        { range: '90+ min', count: breaks.filter(b => b > 90).length }
    ];

    return {
        avgBreak: Math.round(avgBreak),
        maxBreak,
        minBreak,
        distribution
    };
}

export function getPunctualityScore(history) {
    const data = getShiftHistory(history);
    const goals = data.goals;

    if (data.shifts.length === 0) return 100;

    const targetTime = goals.targetStartTime || '09:30';
    const [targetHr, targetMin] = targetTime.split(':').map(Number);
    const targetMinutes = targetHr * 60 + targetMin;

    const recentShifts = data.shifts.slice(0, 30); // Last 30 shifts

    let onTimeCount = 0;
    recentShifts.forEach(shift => {
        if (shift.startTime) {
            const [hr, min] = shift.startTime.split(':').map(Number);
            const shiftMinutes = hr * 60 + min;

            // Allow 10 minute grace period
            if (shiftMinutes <= targetMinutes + 10) {
                onTimeCount++;
            }
        }
    });

    return Math.round((onTimeCount / (recentShifts.length || 1)) * 100);
}

export function getMonthlyComparison(history) {
    const data = getShiftHistory(history);
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const thisMonthShifts = data.shifts.filter(s => {
        const date = new Date(s.date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    const lastMonthShifts = data.shifts.filter(s => {
        const date = new Date(s.date);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    const thisMonthHours = thisMonthShifts.reduce((sum, s) => sum + s.workingHours, 0);
    const lastMonthHours = lastMonthShifts.reduce((sum, s) => sum + s.workingHours, 0);

    const avgThisMonth = thisMonthShifts.length > 0 ? thisMonthHours / thisMonthShifts.length : 0;
    const avgLastMonth = lastMonthShifts.length > 0 ? lastMonthHours / lastMonthShifts.length : 0;

    return {
        thisMonth: {
            totalHours: parseFloat(thisMonthHours.toFixed(1)),
            avgHours: parseFloat(avgThisMonth.toFixed(1)),
            daysWorked: thisMonthShifts.length
        },
        lastMonth: {
            totalHours: parseFloat(lastMonthHours.toFixed(1)),
            avgHours: parseFloat(avgLastMonth.toFixed(1)),
            daysWorked: lastMonthShifts.length
        },
        change: {
            hours: parseFloat((thisMonthHours - lastMonthHours).toFixed(1)),
            percentage: lastMonthHours > 0
                ? parseFloat(((thisMonthHours - lastMonthHours) / lastMonthHours * 100).toFixed(1))
                : 0
        }
    };
}

export function calculateConsistencyRating(history) {
    const data = getShiftHistory(history);
    const recentShifts = data.shifts.slice(0, 30);

    if (recentShifts.length < 5) return 100; // Too few data points

    const startMinutes = recentShifts
        .filter(s => s.startTime)
        .map(s => {
            const [hr, min] = s.startTime.split(':').map(Number);
            return (hr || 0) * 60 + (min || 0);
        });

    if (startMinutes.length === 0) return 100;

    const avg = startMinutes.reduce((sum, t) => sum + t, 0) / startMinutes.length;
    const variance = startMinutes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / startMinutes.length;
    const stdDev = Math.sqrt(variance);

    const score = Math.max(0, 100 - (stdDev / 60 * 100));
    return Math.round(score);
}

export function getRecommendations(history) {
    const data = getShiftHistory(history);
    const stats = data.stats;
    const goals = data.goals;
    const recommendations = [];

    const punctuality = getPunctualityScore(history);
    if (punctuality < 70) {
        recommendations.push({
            type: 'warning',
            title: 'Improve Punctuality',
            message: `You're on-time ${punctuality}% of the time. Try starting 10 minutes earlier.`,
            icon: '⏰'
        });
    }

    if (stats.avgBreak > goals.maxBreakMinutes) {
        recommendations.push({
            type: 'info',
            title: 'Break Time Alert',
            message: `Avg break: ${stats.avgBreak}m. Goal: ${goals.maxBreakMinutes}m. Consider shorter breaks.`,
            icon: '☕'
        });
    }

    const consistency = calculateConsistencyRating(history);
    if (consistency < 60) {
        recommendations.push({
            type: 'tip',
            title: 'Consistency Matters',
            message: 'Your start times vary significantly. Try to maintain a regular schedule.',
            icon: '📊'
        });
    }

    if (stats.avgHours > 9) {
        recommendations.push({
            type: 'warning',
            title: 'Work-Life Balance',
            message: `You're averaging ${stats.avgHours}h/day. Consider reducing overtime.`,
            icon: '⚖️'
        });
    }

    if (stats.currentStreak > 5) {
        recommendations.push({
            type: 'success',
            title: 'Great Streak!',
            message: `${stats.currentStreak} days attendance! Keep it up! 🔥`,
            icon: '🎉'
        });
    }

    return recommendations;
}

export function checkGoalProgress(history) {
    const data = getShiftHistory(history);
    const goals = data.goals;
    const stats = data.stats;
    const weekly = getWeeklySummary(history);
    const punctuality = getPunctualityScore(history);

    return {
        weeklyHours: {
            current: weekly.totalHours,
            target: goals.weeklyHoursTarget,
            progress: (weekly.totalHours / goals.weeklyHoursTarget) * 100,
            status: weekly.totalHours >= goals.weeklyHoursTarget ? 'achieved' : 'inProgress'
        },
        punctuality: {
            current: punctuality,
            target: 90,
            progress: punctuality,
            status: punctuality >= 90 ? 'achieved' : 'inProgress'
        },
        breakTime: {
            current: stats.avgBreak,
            target: goals.maxBreakMinutes,
            progress: ((goals.maxBreakMinutes - stats.avgBreak) / goals.maxBreakMinutes) * 100,
            status: stats.avgBreak <= goals.maxBreakMinutes ? 'achieved' : 'exceeded'
        }
    };
}

export function exportToCSV(history) {
    const data = getShiftHistory(history);
    if (data.shifts.length === 0) return null;

    let csv = 'Date,Start Time,Total Break (min),Working Hours,Full Day End,Half Day End\n';
    data.shifts.forEach(shift => {
        csv += `${formatDate(shift.date)},${shift.startTime},${shift.totalBreak},${shift.workingHours},${shift.fullDayEnd},${shift.halfDayEnd || ''}\n`;
    });
    return csv;
}

export function getStatsForClipboard(history) {
    const stats = getQuickStats(history);
    const weekly = getWeeklySummary(history);

    return `📊 Shift Analytics Summary
    
Average Start Time: ${stats.avgStartTime}
Average Hours: ${stats.avgHours}h
Attendance Rate: ${stats.attendanceRate}%
Average Break: ${stats.avgBreak}m
Current Streak: ${stats.currentStreak} days

This Week: ${weekly.totalHours}h (${weekly.daysWorked} days)
Total Shifts Recorded: ${stats.totalShifts}`;
}

export function getGoals() {
    // Goals are still special to analytics
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.goals) return parsed.goals;
    }
    return {
        targetStartTime: '09:30',
        weeklyHoursTarget: 45,
        maxBreakMinutes: 60
    };
}

export function updateGoals(newGoals) {
    const stored = localStorage.getItem(STORAGE_KEY);
    let data = stored ? JSON.parse(stored) : { shifts: [], stats: {}, goals: {} };
    data.goals = { ...data.goals, ...newGoals };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearHistory() {
    // We don't clear the main history here, only the analytics specific data (goals)
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get heatmap data for the last 52 weeks
 */
export function getYearlyHeatmapData(history) {
    const data = getShiftHistory(history);
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setDate(today.getDate() - 364); // 52 weeks

    const yearlyShifts = data.shifts.filter(s => {
        const date = new Date(s.date);
        return date >= oneYearAgo && date <= today;
    });

    const heatmap = {};
    yearlyShifts.forEach(shift => {
        heatmap[shift.date] = {
            hours: shift.workingHours,
            intensity: shift.workingHours >= 9 ? 4 :
                shift.workingHours >= 8 ? 3 :
                    shift.workingHours >= 6 ? 2 :
                        shift.workingHours > 0 ? 1 : 0
        };
    });

    return heatmap;
}
