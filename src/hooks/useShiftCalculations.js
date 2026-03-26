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
        const halfDayDuration = Math.floor(fullDayDuration / 2);
        const shortLeaveDuration = Math.max(fullDayDuration - 90, 0);
        const extraChargeableBreakMinutes = Math.max(extraBreakMinutes - INCLUDED_BREAK_ALLOWANCE_MINUTES, 0);

        return {
            fullDay: minutesToTime(startMinutes + fullDayDuration, use24Hour),
            fullDayAdjusted: minutesToTime(startMinutes + fullDayDuration + extraChargeableBreakMinutes, use24Hour),

            halfDay: minutesToTime(startMinutes + halfDayDuration, use24Hour),
            halfDayAdjusted: minutesToTime(startMinutes + halfDayDuration + extraChargeableBreakMinutes, use24Hour),

            shortLeave: minutesToTime(startMinutes + shortLeaveDuration, use24Hour),
            shortLeaveAdjusted: minutesToTime(startMinutes + shortLeaveDuration + extraChargeableBreakMinutes, use24Hour),

            includedBreakAllowanceMinutes: INCLUDED_BREAK_ALLOWANCE_MINUTES,
            extraChargeableBreakMinutes,
            fullDayDurationMinutes: fullDayDuration,
            halfDayDurationMinutes: halfDayDuration,
            shortLeaveDurationMinutes: shortLeaveDuration,
            startMinutes
        };
    }, [startMinutes, fullDayDuration, use24Hour, extraBreakMinutes, minutesToTime]);

    return shiftDetails;
};
