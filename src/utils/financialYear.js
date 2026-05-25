const FY_START_MONTH_INDEX = 3; // April (0-indexed)

function toDateSafe(dateInput) {
    if (!dateInput) return null;
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function getCurrentFinancialYearStartYear(referenceDate = new Date()) {
    const date = toDateSafe(referenceDate) || new Date();
    return date.getMonth() >= FY_START_MONTH_INDEX
        ? date.getFullYear()
        : date.getFullYear() - 1;
}

export function getFinancialYearStartYear(dateInput) {
    const date = toDateSafe(dateInput);
    if (!date) return null;
    return date.getMonth() >= FY_START_MONTH_INDEX
        ? date.getFullYear()
        : date.getFullYear() - 1;
}

export function formatFinancialYearLabel(startYear) {
    if (!Number.isFinite(startYear)) return '';
    const nextTwoDigit = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${nextTwoDigit}`;
}

export function getFinancialYearRange(startYear) {
    if (!Number.isFinite(startYear)) {
        return { startDate: '', endDate: '' };
    }
    return {
        startDate: `${startYear}-04-01`,
        endDate: `${startYear + 1}-03-31`,
    };
}

export function isDateInFinancialYear(dateInput, financialYearStartYear) {
    const fyStart = Number(financialYearStartYear);
    const dateFY = getFinancialYearStartYear(dateInput);
    return Number.isFinite(fyStart) && dateFY === fyStart;
}

export function getAvailableFinancialYears(leaves = [], options = {}) {
    const { includeCurrent = true } = options;
    const years = new Set();

    (leaves || []).forEach((leave) => {
        const fyStart = getFinancialYearStartYear(leave?.date || leave?.startDate);
        if (Number.isFinite(fyStart)) years.add(fyStart);
    });

    if (includeCurrent) {
        years.add(getCurrentFinancialYearStartYear());
    }

    return Array.from(years).sort((a, b) => b - a);
}
