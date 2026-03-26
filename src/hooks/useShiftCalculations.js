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

        const fullDayMins = startMinutes + fullDayDuration;
        const fullDayAdjustedMins = fullDayMins + extraChargeableBreakMinutes;
        
        const halfDayMins = startMinutes + halfDayDuration;
        const halfDayAdjustedMins = halfDayMins + extraChargeableBreakMinutes;
        
        const shortLeaveMins = startMinutes + shortLeaveDuration;
        const shortLeaveAdjustedMins = shortLeaveMins + extraChargeableBreakMinutes;

        return {
            fullDay: minutesToTime(fullDayMins, use24Hour),
            fullDayMinutes: fullDayMins,
            fullDayAdjusted: minutesToTime(fullDayAdjustedMins, use24Hour),
            fullDayAdjustedMinutes: fullDayAdjustedMins,

            halfDay: minutesToTime(halfDayMins, use24Hour),
            halfDayMinutes: halfDayMins,
            halfDayAdjusted: minutesToTime(halfDayAdjustedMins, use24Hour),
            halfDayAdjustedMinutes: halfDayAdjustedMins,

            shortLeave: minutesToTime(shortLeaveMins, use24Hour),
            shortLeaveMinutes: shortLeaveMins,
            shortLeaveAdjusted: minutesToTime(shortLeaveAdjustedMins, use24Hour),
            shortLeaveAdjustedMinutes: shortLeaveAdjustedMins,

            includedBreakAllowanceMinutes: INCLUDED_BREAK_ALLOWANCE_MINUTES,
            extraChargeableBreakMinutes,
            totalFullDayDurationMinutes: fullDayDuration,
            totalHalfDayDurationMinutes: halfDayDuration,
            totalShortLeaveDurationMinutes: shortLeaveDuration,
            startMinutes
        };
    }, [startMinutes, fullDayDuration, use24Hour, extraBreakMinutes, minutesToTime]);

    return shiftDetails;
};
