/**
 * Helper functions for Sandwich Leave Detection
 * Determines if weekends/holidays between leave dates should be counted as leave
 */

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
 * Get all holidays as a flat array of date strings
 * @returns {string[]} Array of holiday dates in 'YYYY-MM-DD' format
 */
function getAllHolidayDates() {
    const allHolidays = [];
    Object.values(HOLIDAYS_BY_FY).forEach(fyHolidays => {
        fyHolidays.forEach(holiday => allHolidays.push(holiday.date));
    });
    return allHolidays;
}

/**
 * Get holiday name for a given date
 * @param {string} dateString - Date in 'YYYY-MM-DD' format
 * @returns {string|null} Holiday name or null if not a holiday
 */
export function getHolidayName(dateString) {
    for (const fyHolidays of Object.values(HOLIDAYS_BY_FY)) {
        const holiday = fyHolidays.find(h => h.date === dateString);
        if (holiday) return holiday.name;
    }
    return null;
}

/**
 * Company holidays - all holidays from all fiscal years
 * Format: 'YYYY-MM-DD'
 */
export const COMPANY_HOLIDAYS = getAllHolidayDates();

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param {Date} date 
 * @returns {boolean}
 */
export function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Check if a date is a company holiday
 * @param {Date} date 
 * @param {string[]} holidays - Array of holiday dates in 'YYYY-MM-DD' format
 * @returns {boolean}
 */
export function isHoliday(date, holidays = COMPANY_HOLIDAYS) {
    const dateString = date.toISOString().split('T')[0]; // Get YYYY-MM-DD
    return holidays.includes(dateString);
}

/**
 * Check if a date is a non-working day (weekend or holiday)
 * @param {Date} date 
 * @param {string[]} holidays 
 * @returns {boolean}
 */
export function isNonWorkingDay(date, holidays = COMPANY_HOLIDAYS) {
    return isWeekend(date) || isHoliday(date, holidays);
}

/**
 * Get all dates between start and end (inclusive)
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Date[]} Array of dates
 */
export function getDatesBetween(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

/**
 * Count working days in a date range
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {string[]} holidays 
 * @returns {number}
 */
export function countWorkingDays(startDate, endDate, holidays = COMPANY_HOLIDAYS) {
    const allDates = getDatesBetween(startDate, endDate);
    return allDates.filter(date => !isNonWorkingDay(date, holidays)).length;
}

/**
 * Evaluate if leave qualifies as sandwich leave
 * 
 * SANDWICH LEAVE RULE:
 * If weekend/holiday falls between leave dates OR leave is taken immediately 
 * before and after weekend/holiday, the intervening non-working days are counted as leave
 * 
 * EXCEPTION: Single working day leave is NOT sandwich
 * 
 * @param {string|Date} startDate - Leave start date
 * @param {string|Date} endDate - Leave end date
 * @param {string} leaveType - Type of leave (EL, Marriage Leave, Comp-Off, LWP)
 * @param {string[]} holidays - Array of company holidays
 * @returns {Object} { isSandwich: boolean, extraDays: number, sandwichDates: Date[], totalLeaveDays: number }
 */
export function evaluateSandwichLeave(startDate, endDate, leaveType = 'EL', holidays = COMPANY_HOLIDAYS) {
    // Convert to Date objects and normalize to midnight
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // Validation
    if (start > end) {
        return {
            success: false,
            error: 'End date cannot be before start date'
        };
    }

    // Check if leave type applies to sandwich rule
    // All mentioned types (EL, Marriage Leave, Comp-Off, LWP) apply
    const applicableTypes = ['EL', 'Marriage Leave', 'Comp-Off', 'LWP'];
    if (!applicableTypes.includes(leaveType)) {
        return {
            success: true,
            isSandwich: false,
            extraDays: 0,
            sandwichDates: [],
            totalLeaveDays: getDatesBetween(start, end).length,
            reason: 'Leave type not subject to sandwich rule'
        };
    }

    // Get all dates in the leave range
    const allDates = getDatesBetween(start, end);

    // Find working days and non-working days
    const workingDays = allDates.filter(date => !isNonWorkingDay(date, holidays));
    const nonWorkingDays = allDates.filter(date => isNonWorkingDay(date, holidays));

    // EXCEPTION: If only ONE working day leave, it's NOT sandwich
    if (workingDays.length === 1) {
        return {
            success: true,
            isSandwich: false,
            extraDays: 0,
            sandwichDates: [],
            totalLeaveDays: 1,
            workingDays: 1,
            reason: 'Single working day leave - sandwich rule does not apply'
        };
    }

    // If there are non-working days in between working days, it's sandwich
    const isSandwich = nonWorkingDays.length > 0 && workingDays.length > 1;

    return {
        success: true,
        isSandwich,
        extraDays: isSandwich ? nonWorkingDays.length : 0,
        sandwichDates: isSandwich ? nonWorkingDays : [],
        totalLeaveDays: allDates.length,
        workingDays: workingDays.length,
        reason: isSandwich
            ? `${nonWorkingDays.length} non-working day(s) between leave dates will be counted as leave`
            : 'No non-working days between leave dates'
    };
}

/**
 * Format date for display
 * @param {Date} date 
 * @returns {string} Formatted as "Mon, 15 Mar 2026"
 */
export function formatDateDisplay(date) {
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
}

/**
 * Get date type label (Weekend/Holiday with name)
 * @param {Date} date 
 * @param {string[]} holidays 
 * @returns {string}
 */
export function getDateTypeLabel(date, holidays = COMPANY_HOLIDAYS) {
    const dateString = date.toISOString().split('T')[0];
    const isHol = isHoliday(date, holidays);
    const isWknd = isWeekend(date);

    if (isHol && isWknd) {
        const holidayName = getHolidayName(dateString);
        return holidayName ? `${holidayName} (Weekend)` : 'Holiday + Weekend';
    }
    if (isHol) {
        const holidayName = getHolidayName(dateString);
        return holidayName || 'Holiday';
    }
    if (isWknd) return 'Weekend';
    return 'Working Day';
}

/**
 * Get all dates in a specific month
 * @param {number} year 
 * @param {number} month - 1-indexed (1 = January, 12 = December)
 * @returns {Date[]} Array of dates in the month
 */
export function getMonthDates(year, month) {
    const dates = [];
    // Use UTC to avoid timezone shifts
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0));

    for (let date = 1; date <= lastDay.getUTCDate(); date++) {
        // Create dates at UTC noon to avoid any timezone edge cases
        dates.push(new Date(Date.UTC(year, month - 1, date, 12, 0, 0)));
    }

    return dates;
}

/**
 * Check if a date is within a range (inclusive)
 * @param {Date} date 
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @returns {boolean}
 */
export function isDateInRange(date, startDate, endDate) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    return d >= start && d <= end;
}

/**
 * Get holidays in a specific month
 * @param {number} year 
 * @param {number} month - 1-indexed (1 = January)
 * @returns {Array<{date: string, name: string}>} Holidays in the month
 */
export function getHolidaysInMonth(year, month) {
    const monthStr = String(month).padStart(2, '0');
    const yearMonth = `${year}-${monthStr}`;

    const allHolidays = [];
    Object.values(HOLIDAYS_BY_FY).forEach(fyHolidays => {
        fyHolidays.forEach(holiday => {
            if (holiday.date.startsWith(yearMonth)) {
                allHolidays.push(holiday);
            }
        });
    });

    return allHolidays;
}

/**
 * Get the first day of week offset for a month (for calendar grid)
 * @param {number} year 
 * @param {number} month - 1-indexed
 * @returns {number} 0-6 (0 = Sunday)
 */
export function getMonthStartDay(year, month) {
    return new Date(year, month - 1, 1).getDay();
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateISO(date) {
    return date.toISOString().split('T')[0];
}

