import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const trim = (value) => (typeof value === 'string' ? value.trim() : '');
const cleanEnv = (value) => {
  const trimmed = trim(value);
  // Strip accidental quotes/wrapping from Azure DevOps variable UI pastes
  return trimmed.replace(/^['"]+|['"]+$/g, '').trim();
};

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: cleanEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID)
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
  const value = cleanEnv(import.meta.env[key]);
  return !value;
});

const invalidApiKey = Boolean(
  firebaseConfig.apiKey
  && (
    firebaseConfig.apiKey.includes('$(')
    || !/^AIza[0-9A-Za-z_-]{35,}$/.test(firebaseConfig.apiKey)
  )
);
const invalidEnvKeys = [...missingKeys];
if (invalidApiKey) {
  invalidEnvKeys.push(
    firebaseConfig.apiKey.includes('$(')
      ? "VITE_FIREBASE_API_KEY (not expanded from pipeline variables)"
      : "VITE_FIREBASE_API_KEY (invalid format)"
  );
}
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
