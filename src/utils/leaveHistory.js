const STORAGE_KEY = 'leave_history_data';

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
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
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
        id: crypto.randomUUID(),
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
            id: leaveData.id || crypto.randomUUID(),
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
 * Calculate CO Status (Expiration & FIFO Allocation)
 * CO credits are valid for 30 days.
 */
export function calculateCOStatus(leaves, todayStr) {
    const toDayStart = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const toDays = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };

    const today = toDayStart(todayStr || new Date());
    const coLeaves = leaves.filter((leave) => (leave.category || leave.leaveType) === 'CO');

    // Sort credits by date ascending (oldest first)
    const credits = coLeaves
        .map((leave) => {
            const date = toDayStart(leave.transactionDate || leave.date);
            if (!date) return null;

            const creditDays = toDays(leave.creditDays);
            const isCreditTxn = (leave.transactionType || '').toLowerCase() === 'credit'
                || (leave.transactionType || '').toLowerCase() === 'monthly_increment';
            const amount = creditDays > 0
                ? creditDays
                : (isCreditTxn || toDays(leave.days) < 0 ? Math.abs(toDays(leave.days)) : 0);
            if (amount <= 0) return null;

            const expiryDate = new Date(date);
            expiryDate.setDate(expiryDate.getDate() + 30);

            return {
                id: leave.id,
                date,
                expiryDate,
                amount,
                remaining: amount,
                remarks: leave.remarks
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.date - b.date);

    // Sort debits by date ascending
    const debits = coLeaves
        .map((leave) => {
            const date = toDayStart(leave.transactionDate || leave.date);
            if (!date) return null;

            const consumedDays = toDays(leave.consumedDays);
            const isDebitTxn = (leave.transactionType || '').toLowerCase() === 'debit'
                || (leave.transactionType || '').toLowerCase() === 'leave_taken';
            const amount = consumedDays > 0
                ? consumedDays
                : (isDebitTxn || (toDays(leave.days) > 0 && toDays(leave.creditDays) <= 0) ? Math.abs(toDays(leave.days)) : 0);
            if (amount <= 0) return null;

            return {
                id: leave.id,
                date,
                amount
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.date - b.date);

    // FIFO Allocation with 30-day validity window:
    // debit can consume only credits where credit.date <= debit.date <= credit.expiryDate.
    let allocatedConsumed = 0;
    debits.forEach((debit) => {
        let toAllocate = debit.amount;
        for (const credit of credits) {
            if (toAllocate <= 0) break;
            if (credit.remaining <= 0) continue;
            if (debit.date < credit.date) continue;
            if (debit.date > credit.expiryDate) continue;

            const take = Math.min(toAllocate, credit.remaining);
            credit.remaining -= take;
            toAllocate -= take;
            allocatedConsumed += take;
        }
    });

    // Expiration logic for remaining credits as of today
    const result = {
        totalCredited: credits.reduce((s, c) => s + c.amount, 0),
        totalConsumed: allocatedConsumed,
        active: 0,
        expired: 0,
        expiringSoon: [] // within 5 days
    };

    credits.forEach((credit) => {
        if (credit.remaining <= 0) return;
        if (today && today > credit.expiryDate) {
            result.expired += credit.remaining;
        } else {
            result.active += credit.remaining;
            // Check if expiring within 5 days
            if (today) {
                const diffDays = Math.ceil((credit.expiryDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays <= 5) {
                    result.expiringSoon.push({ ...credit, daysLeft: diffDays });
                }
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
