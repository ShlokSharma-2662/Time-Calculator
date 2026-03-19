import { useMemo } from 'react';
import { useTimeHelpers } from './useTimeHelpers';

export const useShiftCalculations = (
    startTime,
    fullDayDuration = 540,
    use24Hour = false,
    extraBreakMinutes = 0
) => {
    const { timeToMinutes, minutesToTime } = useTimeHelpers();
    const INCLUDED_BREAK_ALLOWANCE_MINUTES = 60;

    const startMinutes = useMemo(() => timeToMinutes(startTime), [startTime, timeToMinutes]);

    const shiftDetails = useMemo(() => {
        // Half day is typically half of the full duration
        const halfDayDuration = Math.floor(fullDayDuration / 2);
        // Short leave is typically full day - 90 minutes (can be made configurable later)
        const shortLeaveDuration = fullDayDuration - 90;
        const extraChargeableBreakMinutes = Math.max(extraBreakMinutes - INCLUDED_BREAK_ALLOWANCE_MINUTES, 0);

        return {
            fullDay: minutesToTime(startMinutes + fullDayDuration, use24Hour),
            adjustedEnd: minutesToTime(startMinutes + fullDayDuration + extraChargeableBreakMinutes, use24Hour),
            halfDay: minutesToTime(startMinutes + halfDayDuration, use24Hour),
            shortLeave: minutesToTime(startMinutes + shortLeaveDuration, use24Hour),
            includedBreakAllowanceMinutes: INCLUDED_BREAK_ALLOWANCE_MINUTES,
            extraChargeableBreakMinutes,
            fullDayDurationMinutes: fullDayDuration,
        };
    }, [startMinutes, fullDayDuration, use24Hour, extraBreakMinutes, minutesToTime]);

    return shiftDetails;
};
