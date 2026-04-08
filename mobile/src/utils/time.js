/**
 * Convert "HH:MM" string to total minutes.
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convert total minutes to display string.
 */
export function minutesToTime(totalMinutes, use24Hour = false) {
  if (totalMinutes == null || isNaN(totalMinutes)) return '--:--';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (use24Hour) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Format minutes as "Xh Ym".
 */
export function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes) || minutes <= 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

/**
 * Calculate estimated exit time.
 */
export function getEstimatedExit(firstInTime, shiftDurationMinutes, totalOutTime = 0, use24Hour = false) {
  const startMins = timeToMinutes(firstInTime);
  if (startMins === 0) return '--:--';
  const exitMins = startMins + shiftDurationMinutes + Math.max(totalOutTime - 60, 0);
  return minutesToTime(exitMins, use24Hour);
}
