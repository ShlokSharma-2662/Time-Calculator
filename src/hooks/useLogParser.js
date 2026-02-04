import { useMemo } from 'react';
import { useTimeHelpers } from './useTimeHelpers';

const LOG_REGEX = /(\d{1,2}:\d{2})\s*(AM|PM)?\s*(IN|OUT)/gi;

export const useLogParser = (logInput, use24Hour = false) => {
    const { minutesToTime } = useTimeHelpers();

    return useMemo(() => {
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
                id: Math.random().toString(36).substr(2, 9),
                minutes: h * 60 + min,
                // We defer displayTime formatting to here to respect the global format setting
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
        const lastOut = [...parsedEvents].reverse().find(e => e.type === 'OUT');

        let netWork = 0;
        if (firstIn && lastOut) {
            const totalDuration = lastOut.minutes - firstIn.minutes;
            netWork = totalDuration - totalOut;
        }

        return {
            events: parsedEvents,
            breaks: computedBreaks,
            totalOutTime: totalOut,
            // Auto-start time always returns in 24h format for the input[type="time"]
            autoStartTime: firstIn ? minutesToTime(firstIn.minutes, true) : null,
            effectiveWorkTime: netWork > 0 ? netWork : 0,
            firstInTime: firstIn ? firstIn.displayTime : null,
            lastOutTime: lastOut ? lastOut.displayTime : null
        };
    }, [logInput, use24Hour, minutesToTime]);
};
