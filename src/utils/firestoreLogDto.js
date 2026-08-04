const HHMM_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LOG_INPUT = 50000;
const MAX_STO_ENTRIES = 199;
const MAX_REQUEST_TYPE = 80;
const MAX_LEAVE_TYPE = 80;
const MAX_REMARK = 500;

function pad(value) {
    return String(value).padStart(2, '0');
}

/**
 * Normalize time strings (24h or AM/PM) to HH:MM for Firestore rules.
 */
export function toHHMM(value) {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (HHMM_RE.test(trimmed)) return trimmed;

    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridian = match[3];

    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59 || hours > 23 && !meridian) {
        return null;
    }

    if (meridian) {
        const upper = meridian.toUpperCase();
        if (upper === 'PM' && hours < 12) hours += 12;
        if (upper === 'AM' && hours === 12) hours = 0;
        if (hours > 23) return null;
    } else if (hours > 23) {
        return null;
    }

    return `${pad(hours)}:${pad(minutes)}`;
}

function toNonNegativeInt(value, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return fallback;
    return Math.round(number);
}

function sanitizeActiveLeave(leave) {
    if (!leave || typeof leave !== 'object' || Array.isArray(leave)) return null;

    const out = {};
    if (typeof leave.type === 'string' && leave.type.trim()) {
        out.type = leave.type.trim().slice(0, MAX_LEAVE_TYPE);
    }
    if (typeof leave.category === 'string' && leave.category.trim()) {
        out.category = leave.category.trim().slice(0, 40);
    }
    if (typeof leave.half === 'string' && leave.half.trim()) {
        out.half = leave.half.trim().slice(0, 40);
    }
    if (typeof leave.date === 'string' && ISO_DATE_RE.test(leave.date)) {
        out.date = leave.date;
    }
    if (typeof leave.startDate === 'string' && ISO_DATE_RE.test(leave.startDate)) {
        out.startDate = leave.startDate;
    }
    if (typeof leave.endDate === 'string' && ISO_DATE_RE.test(leave.endDate)) {
        out.endDate = leave.endDate;
    }
    if (Number.isFinite(Number(leave.days))) {
        out.days = Number(leave.days);
    }
    if (Number.isFinite(Number(leave.durationMinutes))) {
        out.durationMinutes = Math.max(0, Math.round(Number(leave.durationMinutes)));
    }
    if (typeof leave.remarks === 'string') {
        out.remarks = leave.remarks.slice(0, MAX_REMARK);
    }
    if (typeof leave.reason === 'string') {
        out.reason = leave.reason.slice(0, MAX_REMARK);
    }

    return Object.keys(out).length > 0 ? out : null;
}

function sanitizeShortTimeOffEntries(entries) {
    if (!Array.isArray(entries)) return null;

    const cleaned = entries
        .slice(0, MAX_STO_ENTRIES)
        .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;

            const appDate = typeof entry.appDate === 'string' && ISO_DATE_RE.test(entry.appDate)
                ? entry.appDate
                : null;
            const requestDate = typeof entry.requestDate === 'string' && ISO_DATE_RE.test(entry.requestDate)
                ? entry.requestDate
                : appDate;
            const requestType = typeof entry.requestType === 'string'
                ? entry.requestType.trim().slice(0, MAX_REQUEST_TYPE)
                : '';
            const minutes = toNonNegativeInt(entry.minutes, -1);

            if (!appDate || !requestDate || !requestType || minutes < 0) return null;
            return { appDate, requestDate, requestType, minutes };
        })
        .filter(Boolean);

    return cleaned.length > 0 ? cleaned : null;
}

function sanitizeRaw(raw) {
    if (raw == null) return null;
    if (typeof raw === 'string' || typeof raw === 'number') return raw;
    if (typeof raw === 'object') return raw;
    return null;
}

/**
 * Build a Firestore logs/{date} payload that matches security rules.
 */
export function buildFirestoreLogDto(date, data = {}) {
    if (!date || !ISO_DATE_RE.test(date)) {
        throw new Error(`Invalid log date: ${date}`);
    }

    const source = data && typeof data === 'object' && !Array.isArray(data) ? data : { raw: data };
    const effectiveWorkTimeRaw = Number(source.effectiveWorkTime);
    const effectiveWorkTime = Number.isFinite(effectiveWorkTimeRaw) && effectiveWorkTimeRaw >= 0
        ? effectiveWorkTimeRaw
        : 0;

    const shortTimeOffMinutes = source.shortTimeOffMinutes == null
        ? null
        : toNonNegativeInt(source.shortTimeOffMinutes, 0);

    return {
        date,
        startTime: toHHMM(source.startTime) || '00:00',
        logInput: typeof source.logInput === 'string' ? source.logInput.slice(0, MAX_LOG_INPUT) : '',
        totalOutTime: toNonNegativeInt(source.totalOutTime, 0),
        effectiveWorkTime,
        firstInTime: toHHMM(source.firstInTime),
        lastOutTime: toHHMM(source.lastOutTime),
        activeLeave: sanitizeActiveLeave(source.activeLeave),
        shortTimeOffMinutes,
        shortTimeOffEntries: sanitizeShortTimeOffEntries(source.shortTimeOffEntries),
        updatedAt: new Date().toISOString(),
        raw: sanitizeRaw(source.raw),
    };
}
