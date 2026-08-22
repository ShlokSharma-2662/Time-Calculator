/**
 * Normalize variations like 19-Mar-26 or 19/03/2026 to YYYY-MM-DD
 */
export function normalizeDate(dateStr) {
    if (!dateStr) return null;

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    const months = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    // Handle DD-MMM-YY(YY) (e.g. 19-Mar-26)
    const mmmMatch = dateStr.match(/(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})/);
    if (mmmMatch) {
        let [, day, month, year] = mmmMatch;
        day = day.padStart(2, '0');
        month = months[month.toLowerCase()] || '01';
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}`;
    }

    // Handle DD-MM-YY(YY)
    const numericMatch = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (numericMatch) {
        let [, day, month, year] = numericMatch;
        day = day.padStart(2, '0');
        month = month.padStart(2, '0');
        if (year.length === 2) year = '20' + year;
        // Check if it's already YYYY in front (if match was lazy)
        if (day.length === 4) return `${day}-${month}-${year.padStart(2, '0')}`;
        return `${year}-${month}-${day}`;
    }

    return dateStr;
}

export function formatDate(dateStr) {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
}

/**
 * Calendar date in the user's timezone (not UTC).
 * `toISOString().slice(0, 10)` is wrong near midnight in IST.
 */
export function getLocalISODate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function shiftLocalISODate(isoDate, dayDelta) {
    const [year, month, day] = String(isoDate || '').split('-').map(Number);
    if (!year || !month || !day) return isoDate;
    const next = new Date(year, month - 1, day + dayDelta);
    return getLocalISODate(next);
}

/**
 * Punch-log date wins when present; otherwise the picker / today.
 */
export function resolveEffectiveWorkDate(logDetectedDate, selectedDate, today) {
    return logDetectedDate || selectedDate || today || null;
}
