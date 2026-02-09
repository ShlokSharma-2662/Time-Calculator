/**
 * Leave History Tracking
 * Manages historical leave data and analytics
 */

const STORAGE_KEY = 'leave_history_data';

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
 */
export function addLeaveToHistory(leaveData) {
    const history = getLeaveHistory();

    const newLeave = {
        id: Date.now().toString(),
        ...leaveData,
        timestamp: new Date().toISOString()
    };

    history.leaves.unshift(newLeave); // Add to beginning

    // Keep only last 50 entries
    if (history.leaves.length > 50) {
        history.leaves = history.leaves.slice(0, 50);
    }

    // Recalculate stats
    history.stats = calculateStats(history.leaves);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return newLeave;
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
