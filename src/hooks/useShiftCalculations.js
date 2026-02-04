import { useMemo } from 'react';
import { useTimeHelpers } from './useTimeHelpers';

export const useShiftCalculations = (startTime, fullDayDuration = 540, use24Hour = false) => {
    const { timeToMinutes, minutesToTime } = useTimeHelpers();

    const startMinutes = useMemo(() => timeToMinutes(startTime), [startTime, timeToMinutes]);

    const shiftDetails = useMemo(() => {
        // Half day is typically half of the full duration
        const halfDayDuration = Math.floor(fullDayDuration / 2);
        // Short leave is typically full day - 90 minutes (can be made configurable later)
        const shortLeaveDuration = fullDayDuration - 90;

        return {
            fullDay: minutesToTime(startMinutes + fullDayDuration, use24Hour),
            halfDay: minutesToTime(startMinutes + halfDayDuration, use24Hour),
            shortLeave: minutesToTime(startMinutes + shortLeaveDuration, use24Hour),
        };
    }, [startMinutes, fullDayDuration, use24Hour, minutesToTime]);

    return shiftDetails;
};
