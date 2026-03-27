import { useMemo } from 'react';
import { useTimeHelpers } from './useTimeHelpers';
import { getLeaveForDate, LEAVE_TYPES } from '../utils/leaveHistory';

export const useShiftCalculations = (
    startTime,
    fullDayDuration = 540,
    use24Hour = false,
    extraBreakMinutes = 0,
    date = null
) => {
    const { timeToMinutes, minutesToTime } = useTimeHelpers();
    const INCLUDED_BREAK_ALLOWANCE_MINUTES = 60;

    const startMinutes = useMemo(() => timeToMinutes(startTime), [startTime, timeToMinutes]);

    const shiftDetails = useMemo(() => {
        const extraChargeableBreakMinutes = Math.max(extraBreakMinutes - INCLUDED_BREAK_ALLOWANCE_MINUTES, 0);

        // Get leave info for the current context
        const leave = date ? getLeaveForDate(date) : null;

        // Determine which target key should be auto-selected (always fullDay due to virtual start)
        const detectedTargetKey = 'fullDay';

        const fullDayMins = startMinutes + fullDayDuration;
        const fullDayAdjustedMins = fullDayMins + extraChargeableBreakMinutes;

        return {
            activeTargetLabel: leave ? (leave.type === LEAVE_TYPES.FULL ? 'Full Leave' : 'Leave Applied') : 'Full Day',
            activeTargetAdjusted: minutesToTime(fullDayAdjustedMins, use24Hour),
            activeTargetAdjustedMinutes: fullDayAdjustedMins,
            detectedTargetKey,

            fullDay: minutesToTime(fullDayMins, use24Hour),
            fullDayMinutes: fullDayMins,
            fullDayAdjusted: minutesToTime(fullDayAdjustedMins, use24Hour),
            fullDayAdjustedMinutes: fullDayAdjustedMins,

            includedBreakAllowanceMinutes: INCLUDED_BREAK_ALLOWANCE_MINUTES,
            extraChargeableBreakMinutes,
            totalFullDayDurationMinutes: fullDayDuration,
            startMinutes,
            isFullLeave: leave?.type === LEAVE_TYPES.FULL,
            leaveMinutes: leave ? (leave.type === LEAVE_TYPES.FULL ? fullDayDuration : (leave.type.includes('Half') ? fullDayDuration / 2 : leave.durationMinutes)) : 0
        };
    }, [startMinutes, fullDayDuration, use24Hour, extraBreakMinutes, minutesToTime, date]);

    return shiftDetails;
};
