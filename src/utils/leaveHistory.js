const STORAGE_KEY = 'leave_history_data';

import { formatDate } from './dateUtils';

export const LEAVE_TYPES = {
    FULL: 'Full Day',
    HALF_1: 'Half Day (1st Half)',
    HALF_2: 'Half Day (2nd Half)',
    SHORT: 'Short Time Off'
};

/**
 * Get all leave history
 */
export function getLeaveHistory() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        leaves: [],
        stats: {
            totalLeavesTaken: 0,
            averagePerMonth: 0,
            favoriteMonth: null,
            sandwichRate: 0
        }
    };
}

/**
 * Add leave to history
 * @param {Object} leaveData - { date, startDate, endDate, type, days, sandwiched, durationMinutes }
 */
/**
 * Add leave to history
 */
export function addLeaveToHistory(leaveData) {
    const history = getLeaveHistory();
    const newLeave = {
        id: Date.now().toString(),
        ...leaveData,
        startDate: leaveData.startDate || leaveData.date,
        endDate: leaveData.endDate || leaveData.date,
        days: leaveData.days || (leaveData.type === LEAVE_TYPES.FULL ? 1 : 0.5),
        timestamp: new Date().toISOString()
    };

    history.leaves.unshift(newLeave);

    if (history.leaves.length > 200) history.leaves = history.leaves.slice(0, 200);

    history.stats = calculateStats(history.leaves);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return newLeave;
}

/**
 * Save or update leave entry (used for cloud restoration)
 */
export function saveLeaveEntry(leaveData) {
    const history = getLeaveHistory();
    const dateStr = leaveData.date || leaveData.startDate;

    // Check if entry already exists for this date (preventing duplicates during sync)
    const existingIndex = history.leaves.findIndex(l => l.date === dateStr);

    if (existingIndex > -1) {
        history.leaves[existingIndex] = {
            ...history.leaves[existingIndex],
            ...leaveData,
            updatedAt: new Date().toISOString()
        };
    } else {
        const newLeave = {
            id: leaveData.id || Date.now().toString(),
            date: dateStr,
            startDate: dateStr,
            endDate: dateStr,
            type: leaveData.type,
            durationMinutes: leaveData.durationMinutes || 0,
            days: leaveData.days || (leaveData.type === LEAVE_TYPES.FULL ? 1 : 0.5),
            timestamp: new Date().toISOString()
        };
        history.leaves.unshift(newLeave);
    }

    history.stats = calculateStats(history.leaves);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Remove leave from history
 */
export function removeLeaveFromHistory(id) {
    const history = getLeaveHistory();
    history.leaves = history.leaves.filter(l => l.id !== id);
    history.stats = calculateStats(history.leaves);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Get leave for a specific date
 */
export function getLeaveForDate(dateStr) {
    const history = getLeaveHistory();
    // Return the first leave that covers this date
    return history.leaves.find(leave => {
        if (leave.date === dateStr) return true;
        if (leave.startDate <= dateStr && leave.endDate >= dateStr) return true;
        return false;
    });
}

/**
 * Calculate statistics from leave history
 */
function calculateStats(leaves) {
    if (leaves.length === 0) {
        return {
            totalLeavesTaken: 0,
            averagePerMonth: 0,
            favoriteMonth: null,
            sandwichRate: 0
        };
    }

    const totalDays = leaves.reduce((sum, leave) => sum + leave.days, 0);
    const sandwichLeaves = leaves.filter(leave => leave.sandwiched).length;

    // Calculate monthly distribution
    const monthCounts = {};
    leaves.forEach(leave => {
        const month = new Date(leave.startDate).getMonth();
        monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    const favoriteMonth = Object.keys(monthCounts).reduce((a, b) =>
        monthCounts[a] > monthCounts[b] ? a : b, 0
    );

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Calculate time span
    const dates = leaves.map(l => new Date(l.startDate)).sort((a, b) => a - b);
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const monthsSpan = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30));

    return {
        totalLeavesTaken: totalDays,
        averagePerMonth: (totalDays / monthsSpan).toFixed(1),
        favoriteMonth: monthNames[favoriteMonth],
        sandwichRate: (sandwichLeaves / leaves.length * 100).toFixed(0)
    };
}

/**
 * Analyze monthly patterns
 */
export function analyzeMonthlyPatterns() {
    const history = getLeaveHistory();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const monthData = Array(12).fill(0).map((_, i) => ({
        month: monthNames[i],
        shortName: monthNames[i].substring(0, 3),
        count: 0,
        days: 0
    }));

    history.leaves.forEach(leave => {
        const month = new Date(leave.startDate).getMonth();
        monthData[month].count++;
        monthData[month].days += leave.days;
    });

    return monthData;
}

/**
 * Get seasonal trends
 */
export function getSeasonalTrends() {
    const monthData = analyzeMonthlyPatterns();

    const seasons = {
        'Winter (Jan-Mar)': monthData.slice(0, 3).reduce((sum, m) => sum + m.days, 0),
        'Spring (Apr-Jun)': monthData.slice(3, 6).reduce((sum, m) => sum + m.days, 0),
        'Summer (Jul-Sep)': monthData.slice(6, 9).reduce((sum, m) => sum + m.days, 0),
        'Fall (Oct-Dec)': monthData.slice(9, 12).reduce((sum, m) => sum + m.days, 0)
    };

    return seasons;
}

/**
 * Calculate sandwich rate by leave type
 */
export function getSandwichRateByType() {
    const history = getLeaveHistory();
    const typeStats = {};

    history.leaves.forEach(leave => {
        if (!typeStats[leave.type]) {
            typeStats[leave.type] = { total: 0, sandwiched: 0 };
        }
        typeStats[leave.type].total++;
        if (leave.sandwiched) {
            typeStats[leave.type].sandwiched++;
        }
    });

    return Object.entries(typeStats).map(([type, stats]) => ({
        type,
        rate: ((stats.sandwiched / stats.total) * 100).toFixed(0),
        total: stats.total
    }));
}

/**
 * Get insights from history
 */
export function getInsights() {
    const history = getLeaveHistory();
    const insights = [];

    if (history.leaves.length === 0) {
        return [{
            type: 'info',
            message: 'No leave history yet. Start planning your leaves to get insights!'
        }];
    }

    const stats = history.stats;

    // High sandwich rate
    if (parseInt(stats.sandwichRate) > 50) {
        insights.push({
            type: 'warning',
            message: `${stats.sandwichRate}% of your leaves trigger sandwich. Consider using our suggestions!`,
            icon: '⚠️'
        });
    } else if (parseInt(stats.sandwichRate) < 20) {
        insights.push({
            type: 'success',
            message: `Great job! Only ${stats.sandwichRate}% sandwich rate. You're optimizing well!`,
            icon: '✅'
        });
    }

    // Favorite month
    if (stats.favoriteMonth) {
        insights.push({
            type: 'info',
            message: `You tend to take leaves in ${stats.favoriteMonth}`,
            icon: '📅'
        });
    }

    // Average per month
    if (parseFloat(stats.averagePerMonth) > 2.5) {
        insights.push({
            type: 'info',
            message: `You take an average of ${stats.averagePerMonth} days off per month`,
            icon: '📊'
        });
    }

    return insights;
}

/**
 * Clear all history
 */
export function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
}
