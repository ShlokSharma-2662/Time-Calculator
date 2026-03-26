import { useMemo } from 'react';
import { useTimeHelpers } from './useTimeHelpers';

const LOG_REGEX = /(\d{1,2}:\d{2})\s*(AM|PM)?\s*(IN|OUT)/gi;

export const useLogParser = (logInput, use24Hour = false, currentTimeMinutes = 0) => {
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
        const lastEvent = parsedEvents[parsedEvents.length - 1];
        const lastOut = [...parsedEvents].reverse().find(e => e.type === 'OUT');

        let netWork = 0;
        if (firstIn && lastOut) {
            const totalDuration = lastOut.minutes - firstIn.minutes;
            netWork = totalDuration - totalOut;
        }

        // Calculate real-time effective work up to 'now'
        let realTimeWork = 0;
        if (firstIn && currentTimeMinutes > firstIn.minutes) {
            // If currently IN, duration is (Now - FirstIn) - Breaks
            // If currently OUT, duration is (LastOut - FirstIn) - Breaks + (Now - LastOut) ?? 
            // Usually, "Effective Work" only counts when you are IN.
            // But if the user wants "Effective Work from 1st in time to current time", 
            // we should probably follow the clock: (CurrentTime - FirstIn) - TotalBreaksSoFar

            // If currently OUT, we should also subtract the ongoing break
            let activeBreakMinutes = 0;
            if (lastEvent && lastEvent.type === 'OUT' && currentTimeMinutes > lastEvent.minutes) {
                activeBreakMinutes = currentTimeMinutes - lastEvent.minutes;
            }

            realTimeWork = (currentTimeMinutes - firstIn.minutes) - totalOut - activeBreakMinutes;
        }

        return {
            events: parsedEvents,
            breaks: computedBreaks,
            totalOutTime: totalOut,
            // Auto-start time always returns in 24h format for the input[type="time"]
            autoStartTime: firstIn ? minutesToTime(firstIn.minutes, true) : null,
            effectiveWorkTime: netWork > 0 ? netWork : 0,
            realTimeEffectiveWork: realTimeWork > 0 ? realTimeWork : 0,
            firstInTime: firstIn ? firstIn.displayTime : null,
            lastOutTime: lastOut ? lastOut.displayTime : null,
            isCurrentlyOut: lastEvent ? lastEvent.type === 'OUT' : false,
            currentTimeMinutes
        };
    }, [logInput, use24Hour, minutesToTime, currentTimeMinutes]);
};
