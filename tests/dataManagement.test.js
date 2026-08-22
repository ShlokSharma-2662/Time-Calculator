import { describe, it, expect, beforeEach } from 'vitest';
import { APP_KEYS, exportAllData, importAllData, clearAllData } from '../src/utils/dataManagement.js';
import { canAccessLeaveView, parseLeaveAccessEmails } from '../src/utils/leaveAccess.js';
import { hrmsPayloadToHistoryEntry } from '../src/utils/spinePunchExtract.js';

function mockLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
  return store;
}

describe('dataManagement backup keys', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('includes the primary history and financial keys', () => {
    expect(APP_KEYS).toContain('workShift_history');
    expect(APP_KEYS).toContain('financial_settings_data');
    expect(APP_KEYS).toContain('workShift_holidays');
    expect(APP_KEYS).toContain('shiftTarget');
  });

  it('round-trips workShift_history', () => {
    localStorage.setItem('workShift_history', JSON.stringify({ '2026-08-22': { logInput: 'IN' } }));
    const backup = exportAllData();
    clearAllData();
    expect(localStorage.getItem('workShift_history')).toBeNull();
    importAllData(backup);
    expect(JSON.parse(localStorage.getItem('workShift_history'))['2026-08-22'].logInput).toBe('IN');
  });
});

describe('leave access allowlist', () => {
  it('always includes the owner email and extra env emails', () => {
    expect(parseLeaveAccessEmails('other@example.com')).toEqual([
      'suttamshlok@gmail.com',
      'other@example.com',
    ]);
    expect(canAccessLeaveView('suttamshlok@gmail.com', '')).toBe(true);
    expect(canAccessLeaveView('other@example.com', 'other@example.com')).toBe(true);
    expect(canAccessLeaveView('nobody@example.com', '')).toBe(false);
  });
});

describe('hrmsPayloadToHistoryEntry', () => {
  it('maps Spine payload fields into a history entry', () => {
    const entry = hrmsPayloadToHistoryEntry({
      logInput: 'Daily In Out Punch\n22-Aug-26\t09:32 AM\tIn',
      startTime: '09:32',
      hrmsBreakMin: '40',
      hrmsFirstIn: '09:32 AM',
      hrmsLastOut: '06:58 PM',
    });
    expect(entry.startTime).toBe('09:32');
    expect(entry.totalOutTime).toBe(40);
    expect(entry.logInput).toContain('09:32 AM');
  });
});
