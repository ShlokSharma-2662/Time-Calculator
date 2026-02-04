import { useState, useEffect } from 'react';

const STORAGE_KEY = 'workShift_history';

export const useHistory = () => {
    const [history, setHistory] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Failed to parse history", e);
            return {};
        }
    });

    // Save history to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }, [history]);

    const saveEntry = (date, data) => {
        setHistory(prev => ({
            ...prev,
            [date]: data
        }));
    };

    const getEntry = (date) => {
        return history[date] || null;
    };

    const getAllEntries = () => {
        return Object.entries(history).sort((a, b) => new Date(b[0]) - new Date(a[0]));
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Start Time', 'First In', 'Last Out', 'Breaks (min)', 'Effective Work (h:m)'];
        const rows = getAllEntries().map(([date, data]) => {
            // Basic validation
            if (!data) return [date, '-', '-', '-', '-', '-'];

            return [
                date,
                data.startTime || '-',
                data.firstInTime || '-',
                data.lastOutTime || '-',
                data.totalOutTime || '0',
                // Simple format since we don't have the helper function here, or pass raw minutes
                data.effectiveWorkTime ? `${Math.floor(data.effectiveWorkTime / 60)}h ${data.effectiveWorkTime % 60}m` : '0h 0m'
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `workshift_history_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return { history, saveEntry, getEntry, getAllEntries, exportToCSV };
};
