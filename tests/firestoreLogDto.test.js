import { describe, it, expect } from 'vitest';
import { buildFirestoreLogDto, toHHMM } from '../src/utils/firestoreLogDto.js';

describe('firestoreLogDto', () => {
  it('normalizes AM/PM times to HH:MM', () => {
    expect(toHHMM('9:05 AM')).toBe('09:05');
    expect(toHHMM('12:00 AM')).toBe('00:00');
    expect(toHHMM('12:00 PM')).toBe('12:00');
    expect(toHHMM('06:41 PM')).toBe('18:41');
    expect(toHHMM('18:41')).toBe('18:41');
  });

  it('builds a rules-compliant payload and strips unknown keys', () => {
    const dto = buildFirestoreLogDto('2026-07-30', {
      startTime: '11:10 AM',
      firstInTime: '11:10 AM',
      lastOutTime: '06:41 PM',
      logInput: 'Daily In Out Punch\n...',
      totalOutTime: '45',
      effectiveWorkTime: 400.5,
      shortTimeOffMinutes: 90,
      shortTimeOffEntries: [{
        appDate: '2026-07-30',
        requestDate: '2026-07-30',
        requestType: 'Early Going',
        minutes: 90,
        remark: 'personal',
        lineNumber: 12,
      }],
      activeLeave: {
        type: 'Half Day (1st Half)',
        category: 'EL',
        date: '2026-07-30',
        days: 0.5,
        id: 'should-be-stripped',
        timestamp: 'nope',
      },
      unexpected: 'drop-me',
      raw: null,
    });

    expect(dto.date).toBe('2026-07-30');
    expect(dto.startTime).toBe('11:10');
    expect(dto.firstInTime).toBe('11:10');
    expect(dto.lastOutTime).toBe('18:41');
    expect(dto.totalOutTime).toBe(45);
    expect(dto.effectiveWorkTime).toBe(400.5);
    expect(dto.shortTimeOffMinutes).toBe(90);
    expect(dto.shortTimeOffEntries).toEqual([{
      appDate: '2026-07-30',
      requestDate: '2026-07-30',
      requestType: 'Early Going',
      minutes: 90,
    }]);
    expect(dto.activeLeave).toEqual({
      type: 'Half Day (1st Half)',
      category: 'EL',
      date: '2026-07-30',
      days: 0.5,
    });
    expect(dto).not.toHaveProperty('unexpected');
    expect(dto.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(dto.raw).toBeNull();
  });

  it('rejects invalid dates', () => {
    expect(() => buildFirestoreLogDto('30-Jul-26', {})).toThrow(/Invalid log date/);
  });
});
