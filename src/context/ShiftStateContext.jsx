import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useLogParser } from '../hooks/useLogParser';
import { useShiftCalculations } from '../hooks/useShiftCalculations';
import { useHistory } from '../hooks/useHistory';
import { getMonthToDateAdherence } from '../utils/shiftHistory';
import { getLeaveForDate } from '../utils/leaveHistory';
import { getLocalISODate, normalizeDate, resolveEffectiveWorkDate } from '../utils/dateUtils';
import { useAuth } from './AuthContext';

const ShiftStateContext = createContext(null);

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

    // --- Auto-save effect (uses refs to avoid stale closures) ---
    const saveEntryRef = useRef(saveEntry);
    const syncLogsToCloudRef = useRef(syncLogsToCloud);
    const activeLeaveRef = useRef(activeLeave);

    useEffect(() => { saveEntryRef.current = saveEntry; }, [saveEntry]);
    useEffect(() => { syncLogsToCloudRef.current = syncLogsToCloud; }, [syncLogsToCloud]);
    useEffect(() => { activeLeaveRef.current = activeLeave; }, [activeLeave]);

    useEffect(() => {
        const todayISO = today;
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
                    activeLeave: currentLeave || null,
                    shortTimeOffMinutes: logStats.shortTimeOffMinutes || 0,
                    shortTimeOffEntries: logStats.shortTimeOffEntries || []
                };
            saveEntryRef.current(targetDate, entryData);

            if (logStats.detectedDate && user) {
                Promise.resolve(syncLogsToCloudRef.current([[targetDate, entryData]]))
                    .catch((err) => {
                        console.warn('[ShiftState] Auto-sync failed:', err?.message || err);
                    });
            }
        }
    }, [startTime, logInput, logStats.totalOutTime, logStats.effectiveWorkTime, logStats.detectedDate, user, today]);

    const value = {
        // State + setters
        startTime, setStartTime,
        logInput, setLogInput,
        shiftDuration, setShiftDuration,
        use24Hour, setUse24Hour,
        workDate, setWorkDate, today,
        currentMinutes,
        // History
        history, saveEntry, getAllEntries, exportToCSV, setFullHistory,
        // Derived
        activeLeave, logStats, shiftDetails, mtdProgress, currentDayProgress,
    };

    return (
        <ShiftStateContext.Provider value={value}>
            {children}
        </ShiftStateContext.Provider>
    );
}
