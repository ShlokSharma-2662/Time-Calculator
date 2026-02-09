/**
 * Helper functions for EL (Earned Leave) Encashment Calculations
 * FY 2025-26
 */

/**
 * Calculate closing balance of EL
 * @param {number} openingBalance - EL balance as of April 1, 2025
 * @param {number} earnedEL - EL earned during FY 2025-26
 * @param {number} availedEL - EL availed during FY 2025-26
 * @returns {number} Closing balance
 */
export function calculateClosingBalance(openingBalance, earnedEL, availedEL) {
  const opening = Number(openingBalance) || 0;
  const earned = Number(earnedEL) || 0;
  const availed = Number(availedEL) || 0;
  
  return opening + earned - availed;
}

/**
 * Calculate encashable EL amount
 * @param {number} closingBalance - Closing EL balance
 * @param {number} maxCarryForward - Maximum EL that can be carried forward (typically 300 days)
 * @returns {number} Encashable EL (0 if closing balance is below max carry forward)
 */
export function calculateEncashable(closingBalance, maxCarryForward) {
  const closing = Number(closingBalance) || 0;
  const maxCarry = Number(maxCarryForward) || 300;
  
  const encashable = closing - maxCarry;
  return encashable > 0 ? encashable : 0;
}

/**
 * Validate EL input values
 * @param {number} openingBalance 
 * @param {number} earnedEL 
 * @param {number} availedEL 
 * @param {number} maxCarryForward 
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateELInputs(openingBalance, earnedEL, availedEL, maxCarryForward) {
  const errors = [];
  
  if (openingBalance < 0) {
    errors.push('Opening balance cannot be negative');
  }
  
  if (earnedEL < 0) {
    errors.push('Earned EL cannot be negative');
  }
  
  if (availedEL < 0) {
    errors.push('Availed EL cannot be negative');
  }
  
  if (maxCarryForward < 0) {
    errors.push('Max carry forward cannot be negative');
  }
  
  const closing = calculateClosingBalance(openingBalance, earnedEL, availedEL);
  if (closing < 0) {
    errors.push('Closing balance cannot be negative (availed EL exceeds available EL)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate complete EL encashment details
 * @param {number} openingBalance 
 * @param {number} earnedEL 
 * @param {number} availedEL 
 * @param {number} maxCarryForward 
 * @returns {Object} Complete calculation results or validation errors
 */
export function calculateELEncashment(openingBalance, earnedEL, availedEL, maxCarryForward = 300) {
  const validation = validateELInputs(openingBalance, earnedEL, availedEL, maxCarryForward);
  
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors
    };
  }
  
  const closingBalance = calculateClosingBalance(openingBalance, earnedEL, availedEL);
  const encashableEL = calculateEncashable(closingBalance, maxCarryForward);
  const carryForward = closingBalance - encashableEL;
  
  return {
    success: true,
    closingBalance,
    encashableEL,
    carryForward,
    maxCarryForward
  };
}
