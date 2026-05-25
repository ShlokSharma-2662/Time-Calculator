import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useLogParser } from '../hooks/useLogParser';
import { useShiftCalculations } from '../hooks/useShiftCalculations';
import { useHistory } from '../hooks/useHistory';
import { getMonthToDateAdherence } from '../utils/shiftHistory';
import { getLeaveForDate } from '../utils/leaveHistory';
import { normalizeDate } from '../utils/dateUtils';
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
    const { history, saveEntry, getAllEntries, exportToCSV, setFullHistory } = useHistory();

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
        catch (e) { return ""; }
    });

    const [shiftDuration, setShiftDuration] = useState(() => {
        try {
            const saved = localStorage.getItem('shiftDuration');
            return saved ? Number(saved) : 9;
        } catch (e) { return 9; }
    });

    const [use24Hour, setUse24Hour] = useState(() => {
        try { return localStorage.getItem('use24Hour') === 'true'; }
        catch (e) { return false; }
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

    // --- Persist to localStorage ---
    useEffect(() => {
        localStorage.setItem('startTime', startTime);
        localStorage.setItem('logInput', logInput);
        localStorage.setItem('shiftDuration', shiftDuration);
        localStorage.setItem('use24Hour', use24Hour);
    }, [startTime, logInput, shiftDuration, use24Hour]);

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
        const interval = setInterval(refreshHrmsSync, 1500);
        const onStorage = (event) => {
            if (!event.key || event.key === 'logInput' || HRMS_SYNC_KEYS.includes(event.key)) {
                refreshHrmsSync();
            }
        };

        window.addEventListener('storage', onStorage);
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    useEffect(() => {
        if (!hrmsSync.hasData) return;

        try {
            if (hrmsSync.syncedLogInput && hrmsSync.syncedLogInput !== logInput) {
                setLogInput(hrmsSync.syncedLogInput);
            }
            if (hrmsSync.syncedStartTime && hrmsSync.syncedStartTime !== startTime) {
                setStartTime(hrmsSync.syncedStartTime);
            }
        } catch (e) {
            console.warn('[ShiftState] Failed to hydrate HRMS synced values:', e);
        }
    }, [hrmsSync.hasData, hrmsSync.syncedLogInput, hrmsSync.syncedStartTime, logInput, startTime]);

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

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

    const currentParsedDate = useMemo(() => {
        const DATE_REGEX = /(\d{4}-\d{2}-\d{2})|(\d{1,2}[/-][A-Za-z]{3}[/-]\d{2,4})|(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/g;
        const match = logInput.match(DATE_REGEX);
        return normalizeDate(match ? match[0] : today);
    }, [logInput, today]);

    const activeLeave = useMemo(() => getLeaveForDate(currentParsedDate), [currentParsedDate, history]);

    const logStats = useLogParser(logInput, use24Hour, currentMinutes, startTimeMinutes, today, activeLeave);
    const shiftDetails = useShiftCalculations(logStats.firstInTime || startTime, shiftDuration * 60, use24Hour, logStats.totalOutTime, currentParsedDate);

    const mtdProgress = useMemo(() => {
        return getMonthToDateAdherence(history, logStats, shiftDuration * 60);
    }, [history, logStats, shiftDuration]);

    const currentDayProgress = useMemo(() => {
        const targetMinutes = shiftDuration * 60;
        if (targetMinutes === 0) return 0;
        return Math.min(100, Math.round((logStats.effectiveWorkTime / targetMinutes) * 100));
    }, [logStats.effectiveWorkTime, shiftDuration]);

    // --- Auto-save effect (uses refs to avoid stale closures) ---
    const saveEntryRef = useRef(saveEntry);
    const syncLogsToCloudRef = useRef(syncLogsToCloud);
    const activeLeaveRef = useRef(activeLeave);

    useEffect(() => { saveEntryRef.current = saveEntry; }, [saveEntry]);
    useEffect(() => { syncLogsToCloudRef.current = syncLogsToCloud; }, [syncLogsToCloud]);
    useEffect(() => { activeLeaveRef.current = activeLeave; }, [activeLeave]);

    useEffect(() => {
        const todayISO = new Date().toISOString().slice(0, 10);
        const targetDate = logStats.detectedDate || todayISO;

        if (logInput.trim() !== "" || startTime !== "09:00") {
            const currentLeave = activeLeaveRef.current;
            const entryData = {
                startTime,
                logInput,
                totalOutTime: logStats.totalOutTime,
                effectiveWorkTime: logStats.effectiveWorkTime,
                firstInTime: logStats.firstInTime,
                lastOutTime: logStats.lastOutTime,
                activeLeave: currentLeave || null
            };
            saveEntryRef.current(targetDate, entryData);

            if (logStats.detectedDate && user) {
                syncLogsToCloudRef.current([[targetDate, entryData]]);
            }
        }
    }, [startTime, logInput, logStats.totalOutTime, logStats.effectiveWorkTime, logStats.detectedDate, user]);

    const value = {
        // State + setters
        startTime, setStartTime,
        logInput, setLogInput,
        shiftDuration, setShiftDuration,
        use24Hour, setUse24Hour,
        currentMinutes,
        // History
        history, saveEntry, getAllEntries, exportToCSV, setFullHistory,
        // Derived
        activeLeave, logStats, shiftDetails, mtdProgress, currentDayProgress,
        // HRMS integration
        hrmsSync, clearHrmsSync,
    };

    return (
        <ShiftStateContext.Provider value={value}>
            {children}
        </ShiftStateContext.Provider>
    );
}
