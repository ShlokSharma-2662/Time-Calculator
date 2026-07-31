import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

/**
 * Read-only Firestore listeners for logs, leaves, and settings.
 */
export function useFirestoreSync() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [legacyLeaves, setLegacyLeaves] = useState([]);
  const [legacyImportLeaves, setLegacyImportLeaves] = useState([]);
  const [settings, setSettings] = useState({ shiftDuration: 9, use24Hour: false });
  const [loading, setLoading] = useState(true);

  // Logs listener
  useEffect(() => {
    if (!user) { setLogs([]); return; }
    const q = query(
      collection(db, 'users', user.uid, 'logs'),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsubscribe;
  }, [user?.uid]);

  // Leaves listeners (canonical + legacy)
  useEffect(() => {
    if (!user) {
      setLeaves([]);
      setLegacyLeaves([]);
      setLegacyImportLeaves([]);
      return;
    }

    const legacyQ = query(
      collection(db, 'users', user.uid, 'leaves'),
      orderBy('date', 'desc')
    );
    const legacyImportQ = query(
      collection(db, 'users', user.uid, 'leaveHistory'),
      orderBy('date', 'desc')
    );

    const legacyUnsub = onSnapshot(legacyQ, (snapshot) => {
      setLegacyLeaves(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const legacyImportUnsub = onSnapshot(legacyImportQ, (snapshot) => {
      setLegacyImportLeaves(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      legacyUnsub();
      legacyImportUnsub();
    };
  }, [user?.uid]);

  useEffect(() => {
    const merged = [...legacyLeaves, ...legacyImportLeaves];
    const byKey = new Map();

    merged.forEach((entry) => {
      const date = entry.transactionDate || entry.date || '';
      const type = entry.leaveType || entry.category || entry.type || '';
      const kind = entry.transactionType || (entry.type === 'Credit' ? 'credit' : 'leave_taken');
      const magnitude = Math.abs(entry.days || entry.consumedDays || entry.creditDays || 0);
      const key = `${entry.id || `${date}_${type}_${kind}_${magnitude}`}`;
      byKey.set(key, entry);
    });

    const normalized = Array.from(byKey.values());
    normalized.sort((a, b) => {
      const dateA = new Date(a.transactionDate || a.date || 0).getTime();
      const dateB = new Date(b.transactionDate || b.date || 0).getTime();
      return dateB - dateA;
    });

    setLeaves(normalized);
  }, [legacyLeaves, legacyImportLeaves]);

  // Settings (one-time read, re-read on user change)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'preferences'));
        if (settingsDoc.exists()) {
          setSettings((prev) => ({ ...prev, ...settingsDoc.data() }));
        }
      } catch { /* use defaults */ }
    })();
  }, [user?.uid]);

  return { logs, leaves, settings, loading };
}
