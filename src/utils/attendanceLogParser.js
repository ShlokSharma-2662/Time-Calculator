import { normalizeDate } from './dateUtils';

const DATE_RE = /(\d{4}-\d{2}-\d{2})|(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4})|(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/g;
const DATE_CELL_RE = /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})$/;
const TIME_WITH_MERIDIAN_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
const TIME_ONLY_RE = /^(\d{1,2}:\d{2})(?:\s*(AM|PM))?$/i;
const NO_DETAILS_RE = /^No details available$/i;

const cleanText = (value) => String(value || '').replace(/\*\*/g, '').trim();

function pad(value) {
    return String(value).padStart(2, '0');
}

function toMinutes(rawTime) {
    const match = String(rawTime || '').trim().match(TIME_ONLY_RE);
    if (!match) return null;

    const [_, time, meridian] = match;
    const [hoursRaw, minutesRaw] = time.split(':');
    let hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    const hasMeridian = Boolean(meridian);
    if (hasMeridian) {
        const upper = meridian.toUpperCase();
        if (upper === 'PM' && hours < 12) hours += 12;
        if (upper === 'AM' && hours === 12) hours = 0;
    }

    return hours * 60 + minutes;
}

function to24HourString(totalMinutes) {
    const minutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${pad(h)}:${pad(m)}`;
}

function normalizeDateValue(rawDate) {
    const normalized = normalizeDate(rawDate);
    if (!normalized) return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function splitLineToColumns(line) {
    const lineWithoutStars = cleanText(line);
    if (!lineWithoutStars) return [];

    if (lineWithoutStars.includes('\t')) {
        return lineWithoutStars.split('\t').map(cleanText);
    }

    if (lineWithoutStars.includes('|')) {
        const trimmed = lineWithoutStars.replace(/^\|/, '').replace(/\|$/, '');
        return trimmed.split('|').map(cleanText);
    }

    return [];
}

function parsePunchLine(line, index) {
    const columns = splitLineToColumns(line);
    let parsed = null;

    if (columns.length >= 7) {
        const date = normalizeDateValue(columns[0]);
        const [timeText, direction] = [columns[1], columns[2]?.toUpperCase()];
        const minutes = toMinutes(timeText);

        if (date && TIME_WITH_MERIDIAN_RE.test(timeText) && (direction === 'IN' || direction === 'OUT')) {
            parsed = {
                date,
                rawTime: cleanText(timeText),
                minutes,
                displayTime: to24HourString(minutes || 0),
                type: direction,
                ipAddress: cleanText(columns[3]),
                machine: cleanText(columns[4]),
                swipeDate: normalizeDateValue(columns[5]) || columns[5] || '',
                entryDateTime: cleanText(columns[6]),
                approverRemark: cleanText(columns.slice(7).join(' ')),
                lineNumber: index,
            };
        }
    }

    if (parsed) return parsed;

    if (columns.length >= 3) {
        const date = normalizeDateValue(columns[0]);
        const [timeText, direction] = [columns[1], columns[2]?.toUpperCase()];
        const minutes = toMinutes(timeText);

        if (date && TIME_WITH_MERIDIAN_RE.test(timeText) && (direction === 'IN' || direction === 'OUT')) {
            return {
                date,
                rawTime: cleanText(timeText),
                minutes,
                displayTime: to24HourString(minutes || 0),
                time24: to24HourString(minutes || 0),
                type: direction,
                ipAddress: '',
                machine: cleanText(columns[3]),
                swipeDate: date,
                entryDateTime: `${date} ${cleanText(timeText)}`,
                approverRemark: cleanText(columns.slice(3).join(' ')),
                lineNumber: index,
            };
        }
    }

    const fallback = line.match(/^\s*(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s+(IN|OUT)\b.+?\b(\d{1,3}(?:\.\d{1,3}){3})\s+(.+?)\s+(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))(?:\s+(.*))?$/i);
    if (!fallback) return null;

    const [, dateRaw, timeRaw, direction, , machine, swipeDateRaw, , remark = ''] = fallback;
    const date = normalizeDateValue(dateRaw);
    const minutes = toMinutes(timeRaw);

    if (!date || minutes === null || Number.isNaN(minutes) || !DATE_CELL_RE.test(swipeDateRaw)) return null;

    return {
        date,
        rawTime: cleanText(timeRaw),
        minutes,
        displayTime: to24HourString(minutes),
        type: direction.toUpperCase(),
        ipAddress: '',
        machine: cleanText(machine),
        swipeDate: normalizeDateValue(swipeDateRaw) || cleanText(swipeDateRaw),
        entryDateTime: cleanText(`${dateRaw} ${timeRaw}`),
        approverRemark: cleanText(remark),
        lineNumber: index,
    };
}

function parseShortTimeOffLine(line, index) {
    const columns = splitLineToColumns(line);
    if (columns.length >= 4) {
        const requestDate = normalizeDateValue(columns[1]);
        const date = normalizeDateValue(columns[0]);
        const requestType = cleanText(columns[2]);
        const minutes = Number(columns[3]);

        if (date && requestType && Number.isFinite(minutes) && minutes > 0) {
            return {
                appDate: date,
                requestDate: requestDate || date,
                requestType,
                minutes,
                fromTo: cleanText(columns[4] || ''),
                remark: cleanText(columns.slice(5).join(' ')),
                lineNumber: index,
            };
        }
    }

    const compactColumns = splitLineToColumns(line);
    if (compactColumns.length >= 4 && compactColumns[0] && compactColumns[1] && compactColumns[2]) {
        const date = normalizeDateValue(compactColumns[0]);
        const requestDate = normalizeDateValue(compactColumns[1]) || date;
        const requestType = cleanText(compactColumns[2]);
        const minutes = Number(compactColumns[3]);

        if (date && requestType && Number.isFinite(minutes) && minutes > 0) {
            return {
                appDate: date,
                requestDate,
                requestType,
                minutes,
                fromTo: '',
                remark: cleanText(compactColumns.slice(4).join(' ')),
                lineNumber: index,
            };
        }
    }

    const fallback = line.match(/^\s*(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+([A-Za-z ].*?)\s+(\d+)\s*.*$/i);
    if (!fallback) return null;

    const [, dateRaw, requestDateRaw, requestTypeRaw, minutesRaw, ...rest] = fallback;
    const date = normalizeDateValue(dateRaw);
    const requestDate = normalizeDateValue(requestDateRaw);
    const requestType = cleanText(requestTypeRaw);
    const minutes = Number(minutesRaw);
    if (!date || !requestDate || !requestType || !Number.isFinite(minutes) || minutes <= 0) return null;

    return {
        appDate: date,
        requestDate,
        requestType,
        minutes,
        remark: cleanText(rest.join(' ')),
        lineNumber: index,
    };
}

function normalizeSection(line) {
    const cleaned = cleanText(line);
    if (/^Daily In Out Punch$/i.test(cleaned)) return 'punch';
    if (/^Leave Details$/i.test(cleaned)) return 'leave';
    if (/^Swipe Request Done$/i.test(cleaned)) return 'swipe';
    if (/^Short Time[-\s]Off$/i.test(cleaned)) return 'shortTimeOff';
    return null;
}

function extractDetectedDate(lines) {
    for (const line of lines) {
        const match = line.match(DATE_RE);
        if (match?.length) {
            const parsed = normalizeDateValue(match[0]);
            if (parsed) return parsed;
        }
    }
    return null;
}

function daysBetweenIso(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const startMs = Date.parse(`${startDate}T00:00:00Z`);
    const endMs = Date.parse(`${endDate}T00:00:00Z`);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
    return Math.round((endMs - startMs) / 86400000);
}

function buildSessionStats(events) {
    // Preserve source order within a date so same-calendar overnight
    // wraps (23:00 → 01:30) stay chronological; only reorder across dates.
    const sorted = events
        .map((punch, index) => ({ ...punch, sortIndex: index }))
        .sort((a, b) => {
            if (a.date !== b.date) return String(a.date || '').localeCompare(String(b.date || ''));
            return a.sortIndex - b.sortIndex;
        });

    const originDate = sorted[0]?.date || null;
    let wrapOffset = 0;
    let previousRawMinutes = null;
    let previousDate = null;

    const absoluteEvents = sorted.map((event) => {
        const dateOffset = originDate && event.date
            ? Math.max(0, daysBetweenIso(originDate, event.date)) * 24 * 60
            : 0;

        const sameCalendarDay = !previousDate || !event.date || previousDate === event.date;
        if (
            previousRawMinutes !== null
            && sameCalendarDay
            && event.minutes < previousRawMinutes
            && (previousRawMinutes - event.minutes) > 180
        ) {
            wrapOffset += 24 * 60;
        }

        const absoluteMinutes = event.minutes + dateOffset + wrapOffset;
        previousRawMinutes = event.minutes;
        previousDate = event.date || previousDate;

        return {
            ...event,
            absoluteMinutes,
            displayTime: to24HourString(event.minutes),
            time24: to24HourString(event.minutes),
        };
    });

    const sessions = [];
    const breaks = [];
    const anomalies = [];
    const blankApproverRemarks = [];
    const openInQueue = [];

    absoluteEvents.forEach((event) => {
        if (!event.approverRemark) {
            blankApproverRemarks.push({
                type: event.type,
                date: event.date,
                time24: event.time24,
                machine: event.machine || 'Unknown',
            });
        }

        if (event.type === 'IN') {
            openInQueue.push(event);
            return;
        }

        const latestIn = openInQueue.shift();
        if (!latestIn) {
            anomalies.push({
                type: 'odd-punch-count',
                message: `Punch gap detected: Out at ${event.time24} has no matching In before it.`,
            });
            return;
        }

        const sessionDuration = event.absoluteMinutes - latestIn.absoluteMinutes;
        if (sessionDuration < 0) {
            anomalies.push({
                type: 'invalid-session',
                message: `Invalid session: In at ${latestIn.time24} followed by Out at ${event.time24} (${sessionDuration}m).`,
            });
            return;
        }

        sessions.push({
            start: latestIn.time24,
            end: event.time24,
            startMinutes: latestIn.minutes,
            endMinutes: event.minutes,
            durationMinutes: sessionDuration,
            startMachine: latestIn.machine || 'Unknown',
            endMachine: event.machine || latestIn.machine || 'Unknown',
        });
    });

    openInQueue.forEach((unmatchedIn) => {
        anomalies.push({
            type: 'odd-punch-count',
            message: `Punch gap detected: In at ${unmatchedIn.time24} has no matching Out.`,
        });
    });

    for (let i = 0; i < absoluteEvents.length - 1; i++) {
        const current = absoluteEvents[i];
        const next = absoluteEvents[i + 1];
        const hasMachineChange = (current.machine || next.machine) && current.machine !== next.machine;

        if (hasMachineChange) {
            anomalies.push({
                type: 'machine-change',
                message: `Machine changed from "${current.machine || 'Unknown'}" to "${next.machine || 'Unknown'}" between ${current.time24} and ${next.time24}.`,
            });
        }

        if (current.type === 'OUT' && next.type === 'IN') {
            const gap = Math.max(0, next.absoluteMinutes - current.absoluteMinutes);
            breaks.push({
                start: current.time24,
                end: next.time24,
                duration: gap,
            });
            if (gap > 120) {
                anomalies.push({
                    type: 'long-gap',
                    message: `Out → In gap is ${gap}m (${current.time24} to ${next.time24}), above 2h.`,
                });
            }
        }
    }

    const totalWorkMinutes = sessions.reduce((total, session) => total + (session.durationMinutes || 0), 0);
    const totalOutMinutes = breaks.reduce((total, block) => total + (block.duration || 0), 0);

    return {
        events: absoluteEvents,
        sessions,
        breaks,
        anomalies,
        blankApproverRemarks,
        totalWorkMinutes,
        totalOutMinutes,
        sessionCount: sessions.length
    };
}

export function parseAttendanceLogInput(rawText) {
    const text = String(rawText || '').replace(/\r/g, '\n');
    const lines = text.split('\n');

    const punchRows = [];
    const shortTimeOffEntries = [];
    let section = 'unknown';
    let shortTimeOffDisabled = false;

    lines.forEach((line, index) => {
        const cleaned = cleanText(line);
        if (!cleaned) return;

        const sectionName = normalizeSection(cleaned);
        if (sectionName) {
            section = sectionName;
            shortTimeOffDisabled = sectionName === 'shortTimeOff' ? false : shortTimeOffDisabled;
            return;
        }

        if (NO_DETAILS_RE.test(cleaned)) {
            if (section === 'shortTimeOff') {
                shortTimeOffDisabled = true;
            }
            return;
        }

        const punchRow = parsePunchLine(cleaned, index);
        if (punchRow) {
            punchRows.push(punchRow);
            return;
        }

        if (section === 'shortTimeOff' && !shortTimeOffDisabled) {
            const shortRow = parseShortTimeOffLine(cleaned, index);
            if (shortRow) {
                shortTimeOffEntries.push(shortRow);
            }
        }
    });

    const detectedDate = extractDetectedDate(lines) || null;
    const parsed = buildSessionStats(punchRows);

    const shortTimeOffMinutes = shortTimeOffEntries.reduce((total, row) => total + (Number(row.minutes) || 0), 0);

    return {
        detectedDate,
        events: parsed.events,
        sessions: parsed.sessions,
        breaks: parsed.breaks,
        anomalies: parsed.anomalies,
        blankApproverRemarks: parsed.blankApproverRemarks,
        sessionCount: parsed.sessionCount,
        totalWorkMinutes: parsed.totalWorkMinutes,
        totalOutMinutes: parsed.totalOutMinutes,
        shortTimeOffMinutes,
        shortTimeOffEntries,
        punchCount: parsed.events.length,
        hasPunchRows: parsed.events.length > 0
    };
}

export function buildCleanAttendanceLog(rawTextOrParsed) {
    const parsed = typeof rawTextOrParsed === 'string'
        ? parseAttendanceLogInput(rawTextOrParsed)
        : rawTextOrParsed;

    if (!parsed || (!parsed.events?.length && !parsed.shortTimeOffEntries?.length)) return '';

    const lines = [];
    if (parsed.events?.length) {
        lines.push('Daily In Out Punch');
        parsed.events
            .slice()
            .sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return (a.minutes || 0) - (b.minutes || 0);
            })
            .forEach((event) => {
                const time = event.rawTime || event.time24 || event.displayTime || '00:00';
                const machine = cleanText(event.machine || '');
                const machineSuffix = machine ? `\t${machine}` : '';
                lines.push(`${event.date}\t${time}\t${event.type}${machineSuffix}`);
            });
    }

    if (Array.isArray(parsed.shortTimeOffEntries) && parsed.shortTimeOffEntries.length > 0) {
        lines.push('Short Time-Off');
        parsed.shortTimeOffEntries.forEach((row) => {
            lines.push(`${row.appDate}\t${row.requestDate}\t${row.requestType}\t${row.minutes}`);
        });
    }

    return lines.join('\n');
}

/**
 * Fallback for single-line portal summaries:
 * Planned In, Planned Out, Actual In, Actual Out (+ optional break hours).
 */
export function parsePortalSummaryTimes(rawText) {
    const text = String(rawText || '');
    const timeMatches = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/gi);
    if (!timeMatches || timeMatches.length < 4) return null;

    const inMinutes = toMinutes(timeMatches[2]);
    const outMinutes = toMinutes(timeMatches[3]);
    if (inMinutes == null || outMinutes == null) return null;

    const durationMatches = text.match(/\b(\d+\.\d{2})\b/g);
    let totalBreak = 45;
    if (durationMatches && durationMatches.length >= 3) {
        const breakHours = Number.parseFloat(durationMatches[durationMatches.length - 1]);
        if (Number.isFinite(breakHours) && breakHours < 12) {
            totalBreak = Math.round(breakHours * 60);
        }
    }

    return {
        startTime: to24HourString(inMinutes),
        lastOutTime: to24HourString(outMinutes),
        totalBreak,
        shortTimeOffMinutes: 0,
    };
}

/**
 * Apply parsed attendance data to edit-form style fields.
 */
export function applyParsedLogToEditValues(parsed, fallbackSummaryText = '') {
    if (parsed?.hasPunchRows && parsed.punchCount >= 2) {
        const firstIn = parsed.events.find((event) => event.type === 'IN');
        const lastOut = [...parsed.events].reverse().find((event) => event.type === 'OUT');
        const totalBreak = Number.isFinite(parsed.totalOutMinutes) ? parsed.totalOutMinutes : 0;

        return {
            startTime: firstIn?.time24 || null,
            lastOutTime: lastOut?.time24 || null,
            totalBreak: String(totalBreak),
            shortTimeOffMinutes: parsed.shortTimeOffMinutes || 0,
            shortTimeOffEntries: parsed.shortTimeOffEntries || [],
            logInput: buildCleanAttendanceLog(parsed),
            source: 'punch-log',
        };
    }

    const summary = parsePortalSummaryTimes(fallbackSummaryText);
    if (!summary) return null;

    return {
        ...summary,
        totalBreak: String(summary.totalBreak),
        shortTimeOffEntries: [],
        logInput: '',
        source: 'summary',
    };
}
