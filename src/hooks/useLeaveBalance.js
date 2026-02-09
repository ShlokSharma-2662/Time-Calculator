import { useState, useEffect } from 'react';

/**
 * Custom hook for managing leave balance with localStorage persistence
 */
export function useLeaveBalance() {
    const STORAGE_KEY = 'leave_balance_data';

    // Initialize state from localStorage
    const [current, setCurrent] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            return data.current || null;
        }
        return null;
    });

    const [history, setHistory] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            return data.history || [];
        }
        return [];
    });

    // Save to localStorage whenever current or history changes
    useEffect(() => {
        const data = { current, history };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [current, history]);

    /**
     * Save new balance data
     * @param {Object} balance - { opening, earned, availed }
     */
    const saveBalance = (balance) => {
        const newBalance = {
            ...balance,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        // Add current to history if it exists
        if (current) {
            setHistory(prev => [current, ...prev].slice(0, 10)); // Keep last 10
        }

        setCurrent(newBalance);
    };

    /**
     * Load a balance from history
     * @param {number} index - Index in history array
     */
    const loadFromHistory = (index) => {
        if (history[index]) {
            const oldBalance = history[index];

            // Move current to history
            if (current) {
                setHistory(prev => [current, ...prev.filter((_, i) => i !== index)].slice(0, 10));
            }

            setCurrent(oldBalance);
        }
    };

    /**
     * Clear all balance data
     */
    const clearAll = () => {
        if (confirm('Are you sure you want to clear all balance data?')) {
            setCurrent(null);
            setHistory([]);
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    /**
     * Delete specific history entry
     * @param {number} index 
     */
    const deleteHistoryEntry = (index) => {
        setHistory(prev => prev.filter((_, i) => i !== index));
    };

    return {
        current,
        history,
        saveBalance,
        loadFromHistory,
        clearAll,
        deleteHistoryEntry,
        hasSavedData: current !== null || history.length > 0
    };
}
