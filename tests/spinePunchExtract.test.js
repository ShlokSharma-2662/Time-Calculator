import { describe, it, expect } from 'vitest';
import {
  extractPunchTextFromHtml,
  extractPunchTextFromPlainText,
  summarizePunchText,
  buildHrmsSyncPayload,
  formatSpineDate,
} from '../src/utils/spinePunchExtract.js';

const sampleTableHtml = `
<html><body>
<table>
  <tr><td>Daily In Out Punch</td></tr>
  <tr><td>Date</td><td>Entry Time</td><td>In/Out</td></tr>
  <tr><td>04-Aug-26</td><td>09:15 AM</td><td>In</td></tr>
  <tr><td>04-Aug-26</td><td>01:00 PM</td><td>Out</td></tr>
  <tr><td>04-Aug-26</td><td>01:45 PM</td><td>In</td></tr>
  <tr><td>04-Aug-26</td><td>06:30 PM</td><td>Out</td></tr>
</table>
</body></html>
`;

describe('spinePunchExtract', () => {
  it('extracts In/Out rows from Daily In Out Punch HTML table', () => {
    const text = extractPunchTextFromHtml(sampleTableHtml);
    expect(text).toContain('04-Aug-26\t09:15 AM\tIn');
    expect(text).toContain('04-Aug-26\t06:30 PM\tOut');
    expect(text.split('\n')).toHaveLength(4);
  });

  it('extracts rows from plain popup text', () => {
    const plain = `
Daily In Out Punch
Date\tEntry Time\tIn/Out
04-Aug-26\t09:15 AM\tIn
04-Aug-26\t06:30 PM\tOut
`;
    const text = extractPunchTextFromPlainText(plain);
    expect(text.split('\n')).toHaveLength(2);
    expect(text).toContain('\tIn');
  });

  it('summarizes first/last and break gap', () => {
    const punchText = [
      '04-Aug-26\t09:15 AM\tIn',
      '04-Aug-26\t01:00 PM\tOut',
      '04-Aug-26\t01:45 PM\tIn',
      '04-Aug-26\t06:30 PM\tOut',
    ].join('\n');

    const summary = summarizePunchText(punchText);
    expect(summary.selectedDate).toBe('04-Aug-26');
    expect(summary.firstIn).toBe('09:15 AM');
    expect(summary.lastOut).toBe('06:30 PM');
    expect(summary.punchCount).toBe(4);
    expect(summary.breakMinutes).toBe(45);
    expect(summary.startTime24).toBe('09:15');
    expect(summary.logInput).toContain('Daily In Out Punch');
  });

  it('builds HRMS localStorage payload matching ShiftState contract', () => {
    const punchText = [
      '04-Aug-26\t09:15 AM\tIn',
      '04-Aug-26\t06:30 PM\tOut',
    ].join('\n');
    const now = new Date('2026-08-04T12:00:00');
    const payload = buildHrmsSyncPayload(punchText, { now });

    expect(payload).not.toBeNull();
    expect(payload.hrmsSelectedDate).toBe('04-Aug-26');
    expect(payload.hrmsIsToday).toBe('true');
    expect(payload.hrmsStatus).toBe('today');
    expect(payload.hrmsSource).toBe('spine-hrms');
    expect(payload.hrmsPunchCount).toBe('2');
    expect(payload.hrmsFirstIn).toBe('09:15 AM');
    expect(payload.logInput).toContain('09:15 AM\tIn');
    expect(payload.startTime).toBe('09:15');
    expect(Number(payload.hrmsSyncAt)).toBe(now.getTime());
  });

  it('formats Spine date links as dd-MMM-yy', () => {
    expect(formatSpineDate(new Date('2026-08-04T10:00:00'))).toBe('04-Aug-26');
  });

  it('returns null payload when punch text is empty', () => {
    expect(buildHrmsSyncPayload('')).toBeNull();
  });
});
