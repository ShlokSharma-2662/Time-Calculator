import { describe, it, expect } from 'vitest';
import { buildPunchHealth } from '../src/utils/punchHealth.js';
import { parseAttendanceLogInput } from '../src/utils/attendanceLogParser.js';

describe('buildPunchHealth', () => {
  it('treats a live unmatched last IN as an open session, not an error', () => {
    const parsed = parseAttendanceLogInput(`
Daily In Out Punch
30-Jul-26\t09:10 AM\tIn\t10.1.1.100\tLobby\t30-Jul-26\t30-Jul-26 09:10 AM
30-Jul-26\t11:00 AM\tOut\t10.1.1.100\tLobby\t30-Jul-26\t30-Jul-26 11:00 AM
30-Jul-26\t12:00 PM\tIn\t10.1.1.100\tLobby\t30-Jul-26\t30-Jul-26 12:00 PM
`);
    const live = buildPunchHealth({
      events: parsed.events,
      anomalies: parsed.anomalies,
      isHistorical: false,
    });
    expect(live.errorCount).toBe(0);
    expect(live.issues.some((issue) => issue.type === 'open-session')).toBe(true);

    const historical = buildPunchHealth({
      events: parsed.events,
      anomalies: parsed.anomalies,
      isHistorical: true,
    });
    expect(historical.errorCount).toBeGreaterThan(0);
    expect(historical.issues.some((issue) => issue.type === 'odd-punch-count')).toBe(true);
  });

  it('groups repeated machine changes and flags unpaired OUT', () => {
    const parsed = parseAttendanceLogInput(`
Daily In Out Punch
30-Jul-26\t09:00 AM\tOut\t10.1.1.100\tFloor A\t30-Jul-26\t30-Jul-26 09:00 AM
30-Jul-26\t10:00 AM\tIn\t10.1.1.100\tFloor B\t30-Jul-26\t30-Jul-26 10:00 AM
30-Jul-26\t11:00 AM\tOut\t10.1.1.100\tFloor C\t30-Jul-26\t30-Jul-26 11:00 AM
`);
    const health = buildPunchHealth({
      events: parsed.events,
      anomalies: parsed.anomalies,
      isHistorical: true,
    });
    expect(health.issues.some((issue) => issue.type === 'odd-punch-count')).toBe(true);
    const machine = health.issues.filter((issue) => issue.type === 'machine-change');
    expect(machine.length).toBeLessThanOrEqual(1);
  });

  it('flags duplicate punches on simple event lists', () => {
    const health = buildPunchHealth({
      events: [
        { type: 'IN', minutes: 540, displayTime: '09:00' },
        { type: 'IN', minutes: 540, displayTime: '09:00' },
        { type: 'OUT', minutes: 720, displayTime: '12:00' },
      ],
      anomalies: [],
      isHistorical: true,
    });
    expect(health.issues.some((issue) => issue.type === 'duplicate-punch')).toBe(true);
  });
});
