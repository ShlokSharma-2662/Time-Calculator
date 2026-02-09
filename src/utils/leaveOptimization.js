/**
 * Leave Optimization Utilities
 * Provides intelligent suggestions for leave planning
 */

import {
    isWeekend,
    isNonWorkingDay,
    getDatesBetween,
    evaluateSandwichLeave,
    formatDateISO,
    COMPANY_HOLIDAYS
} from './sandwichLeaveLogic';

/**
 * Calculate sandwich risk score (0-100)
 * Higher score = more likely to trigger sandwich leave
 */
export function calculateSandwichRisk(startDate, endDate, holidays = COMPANY_HOLIDAYS) {
    let risk = 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check day before start
    const dayBefore = new Date(start);
    dayBefore.setDate(dayBefore.getDate() - 1);
    if (isNonWorkingDay(dayBefore, holidays)) {
        risk += 35;
    }

    // Check day after end
    const dayAfter = new Date(end);
    dayAfter.setDate(dayAfter.getDate() + 1);
    if (isNonWorkingDay(dayAfter, holidays)) {
        risk += 35;
    }

    // Check non-working days between
    const allDates = getDatesBetween(start, end);
    const nonWorkingBetween = allDates.filter(d => isNonWorkingDay(d, holidays));
    risk += nonWorkingBetween.length * 15;

    return Math.min(risk, 100);
}

/**
 * Suggest alternative dates to avoid sandwich
 * Returns array of suggestions with risk scores
 */
export function suggestAlternativeDates(startDate, endDate, holidays = COMPANY_HOLIDAYS) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const suggestions = [];

    // Try shifting by 1-3 days forward/backward
    for (let shift = -3; shift <= 3; shift++) {
        if (shift === 0) continue; // Skip original

        const newStart = new Date(start);
        newStart.setDate(newStart.getDate() + shift);

        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + duration - 1);

        const risk = calculateSandwichRisk(
            formatDateISO(newStart),
            formatDateISO(newEnd),
            holidays
        );

        const evaluation = evaluateSandwichLeave(
            formatDateISO(newStart),
            formatDateISO(newEnd),
            'EL',
            holidays
        );

        if (evaluation.success) {
            suggestions.push({
                startDate: formatDateISO(newStart),
                endDate: formatDateISO(newEnd),
                risk,
                isSandwich: evaluation.isSandwich,
                extraDays: evaluation.extraDays,
                totalDays: evaluation.totalLeaveDays,
                shift: shift > 0 ? `+${shift} days` : `${shift} days`
            });
        }
    }

    // Sort by risk (lowest first)
    return suggestions.sort((a, b) => a.risk - b.risk);
}

/**
 * Find optimal leave periods combining with holidays
 * Returns opportunities where minimal leave gives maximum time off
 */
export function findOptimalLeavePeriods(year, month, holidays = COMPANY_HOLIDAYS) {
    const opportunities = [];

    // Get holidays for the specified month
    const monthHolidays = holidays.filter(h => {
        const hDate = new Date(h.date);
        return hDate.getFullYear() === year && hDate.getMonth() + 1 === month;
    });

    monthHolidays.forEach(holiday => {
        const holidayDate = new Date(holiday.date);

        // Check if it's adjacent to weekend
        const dayOfWeek = holidayDate.getDay();

        // If holiday is Friday
        if (dayOfWeek === 5) {
            opportunities.push({
                type: 'long-weekend',
                holiday: holiday.name,
                date: holiday.date,
                suggestion: 'Holiday on Friday + Weekend = 3 days off',
                leaveDaysNeeded: 0,
                totalDaysOff: 3,
                efficiency: Infinity // No leave needed!
            });
        }

        // If holiday is Monday
        if (dayOfWeek === 1) {
            opportunities.push({
                type: 'long-weekend',
                holiday: holiday.name,
                date: holiday.date,
                suggestion: 'Weekend + Holiday on Monday = 3 days off',
                leaveDaysNeeded: 0,
                totalDaysOff: 3,
                efficiency: Infinity
            });
        }

        // If holiday is Thursday
        if (dayOfWeek === 4) {
            const friday = new Date(holidayDate);
            friday.setDate(friday.getDate() + 1);

            opportunities.push({
                type: 'bridge',
                holiday: holiday.name,
                date: holiday.date,
                suggestion: `Take Friday (${friday.getDate()}), get 4 days off`,
                leaveDaysNeeded: 1,
                totalDaysOff: 4,
                efficiency: 4.0,
                recommendedDates: {
                    start: holiday.date,
                    end: formatDateISO(new Date(holidayDate.getTime() + 3 * 24 * 60 * 60 * 1000))
                }
            });
        }

        // If holiday is Tuesday
        if (dayOfWeek === 2) {
            const monday = new Date(holidayDate);
            monday.setDate(monday.getDate() - 1);

            opportunities.push({
                type: 'bridge',
                holiday: holiday.name,
                date: holiday.date,
                suggestion: `Take Monday (${monday.getDate()}), get 4 days off`,
                leaveDaysNeeded: 1,
                totalDaysOff: 4,
                efficiency: 4.0,
                recommendedDates: {
                    start: formatDateISO(monday),
                    end: holiday.date
                }
            });
        }
    });

    // Sort by efficiency (highest first)
    return opportunities.sort((a, b) => b.efficiency - a.efficiency);
}

/**
 * Get upcoming long weekends (next 3 months)
 */
export function getUpcomingLongWeekends(holidays = COMPANY_HOLIDAYS) {
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const longWeekends = [];

    for (let month = today.getMonth() + 1; month <= threeMonthsLater.getMonth() + 1; month++) {
        const year = today.getFullYear() + Math.floor(month / 13);
        const actualMonth = month % 12 || 12;

        const opportunities = findOptimalLeavePeriods(year, actualMonth, holidays);
        longWeekends.push(...opportunities);
    }

    return longWeekends.slice(0, 5); // Top 5
}

/**
 * Calculate best time to take leave of specific duration
 */
export function recommendBestDates(durationDays, startRange, endRange, holidays = COMPANY_HOLIDAYS) {
    const recommendations = [];
    const start = new Date(startRange);
    const end = new Date(endRange);

    // Scan through the range
    let currentDate = new Date(start);

    while (currentDate <= end) {
        const leaveEnd = new Date(currentDate);
        leaveEnd.setDate(leaveEnd.getDate() + durationDays - 1);

        if (leaveEnd > end) break;

        const risk = calculateSandwichRisk(
            formatDateISO(currentDate),
            formatDateISO(leaveEnd),
            holidays
        );

        const evaluation = evaluateSandwichLeave(
            formatDateISO(currentDate),
            formatDateISO(leaveEnd),
            'EL',
            holidays
        );

        if (evaluation.success && !evaluation.isSandwich) {
            recommendations.push({
                startDate: formatDateISO(currentDate),
                endDate: formatDateISO(leaveEnd),
                risk,
                score: 100 - risk, // Higher score = better
                reason: 'No sandwich leave triggered'
            });
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * Get risk level text
 */
export function getRiskLevel(risk) {
    if (risk === 0) return { level: 'None', color: 'green' };
    if (risk < 30) return { level: 'Low', color: 'green' };
    if (risk < 60) return { level: 'Medium', color: 'orange' };
    return { level: 'High', color: 'red' };
}
