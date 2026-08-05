import { describe, it, expect } from 'vitest';
import {
  parseAttendanceLogInput,
  buildCleanAttendanceLog,
  parsePortalSummaryTimes,
  applyParsedLogToEditValues,
  normalizePunchSequence,
} from '../src/utils/attendanceLogParser.js';

const samplePopup = `
Shift [NW] Time: **30-Jul-26 06:01 AM - 31-Jul-26 06:00 AM** [As per CutOff Time]
**Daily In Out Punch**
**Date**\t**Entry Time**\t**In/Out**\t**IP Address**\t**Machine Name**\t**Swipe Date**\t**Entry Date Time**\t**Approver Remark**
30-Jul-26\t11:10 AM\tIn\t10.1.1.100\tGU 4th Floor Left\t30-Jul-26\t30-Jul-26 11:10 AM\t
30-Jul-26\t12:56 PM\tOut\t10.1.1.100\tGU 4th Floor Left\t30-Jul-26\t30-Jul-26 12:56 PM\t
30-Jul-26\t01:14 PM\tIn\t10.1.1.100\tGU 5th Floor Left\t30-Jul-26\t30-Jul-26 01:14 PM\t
30-Jul-26\t02:04 PM\tOut\t10.1.1.100\tGU 5th Floor Left\t30-Jul-26\t30-Jul-26 02:04 PM\t
30-Jul-26\t02:04 PM\tIn\t10.1.1.100\tGU 4th Floor Left\t30-Jul-26\t30-Jul-26 02:04 PM\t
30-Jul-26\t02:04 PM\tOut\t10.1.1.100\tGU 4th Floor Left\t30-Jul-26\t30-Jul-26 02:04 PM\t
30-Jul-26\t02:04 PM\tIn\t10.1.1.100\tGU 4th Floor Left\t30-Jul-26\t30-Jul-26 02:04 PM\t
30-Jul-26\t02:59 PM\tOut\t10.1.1.100\tGU 4th Floor Right\t30-Jul-26\t30-Jul-26 02:59 PM\t
30-Jul-26\t03:00 PM\tIn\t10.1.1.100\tGU 5th Floor Left\t30-Jul-26\t30-Jul-26 03:00 PM\t
30-Jul-26\t04:38 PM\tOut\t10.1.1.100\tGU 5th Floor Left\t30-Jul-26\t30-Jul-26 04:38 PM\t
30-Jul-26\t04:38 PM\tIn\t10.1.1.100\tGU 4th Floor Left\t30-Jul-26\t30-Jul-26 04:38 PM\t
30-Jul-26\t06:41 PM\tOut\t10.1.1.100\tGU 4th Floor Left\t30-Jul-26\t30-Jul-26 06:41 PM\t
**Leave Details**
No details available
**Swipe Request Done**
No details available
**Short Time-Off**
**App. Date**\t**Request Date**\t**Request Type**\t**Minutes**\t**From Time / To Time**\t**Remark**
30-Jul-26\t30-Jul-26\tEarly Going\t90\t\tDue to some personal work
`;

describe('attendanceLogParser', () => {
  it('parses in/out punches and short time-off entries from HRMS popup', () => {
    const parsed = parseAttendanceLogInput(samplePopup);

    expect(parsed.detectedDate).toBe('2026-07-30');
    expect(parsed.punchCount).toBe(12);
    expect(parsed.sessionCount).toBe(6);
    expect(parsed.shortTimeOffMinutes).toBe(90);
    expect(parsed.shortTimeOffEntries).toHaveLength(1);
    expect(parsed.hasPunchRows).toBe(true);
    expect(parsed.anomalies.some((item) => item.type === 'machine-change')).toBe(true);
    expect(parsed.blankApproverRemarks).toHaveLength(12);
  });

  it('keeps zero-duration machine-hop sessions', () => {
    const parsed = parseAttendanceLogInput(samplePopup);
    const zeroSessions = parsed.sessions.filter((session) => session.durationMinutes === 0);
    expect(zeroSessions.length).toBeGreaterThan(0);
  });

  it('does not create short-time-off entries from "No details available"', () => {
    const parsed = parseAttendanceLogInput(`
**Leave Details**
No details available
**Swipe Request Done**
No details available
`);

    expect(parsed.shortTimeOffMinutes).toBe(0);
    expect(parsed.shortTimeOffEntries).toHaveLength(0);
    expect(parsed.punchCount).toBe(0);
  });

  it('builds sanitized text with compact rows and short-time-off section', () => {
    const cleaned = buildCleanAttendanceLog(samplePopup);
    const lines = cleaned.split('\n').filter(Boolean);

    expect(lines[0]).toBe('Daily In Out Punch');
    expect(lines).toContain('Short Time-Off');
    expect(cleaned).toContain('2026-07-30');
    expect(lines[lines.length - 1]).toBe('2026-07-30\t2026-07-30\tEarly Going\t90');
  });

  it('flags odd punch counts as anomaly', () => {
    const parsed = parseAttendanceLogInput(`
**Daily In Out Punch**
30-Jul-26\t09:10 AM\tIn\t10.1.1.100\tGU 4th Floor Left\t30-Jul-26\t30-Jul-26 09:10 AM
30-Jul-26\t11:00 AM\tOut\t10.1.1.100\tGU 4th Floor Left\t30-Jul-26\t30-Jul-26 11:00 AM
30-Jul-26\t12:00 PM\tIn\t10.1.1.100\tGU 4th Floor Left\t30-Jul-26\t30-Jul-26 12:00 PM
`);

    expect(parsed.anomalies.some((item) => item.type === 'odd-punch-count')).toBe(true);
    expect(parsed.sessionCount).toBe(1);
    expect(parsed.totalWorkMinutes).toBe(110);
  });

  it('returns empty output for noisy non-log text', () => {
    const parsed = parseAttendanceLogInput('random text without parseable rows');
    const cleaned = buildCleanAttendanceLog('random text without parseable rows');

    expect(parsed.detectedDate).toBeNull();
    expect(parsed.hasPunchRows).toBe(false);
    expect(parsed.shortTimeOffMinutes).toBe(0);
    expect(cleaned).toBe('');
  });

  it('parses overnight sessions across midnight using date offsets', () => {
    const parsed = parseAttendanceLogInput(`
**Daily In Out Punch**
30-Jul-26\t10:00 PM\tIn\t10.1.1.100\tLobby\t30-Jul-26\t30-Jul-26 10:00 PM
31-Jul-26\t02:00 AM\tOut\t10.1.1.100\tLobby\t31-Jul-26\t31-Jul-26 02:00 AM
`);

    expect(parsed.sessionCount).toBe(1);
    expect(parsed.totalWorkMinutes).toBe(240);
    expect(parsed.events[0].time24).toBe('22:00');
    expect(parsed.events[1].time24).toBe('02:00');
  });

  it('parses same-date overnight wrap when clock goes backwards', () => {
    const parsed = parseAttendanceLogInput(`
**Daily In Out Punch**
30-Jul-26\t11:00 PM\tIn\t10.1.1.100\tLobby\t30-Jul-26\t30-Jul-26 11:00 PM
30-Jul-26\t01:30 AM\tOut\t10.1.1.100\tLobby\t30-Jul-26\t30-Jul-26 01:30 AM
`);

    expect(parsed.sessionCount).toBe(1);
    expect(parsed.totalWorkMinutes).toBe(150);
  });

  it('parses pipe-delimited punch rows and ignores header text', () => {
    const parsed = parseAttendanceLogInput(`
Daily In Out Punch
| Date | Entry Time | In/Out | IP Address | Machine Name | Swipe Date | Entry Date Time | Approver Remark |
| 30-Jul-26 | 09:00 AM | In | 10.1.1.1 | Desk A | 30-Jul-26 | 30-Jul-26 09:00 AM | ok |
| 30-Jul-26 | 01:00 PM | Out | 10.1.1.1 | Desk A | 30-Jul-26 | 30-Jul-26 01:00 PM | ok |
`);

    expect(parsed.punchCount).toBe(2);
    expect(parsed.sessionCount).toBe(1);
    expect(parsed.totalWorkMinutes).toBe(240);
  });

  it('handles 12:00 AM/PM edge cases', () => {
    const parsed = parseAttendanceLogInput(`
**Daily In Out Punch**
30-Jul-26\t12:00 AM\tIn\t10.1.1.100\tLobby\t30-Jul-26\t30-Jul-26 12:00 AM
30-Jul-26\t12:00 PM\tOut\t10.1.1.100\tLobby\t30-Jul-26\t30-Jul-26 12:00 PM
`);

    expect(parsed.events[0].time24).toBe('00:00');
    expect(parsed.events[1].time24).toBe('12:00');
    expect(parsed.totalWorkMinutes).toBe(720);
  });

  it('parses portal summary fallback times', () => {
    const summary = parsePortalSummaryTimes(
      '09:00 AM 06:00 PM 09:15 AM 06:10 PM 8.50 8.20 0.75'
    );
    expect(summary).toEqual({
      startTime: '09:15',
      lastOutTime: '18:10',
      totalBreak: 45,
      shortTimeOffMinutes: 0,
    });
  });

  it('maps parsed punch logs into edit values with cleaned logInput', () => {
    const parsed = parseAttendanceLogInput(samplePopup);
    const applied = applyParsedLogToEditValues(parsed, samplePopup);

    expect(applied.source).toBe('punch-log');
    expect(applied.startTime).toBe('11:10');
    expect(applied.lastOutTime).toBe('18:41');
    expect(applied.shortTimeOffMinutes).toBe(90);
    expect(applied.logInput).toContain('Daily In Out Punch');
    expect(applied.logInput).toContain('Short Time-Off');
  });

  it('repairs glitched same-minute In/Out order from HRMS', () => {
    const glitched = `
Daily In Out Punch
05-Aug-26\t09:06 AM\tIn
05-Aug-26\t09:07 AM\tIn
05-Aug-26\t09:07 AM\tOut
`;
    const cleaned = buildCleanAttendanceLog(glitched);
    expect(cleaned).toBe(
      [
        'Daily In Out Punch',
        '2026-08-05\t09:06 AM\tIn',
        '2026-08-05\t09:07 AM\tOut',
        '2026-08-05\t09:07 AM\tIn',
      ].join('\n'),
    );

    const repaired = normalizePunchSequence([
      { date: '2026-08-05', minutes: 546, type: 'IN' },
      { date: '2026-08-05', minutes: 547, type: 'IN' },
      { date: '2026-08-05', minutes: 547, type: 'OUT' },
    ]);
    expect(repaired.map((p) => p.type)).toEqual(['IN', 'OUT', 'IN']);
  });
});
