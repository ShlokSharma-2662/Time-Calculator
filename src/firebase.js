import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const trim = (value) => (typeof value === 'string' ? value.trim() : '');

const firebaseConfig = {
  apiKey: trim(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: trim(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: trim(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: trim(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: trim(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: trim(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: trim(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID)
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

const invalidApiKey = firebaseConfig.apiKey && !/^AIza[0-9A-Za-z_-]{35,}$/.test(firebaseConfig.apiKey);
const invalidEnvKeys = [...missingKeys];
if (invalidApiKey) invalidEnvKeys.push("VITE_FIREBASE_API_KEY (invalid format)");

export let app = null;
export let auth = null;
export let db = null;
export let firebaseError = null;
export const isFirebaseEnabled = invalidEnvKeys.length === 0;

if (!isFirebaseEnabled) {
  firebaseError = new Error(
    `Firebase is disabled. Missing or invalid env vars: ${invalidEnvKeys.join(", ")}`
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
