/**
 * Calculate accrual based on months passed
 * @param {string} startDateString - e.g., '2025-04-01'
 * @param {string} endDateString - e.g., current date
 * @param {number} rate - default 1.75
 * @returns {number} Accrued leaves
 */
export function calculateMonthlyAccrual(startDateString, endDateString, rate = 1.75) {
  const start = new Date(startDateString);
  const end = new Date(endDateString);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  const years = end.getFullYear() - start.getFullYear();
  const months = (years * 12) + (end.getMonth() - start.getMonth());

  // Increment month count by 1 to include the month in progress
  // (e.g. Apr 2025 to Mar 2026 should be 12 months)
  const effectiveMonths = months + 1;

  return Number((effectiveMonths * rate).toFixed(2));
}
