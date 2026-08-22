import { describe, it, expect } from 'vitest';
import { getLocalISODate, shiftLocalISODate, resolveEffectiveWorkDate } from '../src/utils/dateUtils.js';

describe('dateUtils work date helpers', () => {
  it('formats a local calendar date without UTC shift', () => {
    expect(getLocalISODate(new Date(2026, 7, 22, 0, 30))).toBe('2026-08-22');
    expect(getLocalISODate(new Date(2026, 7, 22, 23, 30))).toBe('2026-08-22');
  });

  it('shifts a local ISO date by whole days', () => {
    expect(shiftLocalISODate('2026-08-22', -1)).toBe('2026-08-21');
    expect(shiftLocalISODate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('prefers the pasted log date over the picker', () => {
    expect(resolveEffectiveWorkDate('2026-07-30', '2026-08-22', '2026-08-22')).toBe('2026-07-30');
    expect(resolveEffectiveWorkDate(null, '2026-08-21', '2026-08-22')).toBe('2026-08-21');
    expect(resolveEffectiveWorkDate(null, null, '2026-08-22')).toBe('2026-08-22');
  });
});
