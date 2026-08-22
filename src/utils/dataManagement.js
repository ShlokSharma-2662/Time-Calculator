/**
 * Data Management Utility
 * Handles full application data backup (export) and restore (import)
 */

export const APP_KEYS = [
    'workShift_history',
    'shift_analytics_data',
    'leave_history_data',
    'leave_balance_data',
    'historical_data',
    'financial_settings_data',
    'financial_passcode',
    'workShift_holidays',
    'startTime',
    'logInput',
    'shiftDuration',
    'use24Hour',
    'workDate',
    'shiftTarget',
    'leaveNotifyEnabled',
    'lastCloudSyncAt',
    'hrmsSelectedDate',
    'hrmsSyncAt',
    'hrmsIsToday',
    'hrmsFirstIn',
    'hrmsLastOut',
    'hrmsBreakMin',
    'hrmsPunchCount',
    'hrmsStatus',
    'hrmsSource',
    'theme',
    'activeView',
];

/**
 * Export all application data as a JSON object
 */
export function exportAllData() {
    const backup = {};
    APP_KEYS.forEach((key) => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            try {
                backup[key] = JSON.parse(value);
            } catch {
                backup[key] = value;
            }
        }
    });

    return {
        version: '1.1',
        timestamp: new Date().toISOString(),
        data: backup,
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

    const keysPresent = Object.keys(data).filter((key) => APP_KEYS.includes(key));
    if (keysPresent.length === 0) {
        throw new Error('No valid application data found in backup');
    }

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
    APP_KEYS.forEach((key) => localStorage.removeItem(key));
}
