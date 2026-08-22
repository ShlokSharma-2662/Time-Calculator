import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useLogParser } from '../hooks/useLogParser';
import { useShiftCalculations } from '../hooks/useShiftCalculations';
import { useHistory } from '../hooks/useHistory';
import { getMonthToDateAdherence } from '../utils/shiftHistory';
import { getLeaveForDate } from '../utils/leaveHistory';
import { getLocalISODate, normalizeDate, resolveEffectiveWorkDate } from '../utils/dateUtils';
import { hrmsPayloadToHistoryEntry } from '../utils/spinePunchExtract';
import { useAuth } from './AuthContext';

const ShiftStateContext = createContext(null);
const HRMS_SYNC_KEYS = [
    'hrmsSelectedDate',
    'hrmsSyncAt',
    'hrmsIsToday',
    'hrmsFirstIn',
    'hrmsLastOut',
    'hrmsBreakMin',
    'hrmsPunchCount',
    'hrmsStatus',
    'hrmsSource',
];

function readHrmsSyncSnapshot() {
    try {
        const selectedDate = localStorage.getItem('hrmsSelectedDate') || '';
        const syncAtRaw = localStorage.getItem('hrmsSyncAt');
        const syncAt = Number(syncAtRaw);
        const breakMinutesRaw = Number(localStorage.getItem('hrmsBreakMin'));
        const punchCountRaw = Number(localStorage.getItem('hrmsPunchCount'));
        const syncedLogInput = localStorage.getItem('logInput') || '';
        const syncedStartTime = localStorage.getItem('startTime') || '';
        const status = localStorage.getItem('hrmsStatus')
            || (localStorage.getItem('hrmsIsToday') === 'true' ? 'today' : 'past');

        return {
            selectedDate,
            syncedAt: Number.isFinite(syncAt) ? syncAt : null,
            isToday: localStorage.getItem('hrmsIsToday') === 'true',
            firstIn: localStorage.getItem('hrmsFirstIn') || '',
            lastOut: localStorage.getItem('hrmsLastOut') || '',
            breakMinutes: Number.isFinite(breakMinutesRaw) ? breakMinutesRaw : 0,
            punchCount: Number.isFinite(punchCountRaw) ? punchCountRaw : 0,
            status,
            source: localStorage.getItem('hrmsSource') || 'spine-hrms',
            syncedLogInput,
            syncedStartTime,
            hasData: Boolean(selectedDate && syncedLogInput.trim()),
        };
    } catch (e) {
        console.warn('[ShiftState] Failed to read HRMS sync data:', e);
        return {
            selectedDate: '',
            syncedAt: null,
            isToday: false,
            firstIn: '',
            lastOut: '',
            breakMinutes: 0,
            punchCount: 0,
            status: 'past',
            source: 'spine-hrms',
            syncedLogInput: '',
            syncedStartTime: '',
            hasData: false,
        };
    }
}

export function useShiftState() {
    const ctx = useContext(ShiftStateContext);
    if (!ctx) throw new Error('useShiftState must be used within ShiftStateProvider');
    return ctx;
}

export function ShiftStateProvider({ children }) {
    const { user, syncLogsToCloud } = useAuth();
    const { history, saveEntry, mergeIncomingHistory, getAllEntries, exportToCSV, setFullHistory } = useHistory();

    // --- Persisted State ---
    const [startTime, setStartTime] = useState(() => {
        try {
            const saved = localStorage.getItem('startTime');
            if (saved) return saved;
        } catch (e) {
            console.warn('[ShiftState] Failed to read startTime:', e);
        }
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });

    const [logInput, setLogInput] = useState(() => {
        try { return localStorage.getItem('logInput') || ""; }
        catch (_e) { return ""; }
    });

    const [shiftDuration, setShiftDuration] = useState(() => {
        try {
            const saved = localStorage.getItem('shiftDuration');
            return saved ? Number(saved) : 9;
        } catch (_e) { return 9; }
    });

    const [use24Hour, setUse24Hour] = useState(() => {
        try { return localStorage.getItem('use24Hour') === 'true'; }
        catch (_e) { return false; }
    });

    const today = useMemo(() => getLocalISODate(), []);

    const [workDate, setWorkDate] = useState(() => {
        try {
            const saved = localStorage.getItem('workDate');
            if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
        } catch (_e) { /* ignore */ }
        return today;
    });

    const [hrmsSync, setHrmsSync] = useState(() => readHrmsSyncSnapshot());

    // --- Live Clock ---
    const [currentMinutes, setCurrentMinutes] = useState(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // --- Persist to localStorage (split so each key only writes on its own change) ---
    useEffect(() => { localStorage.setItem('startTime', startTime); }, [startTime]);
    useEffect(() => { localStorage.setItem('logInput', logInput); }, [logInput]);
    useEffect(() => { localStorage.setItem('shiftDuration', shiftDuration); }, [shiftDuration]);
    useEffect(() => { localStorage.setItem('use24Hour', use24Hour); }, [use24Hour]);
    useEffect(() => { localStorage.setItem('workDate', workDate); }, [workDate]);

    useEffect(() => {
        const refreshHrmsSync = () => {
            const next = readHrmsSyncSnapshot();
            setHrmsSync((prev) => {
                if (
                    prev.selectedDate === next.selectedDate
                    && prev.syncedAt === next.syncedAt
                    && prev.isToday === next.isToday
                    && prev.firstIn === next.firstIn
                    && prev.lastOut === next.lastOut
                    && prev.breakMinutes === next.breakMinutes
                    && prev.punchCount === next.punchCount
                    && prev.status === next.status
                    && prev.source === next.source
                    && prev.syncedLogInput === next.syncedLogInput
                    && prev.syncedStartTime === next.syncedStartTime
                    && prev.hasData === next.hasData
                ) {
                    return prev;
                }
                return next;
            });
        };

        refreshHrmsSync();
        const onStorage = (event) => {
            if (!event.key || event.key === 'logInput' || HRMS_SYNC_KEYS.includes(event.key)) {
                refreshHrmsSync();
            }
        };
        const onHrmsBridge = () => refreshHrmsSync();

        window.addEventListener('storage', onStorage);
        window.addEventListener('workshift-hrms-sync', onHrmsBridge);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('workshift-hrms-sync', onHrmsBridge);
        };
    }, []);

    useEffect(() => {
        if (!hrmsSync.hasData) return;
        try {
            if (hrmsSync.syncedLogInput) {
                setLogInput(hrmsSync.syncedLogInput);
            }
            if (hrmsSync.syncedStartTime) {
                setStartTime(hrmsSync.syncedStartTime);
            }
            const iso = normalizeDate(hrmsSync.selectedDate);
            if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
                setWorkDate(iso);
            }
        } catch (e) {
            console.warn('[ShiftState] Failed to hydrate HRMS synced values:', e);
        }
    }, [hrmsSync.hasData, hrmsSync.syncedAt, hrmsSync.syncedLogInput, hrmsSync.syncedStartTime, hrmsSync.selectedDate]);

    useEffect(() => {
        const onRange = (event) => {
            const payloads = event.detail?.payloads;
            if (!Array.isArray(payloads) || !payloads.length) return;
            payloads.forEach((payload) => {
                const iso = normalizeDate(payload.hrmsSelectedDate);
                const entry = hrmsPayloadToHistoryEntry(payload);
                if (!iso || !entry) return;
                saveEntry(iso, entry);
            });
        };
        window.addEventListener('workshift-hrms-range', onRange);
        return () => window.removeEventListener('workshift-hrms-range', onRange);
    }, [saveEntry]);

    const clearHrmsSync = () => {
        try {
            HRMS_SYNC_KEYS.forEach((key) => localStorage.removeItem(key));
            setHrmsSync(readHrmsSyncSnapshot());
        } catch (e) {
            console.warn('[ShiftState] Failed to clear HRMS sync data:', e);
        }
    };

    // --- Derived Calculations ---
    const startTimeMinutes = useMemo(() => {
        const [h, m] = startTime.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    }, [startTime]);

    const currentParsedDate = useMemo(() => {
        const DATE_REGEX = /(\d{4}-\d{2}-\d{2})|(\d{1,2}[/-][A-Za-z]{3}[/-]\d{2,4})|(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/g;
        const match = logInput.match(DATE_REGEX);
        const fromLog = match ? normalizeDate(match[0]) : null;
        return resolveEffectiveWorkDate(fromLog, workDate, today);
    }, [logInput, workDate, today]);

    const activeLeave = useMemo(() => getLeaveForDate(currentParsedDate), [currentParsedDate, history]);

    const logStats = useLogParser(logInput, use24Hour, currentMinutes, startTimeMinutes, today, activeLeave, workDate);

    useEffect(() => {
        if (logStats.logDetectedDate && logStats.logDetectedDate !== workDate) {
            setWorkDate(logStats.logDetectedDate);
        }
    }, [logStats.logDetectedDate, workDate]);

    const shiftDetails = useShiftCalculations(logStats.firstInTime || startTime, shiftDuration * 60, use24Hour, logStats.totalOutTime, currentParsedDate);

    const mtdProgress = useMemo(() => {
        return getMonthToDateAdherence(history, logStats, shiftDuration * 60);
    }, [history, logStats, shiftDuration]);

    const currentDayProgress = useMemo(() => {
        const targetMinutes = shiftDuration * 60;
        if (targetMinutes === 0) return 0;
        return Math.min(100, Math.round((logStats.effectiveWorkTime / targetMinutes) * 100));
    }, [logStats.effectiveWorkTime, shiftDuration]);

    // --- Auto-save: debounce local history; cloud only on hide/blur/pagehide ---
    const saveEntryRef = useRef(saveEntry);
    const syncLogsToCloudRef = useRef(syncLogsToCloud);
    const persistPayloadRef = useRef(null);

    useEffect(() => { saveEntryRef.current = saveEntry; }, [saveEntry]);
    useEffect(() => { syncLogsToCloudRef.current = syncLogsToCloud; }, [syncLogsToCloud]);

    persistPayloadRef.current = {
        shouldSave: logInput.trim() !== '' || startTime !== '09:00',
        canCloud: Boolean(logStats.detectedDate && user),
        targetDate: logStats.detectedDate || today,
        entryData: {
            startTime,
            logInput,
            totalOutTime: logStats.totalOutTime,
            effectiveWorkTime: logStats.effectiveWorkTime,
            firstInTime: logStats.firstInTime,
            lastOutTime: logStats.lastOutTime,
            activeLeave: activeLeave || null,
            shortTimeOffMinutes: logStats.shortTimeOffMinutes || 0,
            shortTimeOffEntries: logStats.shortTimeOffEntries || []
        },
    };

    const flushLocalSave = () => {
        const payload = persistPayloadRef.current;
        if (!payload?.shouldSave) return;
        saveEntryRef.current(payload.targetDate, payload.entryData);
    };

    const flushCloudSave = () => {
        const payload = persistPayloadRef.current;
        if (!payload?.shouldSave) return;
        saveEntryRef.current(payload.targetDate, payload.entryData);
        if (!payload.canCloud) return;
        Promise.resolve(syncLogsToCloudRef.current([[payload.targetDate, payload.entryData]]))
            .catch((err) => {
                console.warn('[ShiftState] Auto-sync failed:', err?.message || err);
            });
    };

    useEffect(() => {
        if (!persistPayloadRef.current?.shouldSave) return undefined;
        const timer = setTimeout(flushLocalSave, 400);
        return () => clearTimeout(timer);
    }, [startTime, logInput, logStats.detectedDate, logStats.shortTimeOffMinutes, today]);

    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') flushCloudSave();
        };
        const onBlur = () => flushCloudSave();

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('blur', onBlur);
        window.addEventListener('pagehide', flushCloudSave);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('pagehide', flushCloudSave);
        };
    }, []);

    const value = {
        // State + setters
        startTime, setStartTime,
        logInput, setLogInput,
        shiftDuration, setShiftDuration,
        use24Hour, setUse24Hour,
        workDate, setWorkDate, today,
        currentMinutes,
        hrmsSync, clearHrmsSync,
        // History
        history, saveEntry, mergeIncomingHistory, getAllEntries, exportToCSV, setFullHistory,
        // Derived
        activeLeave, logStats, shiftDetails, mtdProgress, currentDayProgress,
    };

    return (
        <ShiftStateContext.Provider value={value}>
            {children}
        </ShiftStateContext.Provider>
    );
}
