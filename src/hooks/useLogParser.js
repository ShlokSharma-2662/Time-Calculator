import { useMemo } from 'react';
import { useTimeHelpers } from './useTimeHelpers';
import { LEAVE_TYPES } from '../utils/leaveHistory';
import { parseAttendanceLogInput } from '../utils/attendanceLogParser';

const LOG_REGEX = /(\d{1,2}:\d{2})\s*(AM|PM)?\s*(IN|OUT)/gi;
const DATE_REGEX = /(\d{4}-\d{2}-\d{2})|(\d{1,2}[\/-][A-Za-z]{3}[\/-]\d{2,4})|(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g;

const detectDate = (logInput) => {
    const parsed = parseAttendanceLogInput(logInput);
    if (parsed.detectedDate) return parsed.detectedDate;
    const dateMatch = logInput.match(DATE_REGEX);
    return dateMatch ? dateMatch[0] : null;
};

const getLeaveMinutes = (leave) => {
    if (!leave) return 0;
    if (leave.type === LEAVE_TYPES.FULL) return 540; // 9h
    if (leave.type && (leave.type === LEAVE_TYPES.HALF_1 || leave.type === LEAVE_TYPES.HALF_2 || leave.type.includes('Half'))) return 270; // 4.5h
    if (leave.type === LEAVE_TYPES.SHORT) return leave.durationMinutes || 0;
    return 0;
};

const buildFallbackPairs = (parsedEvents) => {
    const computedBreaks = [];
    const openIn = [];
    let sessionCount = 0;
    let totalSessionMinutes = 0;

    for (let i = 0; i < parsedEvents.length - 1; i++) {
        const current = parsedEvents[i];
        if (current.type === 'IN') {
            openIn.push(current);
            continue;
        }

        if (current.type === 'OUT') {
            const pairIn = openIn.shift();
            if (!pairIn) continue;
            const diff = current.minutes - pairIn.minutes;
            if (diff > 0) {
                sessionCount += 1;
                totalSessionMinutes += diff;
            }
        }

        if (current.type === 'OUT' && parsedEvents[i + 1].type === 'IN') {
            const diff = parsedEvents[i + 1].minutes - current.minutes;
            if (diff > 0) {
                computedBreaks.push({
                    start: parsedEvents[i].displayTime,
                    end: parsedEvents[i + 1].displayTime,
                    duration: diff
                });
            }
        }
    }

    return { computedBreaks, sessionCount, totalSessionMinutes };
};

export const useLogParser = (logInput, use24Hour = false, currentTimeMinutes = 0, startTimeMinutes = null, today = null, leave = null) => {
    const { minutesToTime } = useTimeHelpers();

    return useMemo(() => {
        const parsedReport = parseAttendanceLogInput(logInput);
        const detectedDate = detectDate(logInput);
        const isHistorical = detectedDate && today && detectedDate !== today;

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

            const firstIn = parsedReport.events.find((event) => event.type === 'IN');
            const lastEvent = parsedEvents[parsedEvents.length - 1];
            const lastOut = [...parsedEvents].reverse().find((event) => event.type === 'OUT');

            let realTimeWork = 0;
            if (!isHistorical) {
                if (firstIn && currentTimeMinutes > firstIn.minutes) {
                    let activeBreakMinutes = 0;
                    if (lastEvent && lastEvent.type === 'OUT' && currentTimeMinutes > lastEvent.minutes) {
                        activeBreakMinutes = currentTimeMinutes - lastEvent.minutes;
                    }
                    realTimeWork = (currentTimeMinutes - firstIn.minutes) - parsedReport.totalOutMinutes - activeBreakMinutes;
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
                events: parsedEvents,
                breaks: parsedReport.breaks,
                totalOutTime: parsedReport.totalOutMinutes,
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
        parsedEvents.sort((a, b) => a.minutes - b.minutes);

        const { computedBreaks, sessionCount, totalSessionMinutes } = buildFallbackPairs(parsedEvents);
        const totalOut = computedBreaks.reduce((total, current) => total + current.duration, 0);

        const firstIn = parsedEvents.find(e => e.type === 'IN');
        const lastEvent = parsedEvents[parsedEvents.length - 1];
        const lastOut = [...parsedEvents].reverse().find(e => e.type === 'OUT');

        let netWork = 0;
        if (firstIn && lastOut) {
            const totalDuration = lastOut.minutes - firstIn.minutes;
            netWork = totalDuration - totalOut;
        }

        // Calculate real-time effective work up to 'now'
        let realTimeWork = 0;
        if (!isHistorical) {
            if (firstIn && currentTimeMinutes > firstIn.minutes) {
                let activeBreakMinutes = 0;
                if (lastEvent && lastEvent.type === 'OUT' && currentTimeMinutes > lastEvent.minutes) {
                    activeBreakMinutes = currentTimeMinutes - lastEvent.minutes;
                }
                realTimeWork = (currentTimeMinutes - firstIn.minutes) - totalOut - activeBreakMinutes;
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
            events: parsedEvents,
            breaks: computedBreaks,
            sessions: [],
            sessionCount,
            totalSessionMinutes,
            totalOutTime: totalOut,
            autoStartTime: firstIn ? minutesToTime(firstIn.minutes, true) : null,
            effectiveWorkTime: effectiveWorkWithLeave,
            realTimeEffectiveWork: realTimeWithLeave,
            firstInTime: virtualFirstInTime,
            lastOutTime: lastOut ? lastOut.displayTime : null,
            isCurrentlyOut: lastEvent ? lastEvent.type === 'OUT' : false,
            detectedDate,
            isHistorical,
            currentTimeMinutes,
            leaveMinutes: parsedLeaveMinutes,
            shortTimeOffMinutes: 0,
            shortTimeOffEntries: [],
            anomalies: [],
            blankApproverRemarks: []
        };
    }, [logInput, use24Hour, minutesToTime, currentTimeMinutes, startTimeMinutes, today, leave]);
};

