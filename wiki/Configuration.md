# Configuration

## Web app (`.env`)

Create `/.env` in repo root with Firebase web config values used by `src/firebase.js`.

| Key | Required | Purpose |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | Optional Analytics ID |

## Mobile (`mobile/.env`)

Copy `mobile/.env.example` to `mobile/.env`.

Key variables:

- `EXPO_PUBLIC_FIREBASE_*` — Firebase config for mobile
- `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` — required only if using Google sign-in

## API (`server`)

Set one variable before running the API:

| Key | Required | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | Yes | Signs/verifies JWTs in `server/routes/auth.js` and `server/routes/logs.js` |

> Without `JWT_SECRET`, auth endpoints in `server` will fail.

## Notes and project-specific caveats

- `mobile/src/context/AuthContext.js` currently imports `expo-auth-session` and `expo-web-browser`. Add those packages if you plan to use Google sign-in on mobile.
- The mobile app reads Google sign-in IDs from `mobile/.env`.
- Web auth is Firebase-based and currently requires a valid Firebase project setup.
- Leave management in web is intentionally gated to one hardcoded email in `src/App.jsx` (existing behavior).
