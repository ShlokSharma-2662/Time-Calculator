/**
 * Data Management Utility
 * Handles full application data backup (export) and restore (import)
 */

const APP_KEYS = [
    'shift_analytics_data',
    'leave_history_data',
    'leave_balance_data',
    'historical_data',
    'startTime',
    'logInput',
    'shiftDuration',
    'use24Hour',
    'theme',
    'activeView'
];

/**
 * Export all application data as a JSON object
 */
export function exportAllData() {
    const backup = {};
    APP_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            try {
                // Try parsing if it looks like JSON
                backup[key] = JSON.parse(value);
            } catch {
                // Otherwise store as is (string)
                backup[key] = value;
            }
        }
    });

    return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: backup
    };
}

/**
 * Import application data from a JSON object
 */
export function importAllData(backup) {
    if (!backup || !backup.data) {
        throw new Error('Invalid backup format');
    }

    const { data } = backup;

    // Validate if data contains at least some of our keys
    const keysPresent = Object.keys(data).filter(key => APP_KEYS.includes(key));
    if (keysPresent.length === 0) {
        throw new Error('No valid application data found in backup');
    }

    // Restore keys
    Object.entries(data).forEach(([key, value]) => {
        if (APP_KEYS.includes(key)) {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, stringValue);
        }
    });

    return true;
}

/**
 * Download the backup as a JSON file
 */
export function downloadBackup() {
    const backup = exportAllData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `workshift_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

/**
 * Clear all application data
 */
export function clearAllData() {
    APP_KEYS.forEach(key => localStorage.removeItem(key));
}
