/**
 * Utility for persisting and managing user-defined public holidays
 */

const HOLIDAYS_KEY = 'workShift_holidays';

/**
 * Get all holidays (merges hardcoded with user-defined)
 * @param {Object} hardcodedHolidays - The HOLIDAYS_BY_FY object from sandwichLeaveLogic
 * @returns {Array} Flat array of {date, name, isCustom}
 */
export function getMergedHolidays(hardcodedHolidays) {
    const customHolidays = JSON.parse(localStorage.getItem(HOLIDAYS_KEY) || '[]');
    const flatHardcoded = [];

    Object.entries(hardcodedHolidays).forEach(([fy, holidays]) => {
        holidays.forEach(h => flatHardcoded.push({ ...h, isCustom: false, fy }));
    });

    return [...flatHardcoded, ...customHolidays.map(h => ({ ...h, isCustom: true }))].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );
}

/**
 * Add a custom holiday
 * @param {string} date - YYYY-MM-DD
 * @param {string} name - Holiday name
 */
export function addCustomHoliday(date, name) {
    const customHolidays = JSON.parse(localStorage.getItem(HOLIDAYS_KEY) || '[]');

    // Prevent duplicates
    if (customHolidays.some(h => h.date === date)) {
        throw new Error('A holiday already exists for this date.');
    }

    customHolidays.push({ date, name });
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(customHolidays));
    return customHolidays;
}

/**
 * Remove a custom holiday
 * @param {string} date - YYYY-MM-DD
 */
export function removeCustomHoliday(date) {
    const customHolidays = JSON.parse(localStorage.getItem(HOLIDAYS_KEY) || '[]');
    const filtered = customHolidays.filter(h => h.date !== date);
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(filtered));
    return filtered;
}
