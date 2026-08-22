import { useMemo } from 'react';
import { useTimeHelpers } from './useTimeHelpers';
import { LEAVE_TYPES } from '../utils/leaveHistory';
import { parseAttendanceLogInput } from '../utils/attendanceLogParser';
import { normalizeDate, resolveEffectiveWorkDate } from '../utils/dateUtils';

const LOG_REGEX = /(\d{1,2}:\d{2})\s*(AM|PM)?\s*(IN|OUT)/gi;
const DATE_REGEX = /(\d{4}-\d{2}-\d{2})|(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4})|(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/g;

const getLeaveMinutes = (leave) => {
    if (!leave) return 0;
    if (leave.type === LEAVE_TYPES.FULL) return 540; // 9h
    if (leave.type && (leave.type === LEAVE_TYPES.HALF_1 || leave.type === LEAVE_TYPES.HALF_2 || leave.type.includes('Half'))) return 270; // 4.5h
    if (leave.type === LEAVE_TYPES.SHORT) return leave.durationMinutes || 0;
    return 0;
};

const buildFallbackPairs = (parsedEvents) => {
    const computedBreaks = [];
    const sessions = [];
    const openIn = [];
    let sessionCount = 0;
    let totalSessionMinutes = 0;
    let dayOffset = 0;
    let previousRawMinutes = null;

    const absoluteEvents = parsedEvents.map((event, index) => {
        const rawMinutes = event.minutes;
        if (previousRawMinutes !== null && rawMinutes < previousRawMinutes - 180) {
            dayOffset += 24 * 60;
        }

        const absoluteMinutes = rawMinutes + dayOffset;
        previousRawMinutes = rawMinutes;

        return {
            ...event,
            absoluteMinutes,
            sortIndex: index,
        };
    });

    for (let i = 0; i < absoluteEvents.length - 1; i++) {
        const current = absoluteEvents[i];
        const next = absoluteEvents[i + 1];

        if (current.type === 'IN') {
            openIn.push(current);
            continue;
        }

        if (current.type === 'OUT') {
            const pairIn = openIn.shift();
            if (!pairIn) continue;
            const diff = current.absoluteMinutes - pairIn.absoluteMinutes;
            if (diff > 0) {
                sessions.push({
                    start: pairIn.displayTime,
                    end: current.displayTime,
                    startMinutes: pairIn.minutes,
                    endMinutes: current.minutes,
                    durationMinutes: diff,
                    startMachine: pairIn.machine || 'Unknown',
                    endMachine: current.machine || pairIn.machine || 'Unknown',
                });
                sessionCount += 1;
                totalSessionMinutes += diff;
            }
        }

        if (current.type === 'OUT' && next.type === 'IN') {
            const diff = next.absoluteMinutes - current.absoluteMinutes;
            if (diff > 0) {
                computedBreaks.push({
                    start: absoluteEvents[i].displayTime,
                    end: next.displayTime,
                    duration: diff,
                });
            }
        }
    }

    const lastEvent = absoluteEvents[absoluteEvents.length - 1];
    return {
        computedBreaks,
        sessions,
        sessionCount,
        totalSessionMinutes,
        absoluteEvents,
        lastEvent,
    };
};

const getBreakMinutesToTime = (events, cutoffMinutes) => {
    if (!Array.isArray(events) || events.length === 0) return 0;

    let breakMinutes = 0;
    for (let i = 0; i < events.length - 1; i++) {
        const current = events[i];
        const next = events[i + 1];
        if (current.type !== 'OUT' || next.type !== 'IN') continue;

        if (current.absoluteMinutes >= cutoffMinutes) break;
        breakMinutes += Math.max(0, Math.min(next.absoluteMinutes, cutoffMinutes) - current.absoluteMinutes);
    }

    const lastEvent = events[events.length - 1];
    if (lastEvent.type === 'OUT' && lastEvent.absoluteMinutes < cutoffMinutes) {
        breakMinutes += cutoffMinutes - lastEvent.absoluteMinutes;
    }

    return breakMinutes;
};

const getCurrentAbsoluteMinutes = (events, currentTimeMinutes, detectedDate, today) => {
    if (!Array.isArray(events) || events.length === 0) return currentTimeMinutes;
    if (detectedDate !== today) return currentTimeMinutes;

    const spansMidnight = events.some((event) => (event.absoluteMinutes || 0) >= 1440);
    if (!spansMidnight) return currentTimeMinutes;

    const first = events[0];
    const firstRaw = first?.minutes || 0;
    if (currentTimeMinutes < firstRaw) {
        return currentTimeMinutes + 24 * 60;
    }

    return currentTimeMinutes;
};

export const useLogParser = (logInput, use24Hour = false, currentTimeMinutes = 0, startTimeMinutes = null, today = null, leave = null, workDate = null) => {
    const { minutesToTime } = useTimeHelpers();

    return useMemo(() => {
        const parsedReport = parseAttendanceLogInput(logInput);
        const dateMatch = !parsedReport.detectedDate ? logInput.match(DATE_REGEX) : null;
        const logDetectedDate = parsedReport.detectedDate || (dateMatch ? normalizeDate(dateMatch[0]) : null);
        const detectedDate = resolveEffectiveWorkDate(logDetectedDate, workDate, today);
        const isHistorical = Boolean(detectedDate && today && detectedDate !== today);

        if (parsedReport.hasPunchRows && parsedReport.punchCount >= 2) {
            const parsedEvents = parsedReport.events.map((event) => ({
                id: `${event.type}-${event.absoluteMinutes}-${event.lineNumber}`,
                minutes: event.minutes,
                displayTime: event.displayTime,
                type: event.type,
                machine: event.machine,
                approverRemark: event.approverRemark,
                absoluteMinutes: event.absoluteMinutes,
            }));

            const absoluteEvents = parsedEvents
                .slice()
                .sort((a, b) => (a.absoluteMinutes || 0) - (b.absoluteMinutes || 0));
            const firstIn = absoluteEvents.find((event) => event.type === 'IN');
            const firstInAbsoluteMinutes = firstIn ? firstIn.absoluteMinutes : null;
            const currentAbsoluteTime = getCurrentAbsoluteMinutes(absoluteEvents, currentTimeMinutes, detectedDate, today);

            const lastEvent = absoluteEvents[absoluteEvents.length - 1];
            const lastOut = [...absoluteEvents].reverse().find((event) => event.type === 'OUT');
            const totalOutToCurrent = isHistorical
                ? parsedReport.totalOutMinutes
                : getBreakMinutesToTime(absoluteEvents, currentAbsoluteTime);

            let realTimeWork = 0;
            if (!isHistorical) {
                if (firstIn && currentAbsoluteTime > firstInAbsoluteMinutes) {
                    const totalOutToNow = getBreakMinutesToTime(absoluteEvents, currentAbsoluteTime);
                    realTimeWork = currentAbsoluteTime - firstInAbsoluteMinutes - totalOutToNow;
                } else if (!firstIn && startTimeMinutes !== null && currentTimeMinutes > startTimeMinutes) {
                    realTimeWork = currentTimeMinutes - startTimeMinutes;
                }
            } else {
                realTimeWork = parsedReport.totalWorkMinutes;
            }

            if (realTimeWork < 0) realTimeWork = 0;

            const parsedLeaveMinutes = getLeaveMinutes(leave);
            const shortTimeOffMinutes = Number(parsedReport.shortTimeOffMinutes) || 0;
            const leaveMinutes = parsedLeaveMinutes + shortTimeOffMinutes;

            const effectiveWorkWithLeave = realTimeWork + leaveMinutes;
            const realTimeWithLeave = realTimeWork + leaveMinutes;

            let virtualFirstInTime = firstIn ? firstIn.displayTime : (leave?.type === LEAVE_TYPES.FULL ? minutesToTime(startTimeMinutes || 540, use24Hour) : null);

            if (leave && leave.type === LEAVE_TYPES.HALF_1) {
                // Priority: Configured Start Time > 8:01 AM (fallback)
                const effectiveStartMins = (startTimeMinutes !== null) ? startTimeMinutes : 481;
                virtualFirstInTime = minutesToTime(effectiveStartMins, use24Hour);
            } else if (leave && leave.type === LEAVE_TYPES.FULL) {
                virtualFirstInTime = minutesToTime(startTimeMinutes || 540, use24Hour);
            }

            return {
                events: absoluteEvents,
                breaks: parsedReport.breaks,
                totalOutTime: totalOutToCurrent,
                sessions: parsedReport.sessions,
                sessionCount: parsedReport.sessionCount,
                totalSessionMinutes: parsedReport.totalWorkMinutes,
                totalOutMinutes: parsedReport.totalOutMinutes,
                autoStartTime: firstIn ? minutesToTime(firstIn.minutes, true) : null,
                effectiveWorkTime: effectiveWorkWithLeave,
                realTimeEffectiveWork: realTimeWithLeave,
                firstInTime: virtualFirstInTime,
                lastOutTime: lastOut ? lastOut.displayTime : null,
                isCurrentlyOut: lastEvent ? lastEvent.type === 'OUT' : false,
                detectedDate,
                logDetectedDate,
                isHistorical,
                currentTimeMinutes,
                leaveMinutes,
                shortTimeOffMinutes,
                shortTimeOffEntries: parsedReport.shortTimeOffEntries,
                anomalies: parsedReport.anomalies,
                blankApproverRemarks: parsedReport.blankApproverRemarks,
            };
        }

        const matches = [...logInput.matchAll(LOG_REGEX)];
        const parsedEvents = [];
        for (const m of matches) {
            const timeStr = m[1];
            const ampm = m[2];
            const type = m[3].toUpperCase();

            let [h, min] = timeStr.split(':').map(Number);
            if (ampm) {
                const isPM = ampm.toUpperCase() === 'PM';
                if (isPM && h !== 12) h += 12;
                if (!isPM && h === 12) h = 0;
            }

            parsedEvents.push({
                id: `${type}-${h * 60 + min}-${parsedEvents.length}`,
                minutes: h * 60 + min,
                displayTime: minutesToTime(h * 60 + min, use24Hour),
                type: type
            });
        }

        const {
            computedBreaks,
            sessions,
            sessionCount,
            totalSessionMinutes,
            absoluteEvents,
            lastEvent,
        } = buildFallbackPairs(parsedEvents);

        const totalOut = computedBreaks.reduce((total, current) => total + current.duration, 0);

        const firstIn = absoluteEvents.find((e) => e.type === 'IN');
        const firstInAbsoluteMinutes = firstIn ? firstIn.absoluteMinutes : null;
        const lastOut = [...absoluteEvents].reverse().find(e => e.type === 'OUT');
        const currentAbsoluteTime = getCurrentAbsoluteMinutes(absoluteEvents, currentTimeMinutes, detectedDate, today);
        const totalOutToCurrent = isHistorical
            ? totalOut
            : getBreakMinutesToTime(absoluteEvents, currentAbsoluteTime);

        let netWork = 0;
        if (firstIn && lastOut) {
            const totalDuration = lastOut.absoluteMinutes - firstInAbsoluteMinutes;
            netWork = totalDuration - getBreakMinutesToTime(absoluteEvents, lastOut.absoluteMinutes);
        }

        // Calculate real-time effective work up to 'now'
        let realTimeWork = 0;
        if (!isHistorical) {
            if (firstIn && currentAbsoluteTime > firstInAbsoluteMinutes) {
                const totalOutToNow = getBreakMinutesToTime(absoluteEvents, currentAbsoluteTime);
                realTimeWork = currentAbsoluteTime - firstInAbsoluteMinutes - totalOutToNow;
            } else if (!firstIn && startTimeMinutes !== null && currentTimeMinutes > startTimeMinutes) {
                realTimeWork = currentTimeMinutes - startTimeMinutes;
            }
        } else {
            // For historical logs, realTimeWork IS the completed netWork
            realTimeWork = netWork;
        }

        const parsedLeaveMinutes = getLeaveMinutes(leave);
        const baseWork = Math.max(0, realTimeWork);
        const effectiveWorkWithLeave = baseWork + parsedLeaveMinutes;
        const realTimeWithLeave = baseWork + parsedLeaveMinutes;

        // Virtual Shift Start (if 1st half leave)
        let virtualFirstInTime = firstIn ? firstIn.displayTime : (leave?.type === LEAVE_TYPES.FULL ? minutesToTime(startTimeMinutes || 540, use24Hour) : null);

        if (leave && leave.type === LEAVE_TYPES.HALF_1) {
            // Priority: Configured Start Time > 8:01 AM (fallback)
            const effectiveStartMins = (startTimeMinutes !== null) ? startTimeMinutes : 481;
            virtualFirstInTime = minutesToTime(effectiveStartMins, use24Hour);
        } else if (leave && leave.type === LEAVE_TYPES.FULL) {
            virtualFirstInTime = minutesToTime(startTimeMinutes || 540, use24Hour);
        }

        return {
            events: absoluteEvents,
            breaks: computedBreaks,
            sessions,
            sessionCount,
            totalSessionMinutes,
            totalOutTime: totalOutToCurrent,
            autoStartTime: firstIn ? minutesToTime(firstIn.minutes, true) : null,
            effectiveWorkTime: effectiveWorkWithLeave,
            realTimeEffectiveWork: realTimeWithLeave,
            firstInTime: virtualFirstInTime,
            lastOutTime: lastOut ? lastOut.displayTime : null,
            isCurrentlyOut: lastEvent ? lastEvent.type === 'OUT' : false,
            detectedDate,
            logDetectedDate,
            isHistorical,
            currentTimeMinutes,
            leaveMinutes: parsedLeaveMinutes,
            shortTimeOffMinutes: 0,
            shortTimeOffEntries: [],
            anomalies: [],
            blankApproverRemarks: []
        };
    }, [logInput, use24Hour, minutesToTime, currentTimeMinutes, startTimeMinutes, today, leave, workDate]);
};
