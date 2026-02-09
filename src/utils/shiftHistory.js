/**
 * Shift History Tracking
 * Manages shift data persistence and analytics
 */

const STORAGE_KEY = 'shift_analytics_data';
const MAX_SHIFTS = 365; // Keep last 365 shifts

/**
 * Get all shift data
 */
export function getShiftHistory() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        shifts: [],
        stats: {
            totalShifts: 0,
            avgStartTime: null,
            avgHours: 0,
            avgBreak: 0,
            attendanceRate: 0,
            currentStreak: 0
        },
        goals: {
            targetStartTime: '09:30',
            weeklyHoursTarget: 45,
            maxBreakMinutes: 60
        }
    };
}

/**
 * Save a new shift
 */
export function saveShift(shiftData) {
    const history = getShiftHistory();

    const newShift = {
        id: Date.now(),
        date: shiftData.date || new Date().toISOString().split('T')[0],
        startTime: shiftData.startTime,
        totalBreak: shiftData.totalBreak || 0,
        workingHours: shiftData.workingHours || 0,
        fullDayEnd: shiftData.fullDayEnd,
        halfDayEnd: shiftData.halfDayEnd,
        timestamp: new Date().toISOString()
    };

    // Check if shift for this date already exists
    const existingIndex = history.shifts.findIndex(s => s.date === newShift.date);
    if (existingIndex >= 0) {
        history.shifts[existingIndex] = newShift;
    } else {
        history.shifts.unshift(newShift); // Add to beginning
    }

    // Limit to MAX_SHIFTS
    if (history.shifts.length > MAX_SHIFTS) {
        history.shifts = history.shifts.slice(0, MAX_SHIFTS);
    }

    // Recalculate stats
    history.stats = calculateStats(history.shifts);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return newShift;
}

/**
 * Calculate comprehensive statistics
 */
function calculateStats(shifts) {
    if (shifts.length === 0) {
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
        return hours * 60 + minutes; // Convert to minutes since midnight
    });
    const avgMinutes = startTimes.reduce((sum, t) => sum + t, 0) / startTimes.length;
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
    if (shifts.length === 0) return 0;

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
            break;
        }
    }

    return streak;
}

/**
 * Get quick stats for dashboard
 */
export function getQuickStats() {
    const history = getShiftHistory();
    return history.stats;
}

/**
 * Get this week's summary
 */
export function getWeeklySummary() {
    const history = getShiftHistory();
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeek = history.shifts.filter(s => {
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

/**
 * Get goals
 */
export function getGoals() {
    const history = getShiftHistory();
    return history.goals;
}

/**
 * Update goals
 */
export function updateGoals(newGoals) {
    const history = getShiftHistory();
    history.goals = { ...history.goals, ...newGoals };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Clear all history
 */
export function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
}


/**
 * Get recent shifts (last N)
 */
export function getRecentShifts(count = 10) {
    const history = getShiftHistory();
    return history.shifts.slice(0, count);
}

/******************************************************************************
 * PHASE 2: TREND ANALYSIS & PATTERN DETECTION
 ******************************************************************************/

/**
 * Get hours trend for last N days
 */
export function getHoursTrend(days = 30) {
    const history = getShiftHistory();
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    const trendData = history.shifts
        .filter(s => new Date(s.date) >= startDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(s => ({
            date: s.date,
            hours: s.workingHours,
            startTime: s.startTime
        }));

    return trendData;
}

/**
 * Analyze break patterns
 */
export function analyzeBreakPatterns() {
    const history = getShiftHistory();

    if (history.shifts.length === 0) {
        return {
            avgBreak: 0,
            maxBreak: 0,
            minBreak: 0,
            distribution: []
        };
    }

    const breaks = history.shifts
        .filter(s => s.totalBreak > 0)
        .map(s => s.totalBreak);

    const avgBreak = breaks.reduce((sum, b) => sum + b, 0) / breaks.length;
    const maxBreak = Math.max(...breaks);
    const minBreak = Math.min(...breaks);

    // Distribution: 0-30, 31-60, 61-90, 90+
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

/**
 * Calculate punctuality score (0-100)
 */
export function getPunctualityScore() {
    const history = getShiftHistory();
    const goals = history.goals;

    if (history.shifts.length === 0) return 100;

    const targetTime = goals.targetStartTime || '09:30';
    const [targetHr, targetMin] = targetTime.split(':').map(Number);
    const targetMinutes = targetHr * 60 + targetMin;

    const recentShifts = history.shifts.slice(0, 30); // Last 30 shifts

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

    return Math.round((onTimeCount / recentShifts.length) * 100);
}

/**
 * Get monthly comparison
 */
export function getMonthlyComparison() {
    const history = getShiftHistory();
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const thisMonthShifts = history.shifts.filter(s => {
        const date = new Date(s.date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    const lastMonthShifts = history.shifts.filter(s => {
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

/**
 * Calculate consistency rating (0-100)
 * Based on variance in start times
 */
export function calculateConsistencyRating() {
    const history = getShiftHistory();
    const recentShifts = history.shifts.slice(0, 30);

    if (recentShifts.length < 5) return 100; // Too few data points

    const startMinutes = recentShifts
        .filter(s => s.startTime)
        .map(s => {
            const [hr, min] = s.startTime.split(':').map(Number);
            return hr * 60 + min;
        });

    if (startMinutes.length === 0) return 100;

    // Calculate standard deviation
    const avg = startMinutes.reduce((sum, t) => sum + t, 0) / startMinutes.length;
    const variance = startMinutes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / startMinutes.length;
    const stdDev = Math.sqrt(variance);

    // Convert to score: 0 stdDev = 100, 60 min stdDev = 0
    const score = Math.max(0, 100 - (stdDev / 60 * 100));

    return Math.round(score);
}

/******************************************************************************
 * PHASE 3: PREDICTIONS, GOALS & EXPORT
 ******************************************************************************/

/**
 * Suggest optimal start time based on history
 */
export function suggestOptimalStartTime() {
    const history = getShiftHistory();
    const recentShifts = history.shifts.slice(0, 30);

    if (recentShifts.length < 5) {
        return {
            suggested: history.goals.targetStartTime || '09:30',
            reason: 'Insufficient data. Using target time.'
        };
    }

    // Find most consistent start time
    const startMinutes = recentShifts
        .filter(s => s.startTime)
        .map(s => {
            const [hr, min] = s.startTime.split(':').map(Number);
            return hr * 60 + min;
        });

    const avg = startMinutes.reduce((sum, t) => sum + t, 0) / startMinutes.length;
    const hours = Math.floor(avg / 60);
    const mins = Math.round(avg % 60);

    return {
        suggested: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
        reason: 'Based on your 30-day average'
    };
}

/**
 * Get smart recommendations
 */
export function getRecommendations() {
    const history = getShiftHistory();
    const stats = history.stats;
    const goals = history.goals;
    const recommendations = [];

    // Punctuality recommendation
    const punctuality = getPunctualityScore();
    if (punctuality < 70) {
        recommendations.push({
            type: 'warning',
            title: 'Improve Punctuality',
            message: `You're on-time ${punctuality}% of the time. Try starting 10 minutes earlier.`,
            icon: '⏰'
        });
    }

    // Break recommendation
    if (stats.avgBreak > goals.maxBreakMinutes) {
        recommendations.push({
            type: 'info',
            title: 'Break Time Alert',
            message: `Avg break: ${stats.avgBreak}m. Goal: ${goals.maxBreakMinutes}m. Consider shorter breaks.`,
            icon: '☕'
        });
    }

    // Consistency recommendation
    const consistency = calculateConsistencyRating();
    if (consistency < 60) {
        recommendations.push({
            type: 'tip',
            title: 'Consistency Matters',
            message: 'Your start times vary significantly. Try to maintain a regular schedule.',
            icon: '📊'
        });
    }

    // Work-life balance (if avg hours > 9)
    if (stats.avgHours > 9) {
        recommendations.push({
            type: 'warning',
            title: 'Work-Life Balance',
            message: `You're averaging ${stats.avgHours}h/day. Consider reducing overtime.`,
            icon: '⚖️'
        });
    }

    // Positive feedback
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

/**
 * Export shifts to CSV
 */
export function exportToCSV() {
    const history = getShiftHistory();

    if (history.shifts.length === 0) {
        return null;
    }

    // CSV Header
    let csv = 'Date,Start Time,Total Break (min),Working Hours,Full Day End,Half Day End\n';

    // Add rows
    history.shifts.forEach(shift => {
        csv += `${shift.date},${shift.startTime},${shift.totalBreak},${shift.workingHours},${shift.fullDayEnd},${shift.halfDayEnd}\n`;
    });

    return csv;
}

/**
 * Get stats for clipboard
 */
export function getStatsForClipboard() {
    const stats = getQuickStats();
    const weekly = getWeeklySummary();

    return `📊 Shift Analytics Summary
    
Average Start Time: ${stats.avgStartTime}
Average Hours: ${stats.avgHours}h
Attendance Rate: ${stats.attendanceRate}%
Average Break: ${stats.avgBreak}m
Current Streak: ${stats.currentStreak} days

This Week: ${weekly.totalHours}h (${weekly.daysWorked} days)
Total Shifts Recorded: ${stats.totalShifts}`;
}

/**
 * Get heatmap data for calendar
 */
export function getHeatmapData(year, month) {
    const history = getShiftHistory();

    const monthShifts = history.shifts.filter(s => {
        const date = new Date(s.date);
        return date.getFullYear() === year && date.getMonth() === month;
    });

    // Create map of date -> hours
    const heatmap = {};
    monthShifts.forEach(shift => {
        const day = new Date(shift.date).getDate();
        heatmap[day] = {
            hours: shift.workingHours,
            intensity: shift.workingHours >= 8 ? 'high' : shift.workingHours >= 4 ? 'medium' : 'low'
        };
    });

    return heatmap;
}

/**
 * Check goal progress
 */
export function checkGoalProgress() {
    const history = getShiftHistory();
    const goals = history.goals;
    const stats = history.stats;
    const weekly = getWeeklySummary();
    const punctuality = getPunctualityScore();

    return {
        weeklyHours: {
            current: weekly.totalHours,
            target: goals.weeklyHoursTarget,
            progress: (weekly.totalHours / goals.weeklyHoursTarget) * 100,
            status: weekly.totalHours >= goals.weeklyHoursTarget ? 'achieved' : 'inProgress'
        },
        punctuality: {
            current: punctuality,
            target: 90, // Default target
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
