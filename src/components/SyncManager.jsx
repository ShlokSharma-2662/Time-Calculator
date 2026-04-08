import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useShiftState } from '../context/ShiftStateContext';

/**
 * SyncManager — encapsulates all Firebase sync logic:
 * - Manual sync (push local → cloud)
 * - Cloud restore (pull cloud → local)
 * - Real-time Firestore subscription
 *
 * Renders nothing itself; exposes sync state/functions via render prop.
 */
export function SyncManager({ children }) {
    const { user, syncLogsToCloud, fetchLogsFromCloud, subscribeToLogs } = useAuth();
    const { showSuccess, showError, showInfo } = useUI();
    const { getAllEntries, saveEntry, setFullHistory } = useShiftState();

    const [isSyncing, setIsSyncing] = useState(false);
    const [synced, setSynced] = useState(false);

    // Refs to avoid stale closures
    const subscribeToLogsRef = useRef(subscribeToLogs);
    const setFullHistoryRef = useRef(setFullHistory);

    useEffect(() => { subscribeToLogsRef.current = subscribeToLogs; }, [subscribeToLogs]);
    useEffect(() => { setFullHistoryRef.current = setFullHistory; }, [setFullHistory]);

    // --- Manual Sync (push) ---
    const syncLogs = async () => {
        if (!user) return;
        const entries = getAllEntries();
        if (!entries || entries.length === 0) return;
        setIsSyncing(true);
        try {
            await syncLogsToCloud(entries);
            showSuccess("☁️ Synced to Firebase");
        } catch (err) {
            showError("Sync failed: " + (err.message || "Unknown error"));
        } finally {
            setIsSyncing(false);
        }
    };

    // --- Real-Time Firestore Listener ---
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToLogsRef.current((cloudLogsArray) => {
            if (!cloudLogsArray || cloudLogsArray.length === 0) return;

            const newHistory = {};
            cloudLogsArray.forEach(log => {
                const { date, id, updatedAt, ...rest } = log;
                newHistory[date] = rest.raw ? rest.raw : rest;
            });

            setFullHistoryRef.current(newHistory);
            setSynced(true);
            setTimeout(() => setSynced(false), 2000);
        });

        return () => unsubscribe();
    }, [user]);

    // --- Cloud Restore (pull) — batch-safe with per-entry error handling ---
    const restoreFromCloud = async () => {
        if (!user) return;
        setIsSyncing(true);
        try {
            const cloudLogs = await fetchLogsFromCloud();
            if (cloudLogs.length === 0) {
                showInfo('No cloud data found.');
                return;
            }

            // Phase 1: Batch-save all shift entries first
            const entries = cloudLogs.map(log => {
                const { id, date, updatedAt, ...data } = log;
                return { date: date || id, data };
            });
            for (const entry of entries) {
                saveEntry(entry.date, entry.data);
            }

            // Phase 2: Save leave data (best-effort, won't roll back shift entries)
            let leaveErrors = 0;
            const leaveEntries = entries.filter(e => e.data.activeLeave);
            if (leaveEntries.length > 0) {
                const { saveLeaveEntry } = await import('../utils/leaveHistory');
                for (const entry of leaveEntries) {
                    try {
                        saveLeaveEntry({
                            date: entry.date,
                            ...entry.data.activeLeave
                        });
                    } catch (leaveErr) {
                        leaveErrors++;
                        console.warn(`[SyncManager] Failed to restore leave for ${entry.date}:`, leaveErr);
                    }
                }
            }

            const msg = leaveErrors > 0
                ? `☁️ Restored ${cloudLogs.length} entries (${leaveErrors} leave entries failed)`
                : `☁️ Restored ${cloudLogs.length} entries from cloud`;
            showSuccess(msg);
        } catch (err) {
            showError('Restore failed: ' + (err.message || 'Unknown error'));
        } finally {
            setIsSyncing(false);
        }
    };

    return children({ syncLogs, restoreFromCloud, isSyncing, synced, setSynced });
}
