import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase';
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

const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
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
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    // Save user profile to Firestore on first Google login
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: cred.user.displayName,
        email: cred.user.email,
        photoURL: cred.user.photoURL,
        createdAt: new Date().toISOString()
      });
    }
    return cred.user;
  };

  const register = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      email,
      createdAt: new Date().toISOString()
    });
    setUser({ uid: cred.user.uid, name, email });
    return cred.user;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // --- Firestore Sync Methods ---
  const syncLogsToCloud = async (logs) => {
    if (!user) return;
    const batch = writeBatch(db);
    for (const log of logs) {
      const [date, data] = Array.isArray(log) ? log : [log.date, log];
      if (!date) continue;

      // Sanitize data specifically for Firestore (replaces undefined with key removal)
      const sanitizedData = JSON.parse(JSON.stringify(data));

      const ref = doc(db, 'users', user.uid, 'logs', date);
      batch.set(ref, {
        date,
        ...(typeof sanitizedData === 'object' ? sanitizedData : { raw: sanitizedData }),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    await batch.commit();
  };

  const fetchLogsFromCloud = async () => {
    if (!user) return [];
    const q = query(collection(db, 'users', user.uid, 'logs'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const subscribeToLogs = (callback) => {
    if (!user) return () => { };
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
