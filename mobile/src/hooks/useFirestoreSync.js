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

  // Leaves listener
  useEffect(() => {
    if (!user) { setLeaves([]); return; }
    const q = query(
      collection(db, 'users', user.uid, 'leaves'),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeaves(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [user?.uid]);

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
