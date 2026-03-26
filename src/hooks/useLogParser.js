import { useMemo } from 'react';
import { useTimeHelpers } from './useTimeHelpers';

const LOG_REGEX = /(\d{1,2}:\d{2})\s*(AM|PM)?\s*(IN|OUT)/gi;
const DATE_REGEX = /(\d{4}-\d{2}-\d{2})|(\d{1,2}[\/-][A-Za-z]{3}[\/-]\d{2,4})|(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g;

const MONTH_MAP = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

export const useLogParser = (logInput, use24Hour = false, currentTimeMinutes = 0, startTimeMinutes = null, today = null) => {
    const { minutesToTime } = useTimeHelpers();

    return useMemo(() => {
        // --- Date Detection ---
        let detectedDate = null;
        const dateMatch = logInput.match(DATE_REGEX);
        if (dateMatch) {
            const rawDate = dateMatch[0];
            const parts = rawDate.split(/[-/]/);

            if (parts.length === 3) {
                if (parts[0].length === 4) { // YYYY-MM-DD
                    detectedDate = rawDate;
                } else {
                    let [d, m, y] = parts;
                    if (isNaN(m)) m = MONTH_MAP[m.toLowerCase().substring(0, 3)] || '01';
                    const year = y.length === 2 ? `20${y}` : y;
                    detectedDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
            }
        }

        const isHistorical = detectedDate && today && detectedDate !== today;

        const matches = [...logInput.matchAll(LOG_REGEX)];
        // ... (rest of parsing)
        const parsedEvents = [];
        // ... (skipped for brevity)
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
                id: Math.random().toString(36).substr(2, 9),
                minutes: h * 60 + min,
                displayTime: minutesToTime(h * 60 + min, use24Hour),
                type: type
            });
        }
        parsedEvents.sort((a, b) => a.minutes - b.minutes);

        const computedBreaks = [];
        let totalOut = 0;
        for (let i = 0; i < parsedEvents.length - 1; i++) {
            if (parsedEvents[i].type === 'OUT' && parsedEvents[i + 1].type === 'IN') {
                const diff = parsedEvents[i + 1].minutes - parsedEvents[i].minutes;
                if (diff > 0) {
                    computedBreaks.push({
                        start: parsedEvents[i].displayTime,
                        end: parsedEvents[i + 1].displayTime,
                        duration: diff
                    });
                    totalOut += diff;
                }
            }
        }

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

        return {
            events: parsedEvents,
            breaks: computedBreaks,
            totalOutTime: totalOut,
            autoStartTime: firstIn ? minutesToTime(firstIn.minutes, true) : null,
            effectiveWorkTime: netWork > 0 ? netWork : (realTimeWork > 0 ? realTimeWork : 0),
            realTimeEffectiveWork: realTimeWork > 0 ? realTimeWork : 0,
            firstInTime: firstIn ? firstIn.displayTime : null,
            lastOutTime: lastOut ? lastOut.displayTime : null,
            isCurrentlyOut: lastEvent ? lastEvent.type === 'OUT' : false,
            detectedDate,
            isHistorical,
            currentTimeMinutes
        };
    }, [logInput, use24Hour, minutesToTime, currentTimeMinutes, startTimeMinutes, today]);
};
