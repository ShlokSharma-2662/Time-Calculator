import { describe, it, expect } from 'vitest';
import { getTargetWorkMinutes } from '../src/hooks/useShiftCalculations.js';

describe('getTargetWorkMinutes', () => {
  it('uses the full shift, half of it, or 90 minutes short', () => {
    expect(getTargetWorkMinutes(540, 'fullDay')).toBe(540);
    expect(getTargetWorkMinutes(540, 'halfDay')).toBe(270);
    expect(getTargetWorkMinutes(540, 'shortLeave')).toBe(450);
  });
});
