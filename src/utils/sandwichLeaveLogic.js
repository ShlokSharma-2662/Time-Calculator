/**
 * Company holidays organized by Financial Year
 * Each holiday includes date and name
 */
export const HOLIDAYS_BY_FY = {
    "2025-26": [
        { date: "2026-01-14", name: "Makar Sankranti / Pongal" },
        { date: "2026-01-15", name: "Vasi Uttarayan" },
        { date: "2026-01-26", name: "Republic Day" },
        { date: "2026-03-04", name: "Holi" }
    ],

    "2026-27": [
        { date: "2026-08-15", name: "Independence Day" },
        { date: "2026-08-28", name: "Raksha Bandhan" },
        { date: "2026-09-04", name: "Janmashtami" },
        { date: "2026-09-14", name: "Ganesh Chaturthi" },
        { date: "2026-10-02", name: "Gandhi Jayanti" },
        { date: "2026-10-20", name: "Dussehra" },
        { date: "2026-11-08", name: "Diwali" },
        { date: "2026-11-10", name: "Gujarati New Year" },
        { date: "2026-11-11", name: "Bhai Dooj" },
        { date: "2026-12-25", name: "Christmas" }
    ]
};

/**
 * Get holiday name for a given date
 * @param {string} dateString - Date in 'YYYY-MM-DD' format
 * @returns {string|null} Holiday name or null if not a holiday
 */
export function getHolidayName(dateString) {
    try {
        const customHolidays = JSON.parse(localStorage.getItem('workShift_holidays') || '[]');
        const custom = customHolidays.find(h => h.date === dateString);
        if (custom) return custom.name;
    } catch (_e) { /* ignore invalid custom holiday JSON */ }

    for (const fyHolidays of Object.values(HOLIDAYS_BY_FY)) {
        const holiday = fyHolidays.find(h => h.date === dateString);
        if (holiday) return holiday.name;
    }
    return null;
}
