const STORAGE_KEY = 'leave_history_data';

import { formatDate } from './dateUtils';

export const LEAVE_TYPES = {
    FULL: 'Full Day',
    HALF_1: 'Half Day (1st Half)',
    HALF_2: 'Half Day (2nd Half)',
    SHORT: 'Short Time Off',
    CREDIT: 'Credit'
};

export const LEAVE_CATEGORIES = {
    EL: 'EL',
    CO: 'CO',
    CF: 'CF',
    MR: 'MR',
    PFH: 'PFH',
    WFH: 'WFH',
    LWP: 'LWP'
};

import { SEED_LEAVE_HISTORY } from '../data/seedHistory';
import { collection, getDocs, query, orderBy, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { importToFirestore } from './leaveImporter';

/**
 * Pushes all non-cloud local leaves to Firestore
 */
export async function pushLeavesToFirestore(userId) {
    if (!userId) return { importedCount: 0, skippedCount: 0 };

    const { leaves } = getLeaveHistory();
    if (!leaves || leaves.length === 0) return { importedCount: 0, skippedCount: 0 };

    // Format for importToFirestore
    const recordsToPush = leaves.map(l => ({
        date: l.date,
        leaveType: l.category || l.leaveType || 'EL',
        transactionType: l.transactionType || (l.days < 0 ? 'credit' : 'leave_taken'),
        consumedDays: l.days > 0 ? l.days : 0,
        creditDays: l.days < 0 ? Math.abs(l.days) : 0,
        remarks: l.remarks || '',
        source: l.source || 'local_sync'
    }));

    return await importToFirestore(userId, recordsToPush);
}

/**
 * Sync leaves from Firestore to localStorage
 */
export async function syncLeavesFromFirestore(userId) {
    if (!userId) return;

    try {
        const historyRef = collection(db, 'users', userId, 'leaveHistory');
        const q = query(historyRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const getLocalDateString = (d) => {
            if (typeof d === 'string') return d;
            const dt = d instanceof Date ? d : (d.toDate ? d.toDate() : new Date(d));
            const y = dt.getFullYear();
            const m = (dt.getMonth() + 1).toString().padStart(2, '0');
            const day = dt.getDate().toString().padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const cloudLeaves = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                date: getLocalDateString(data.date),
                id: doc.id,
                isCloud: true
            };
        });

        const history = getLeaveHistory();
        const localLeaves = history.leaves;

        // Unified key generation that works for both local and cloud structures
        const generateUniversalKey = (l) => {
            const dateStr = getLocalDateString(l.date);
            const category = l.leaveType || l.category || 'EL';
            const type = l.transactionType || (l.type === 'Credit' ? 'credit' : 'leave_taken');
            const mag = Math.abs(l.days || l.consumedDays || l.creditDays || 0);
            return `${dateStr}_${category}_${type}_${mag}`;
        };

        const existingKeys = new Set(localLeaves.map(generateUniversalKey));

        const merged = [...localLeaves];
        let addedCount = 0;

        cloudLeaves.forEach(cl => {
            const key = generateUniversalKey(cl);
            if (!existingKeys.has(key)) {
                const isCredit = cl.creditDays > 0;
                const mag = Math.abs(cl.consumedDays || cl.creditDays || 0);

                merged.push({
                    ...cl,
                    category: cl.leaveType,
                    type: isCredit ? 'Credit' : (mag === 0.5 ? 'Half Day' : 'Full Day'),
                    days: cl.consumedDays || -cl.creditDays, // Store credits as negative in local history
                    remarks: cl.remarks
                });
                addedCount++;
            }
        });

        if (addedCount > 0) {
            merged.sort((a, b) => new Date(b.date) - new Date(a.date));
            history.leaves = merged;
            history.stats = calculateStats(merged);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
            return addedCount;
        }
        return 0;
    } catch (err) {
        console.error("Failed to sync leaves from Firestore:", err);
        throw err;
    }
}

/**
 * Get all leave history
 */
export function getLeaveHistory() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }

    // Auto-seed if empty
    const initialHistory = {
        leaves: SEED_LEAVE_HISTORY.map((l, i) => ({
            id: `seed-${i}`,
            ...l,
            startDate: l.date,
            endDate: l.date,
            timestamp: new Date().toISOString()
        })),
        stats: {
            totalLeavesTaken: 0,
            averagePerMonth: 0,
            favoriteMonth: null,
            sandwichRate: 0
        }
    };
    initialHistory.stats = calculateStats(initialHistory.leaves);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialHistory));
    return initialHistory;
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
 * Calculate CO Status (Expiration & FIFO Allocation)
 * CO credits are valid for 30 days.
 */
export function calculateCOStatus(leaves, todayStr) {
    const today = new Date(todayStr);
    const coLeaves = leaves.filter(l => l.category === 'CO');

    // Sort credits by date ascending (oldest first)
    const credits = coLeaves.filter(l => l.days < 0).map(l => ({
        id: l.id,
        date: new Date(l.date),
        amount: Math.abs(l.days),
        remaining: Math.abs(l.days),
        remarks: l.remarks
    })).sort((a, b) => a.date - b.date);

    // Sort debits by date ascending
    const debits = coLeaves.filter(l => l.days > 0).map(l => ({
        id: l.id,
        date: new Date(l.date),
        amount: l.days
    })).sort((a, b) => a.date - b.date);

    // FIFO Allocation: Deduct consumptions from oldest credits first
    debits.forEach(debit => {
        let toAllocate = debit.amount;
        for (let credit of credits) {
            if (toAllocate <= 0) break;
            if (credit.remaining <= 0) continue;

            // Note: We allow consuming even if credit is technically expired at time of debit?
            // Usually, you use the credit before it expires. 
            // If the debit date > credit date + 30, it might be an invalid log, but we'll prioritize consumption.
            const take = Math.min(toAllocate, credit.remaining);
            credit.remaining -= take;
            toAllocate -= take;
        }
    });

    // Expiration Logic for remaining credits
    const result = {
        totalCredited: credits.reduce((s, c) => s + c.amount, 0),
        totalConsumed: debits.reduce((s, d) => s + d.amount, 0),
        active: 0,
        expired: 0,
        expiringSoon: [] // within 5 days
    };

    credits.forEach(credit => {
        if (credit.remaining <= 0) return;

        const expiryDate = new Date(credit.date);
        expiryDate.setDate(expiryDate.getDate() + 30);

        if (today > expiryDate) {
            result.expired += credit.remaining;
        } else {
            result.active += credit.remaining;
            // Check if expiring within 5 days
            const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 5) {
                result.expiringSoon.push({ ...credit, daysLeft: diffDays });
            }
        }
    });

    return result;
}

/**
 * Clear all history
 */
export function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
}
