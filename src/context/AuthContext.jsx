import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db, firebaseError, isFirebaseEnabled } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { buildFirestoreLogDto } from '../utils/firestoreLogDto';

const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider();
const HAS_ACCOUNT_KEY = 'workshiftHasAccount';

function markHasAccount() {
  try { localStorage.setItem(HAS_ACCOUNT_KEY, 'true'); }
  catch (_e) { /* private mode */ }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const requireAuth = () => {
    if (!auth) {
      const message = firebaseError?.message || 'Firebase is not configured.';
      const err = new Error(message);
      err.code = 'app/firebase-unavailable';
      throw err;
    }
  };

  const requireFirestore = () => {
    if (!db) {
      const message = firebaseError?.message || 'Firestore is not available.';
      const err = new Error(message);
      err.code = 'app/firestore-unavailable';
      throw err;
    }
  };

  // Listen to Firebase auth state
  useEffect(() => {
    if (!isFirebaseEnabled || !auth) {
      if (!isFirebaseEnabled && firebaseError) {
        console.error("Auth disabled:", firebaseError.message);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        markHasAccount();
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    requireAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const loginWithGoogle = async () => {
    requireAuth();
    const cred = await signInWithPopup(auth, googleProvider);
    // Save user profile to Firestore on first Google login
    if (db) {
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: cred.user.displayName,
          email: cred.user.email,
          photoURL: cred.user.photoURL,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      console.warn("Firestore unavailable. Skipping user profile sync.");
    }
    return cred.user;
  };

  const register = async (name, email, password) => {
    requireAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    if (db) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        email,
        createdAt: new Date().toISOString()
      });
      console.log('User profile saved to Firestore.');
    } else {
      console.warn("Firestore unavailable. Skipping profile persistence.");
    }
    setUser({ uid: cred.user.uid, name, email });
    return cred.user;
  };

  const logout = async () => {
    if (!auth) {
      setUser(null);
      return;
    }
    await signOut(auth);
    setUser(null);
  };

  // --- Firestore Sync Methods ---
  const syncLogsToCloud = async (logs) => {
    if (!user) return;
    requireFirestore();
    const batch = writeBatch(db);
    for (const log of logs) {
      const [date, data] = Array.isArray(log) ? log : [log.date, log];
      if (!date) continue;

      // Full replace with a rules-compliant DTO (no merge — avoids leftover illegal keys)
      const payload = buildFirestoreLogDto(
        date,
        data && typeof data === 'object' ? data : { raw: data }
      );
      const ref = doc(db, 'users', user.uid, 'logs', date);
      batch.set(ref, payload);
    }
    await batch.commit();
  };

  const fetchLogsFromCloud = async () => {
    if (!user) return [];
    requireFirestore();
    const q = query(collection(db, 'users', user.uid, 'logs'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const subscribeToLogs = (callback) => {
    if (!user || !db) return () => { };
    const q = query(collection(db, 'users', user.uid, 'logs'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(logs);
    });
    return unsubscribe;
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, loginWithGoogle, register, logout,
      syncLogsToCloud, fetchLogsFromCloud, subscribeToLogs
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
