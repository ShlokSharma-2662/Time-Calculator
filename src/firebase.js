import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID"
];

const missingKeys = requiredKeys.filter((key) => {
  const value = import.meta.env[key];
  return !value || String(value).trim().length === 0;
});

export let app = null;
export let auth = null;
export let db = null;
export let firebaseError = null;
export const isFirebaseEnabled = missingKeys.length === 0;

if (!isFirebaseEnabled) {
  firebaseError = new Error(
    `Firebase is disabled. Missing or empty env vars: ${missingKeys.join(", ")}`
  );
  console.warn("[firebase] Missing Firebase config:", firebaseError.message);
} else {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    firebaseError = error;
    console.error("[firebase] Initialization error:", error);
  }
}

export default app;
