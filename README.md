# WorkShift Calc

A multi-surface shift intelligence workspace for employees who need to turn raw attendance logs into work-time, leave, and encashment insights.

![Build](https://img.shields.io/badge/build-no%20CI-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-0.0.0-blue)
![Stack](https://img.shields.io/badge/stack-React%2019%20%7C%20Firebase%20%7C%20Expo%2054%20%7C%20Express%205-success)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running Locally](#running-locally)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Architecture Overview](#architecture-overview)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements / Credits](#acknowledgements--credits)

## Overview

WorkShift Calc helps people who receive raw biometric or HR attendance logs but still have to manually answer practical questions such as "When can I leave?", "How much effective work time have I completed?", and "How does today's leave affect my target hours?" The repository contains:

- A React 19 + Vite web app for log parsing, analytics, leave tracking, holiday management, and EL encashment planning.
- A React Native + Expo mobile companion app that reads the same Firebase data and surfaces today, history, and leave views.
- An optional Express API that offers JWT-protected auth and log sync backed by JSON files in `data/`.
- A browser-extension bundle under `extension/` that packages the web UI as a Manifest V3 popup.

What makes the project notable is its hybrid persistence model. The main web app works from local state and `localStorage`, can batch-sync daily log data into Firestore, and ships a separate file-based API for standalone scenarios. That makes it useful for both personal tracking and incremental backend integration.

## Features

- Parses pasted attendance logs into first-in, last-out, total break time, effective work time, and projected exit time.
- Auto-saves working state to `localStorage` and can push per-day logs to Firestore through batched writes.
- Computes real-time progress, overtime, month-to-date adherence, weekly trends, and heatmap-style analytics.
- Maintains an editable attendance history with filtering, pagination, modal drill-downs, and CSV export.
- Tracks leave usage with balance tables, quick leave registration, holiday-aware sandwich leave evaluation, and custom holiday management.
- Imports leave data from HR XLS/XLSX exports or CSV templates with deduplication before writing to Firestore.
- Includes EL encashment, salary structure, and privacy-mode calculations backed by hashed local passcodes.
- Provides a mobile read-only companion with Firebase-backed Today, History, and Leaves screens.
- Exposes a JWT-based Express API for user registration, login, log retrieval, and batch log sync using local JSON storage.
- Ships PWA metadata plus a ready-to-load browser extension bundle.

## Tech Stack

| Category | Technology | Purpose |
| --- | --- | --- |
| Web app | React 19, Vite 7 | Main SPA for shift tracking, analytics, and leave workflows |
| Styling and motion | Tailwind CSS 4, Framer Motion | Layout, theming, animation, and glassmorphic UI treatments |
| Auth and cloud data | Firebase Auth, Cloud Firestore | Email/Google sign-in and per-user cloud synchronization |
| Mobile app | Expo SDK 54, React Native 0.77, React Navigation 7 | Cross-platform mobile companion app |
| Data import/export | `xlsx`, `papaparse` | HR leave import from spreadsheet and CSV sources |
| Analytics visuals | Recharts, custom charts, Lucide React, Ionicons | Dashboards, progress rings, and iconography |
| Optional API | Express 5, `jsonwebtoken`, `bcryptjs` | JWT-protected auth and JSON-file log sync |
| Local persistence | `localStorage`, AsyncStorage, JSON files in `data/` | Offline caching, saved settings, and server-side file storage |
| Tooling | ESLint 9, PostCSS, `vite-plugin-pwa` | Linting, CSS processing, and PWA build output |

## Project Structure

```text
.
|-- src/
|   |-- main.jsx                    # Web entry point
|   |-- App.jsx                     # App shell, auth gating, view switching
|   |-- firebase.js                 # Firebase client initialization for the web app
|   |-- components/
|   |   |-- auth/                   # Login and registration screens
|   |   |-- AttendanceLog.jsx       # Editable attendance history and modal drill-downs
|   |   |-- LeaveManagement.jsx     # Leave dashboard, import, salary, and projections
|   |   |-- LogAnalyzer.jsx         # Raw log textarea and parsed activity timeline
|   |   `-- SyncManager.jsx         # Render-prop wrapper for Firestore sync and restore
|   |-- context/
|   |   |-- AuthContext.jsx         # Firebase auth plus log sync helpers
|   |   |-- ShiftStateContext.jsx   # Shared shift state, autosave, and derived calculations
|   |   `-- UIContext.jsx           # Toasts and confirmation dialogs
|   |-- hooks/                      # Shift parsing, history, local storage, and financial hooks
|   |-- utils/                      # Leave import, holiday logic, encashment, and backup helpers
|   `-- data/                       # Seed data used by leave workflows
|-- server/
|   |-- server.js                   # Express bootstrap and route mounting
|   |-- db.js                       # File-based persistence using data/users.json and data/logs.json
|   |-- routes/
|   |   |-- auth.js                 # Register/login endpoints with JWT issuance
|   |   `-- logs.js                 # Authenticated fetch and batch sync for logs
|   `-- models/                     # Legacy Mongoose schemas retained in the repo
|-- mobile/
|   |-- App.js                      # Expo entry point and bottom-tab navigation
|   |-- app.json                    # Expo app metadata and package IDs
|   |-- .env.example                # Mobile Firebase and Google OAuth variable template
|   `-- src/
|       |-- context/AuthContext.js  # Mobile auth state and Google sign-in wiring
|       |-- hooks/useFirestoreSync.js # Read-only Firestore listeners for logs, leaves, settings
|       `-- screens/                # Today, History, Leaves, and Login screens
|-- public/
|   |-- manifest.json               # Manifest V3 extension manifest copied into web builds
|   `-- pwa-*.png                   # Shared icons for PWA and extension packaging
|-- extension/                      # Committed browser-extension build artifact
|-- data/
|   |-- users.json                  # File-based API users
|   `-- logs.json                   # File-based API logs
|-- firestore.rules                 # Firestore access rules
|-- index.html                      # Vite HTML shell with CSP rules
`-- package.json                    # Root web-app scripts and dependencies
```

## Prerequisites

- Node.js 22.x is the safest choice. Both `.node-version` and `.nvmrc` contain `22`, while the root web app allows `>=20.19.0 <21 || >=22.12.0`.
- npm 10+ is recommended. All three lockfiles use `lockfileVersion: 3`.
- A Firebase project configured for Authentication and Firestore. The checked-in env files target `workshift-ws2026`.
- Expo Go or an Android/iOS simulator if you want to run the mobile app.
- Google OAuth client IDs if you want Google sign-in on mobile.
- A persistent writable filesystem for `data/` if you plan to run the optional Express API in anything beyond a throwaway local session.

## Getting Started

### Installation

⚠️ **Assumption:** The repository's Git remote URL is not stored in the scanned files, so replace `<repository-url>` with your actual remote.

```bash
git clone <repository-url>
cd Time-Calculator

npm install

cd mobile
npm install

cd ../server
npm install
```

### Environment Setup

#### Web app (`./.env`)

The root project does not include a checked-in `.env.example`, so create `.env` manually in the repository root.

| Name | Description | Example value | Required |
| --- | --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key used by `src/firebase.js` | `AIzaSyCHVAT1hH4VnjrNgXH_HN_4A37ZDBno2w4` | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain for the web app | `workshift-ws2026.firebaseapp.com` | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firestore project ID | `workshift-ws2026` | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | `workshift-ws2026.firebasestorage.app` | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID | `178374041836` | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID | `1:178374041836:web:074f66fe1a6f1e948e05c9` | Yes |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID | `G-6HZ91VHMNB` | No |

#### Mobile app (`mobile/.env`)

Copy `mobile/.env.example` to `mobile/.env`.

| Name | Description | Example value | Required |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API key for Expo | `AIzaSyCHVAT1hH4VnjrNgXH_HN_4A37ZDBno2w4` | Yes |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain for mobile sign-in | `workshift-ws2026.firebaseapp.com` | Yes |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firestore project ID | `workshift-ws2026` | Yes |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | `workshift-ws2026.firebasestorage.app` | Yes |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID | `178374041836` | Yes |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase mobile app ID | `1:178374041836:web:074f66fe1a6f1e948e05c9` | Yes |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth client ID for web auth-session flow | `your_web_client_id.apps.googleusercontent.com` | Optional unless using Google sign-in |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth client ID for iOS | `your_ios_client_id.apps.googleusercontent.com` | Optional unless using Google sign-in |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth client ID for Android | `your_android_client_id.apps.googleusercontent.com` | Optional unless using Google sign-in |

⚠️ **Assumption:** The Google OAuth client IDs are genuinely unknown from the repository because `mobile/.env.example` contains placeholders and no checked-in `mobile/.env` values for them.

⚠️ **Assumption:** `mobile/src/context/AuthContext.js` imports `expo-auth-session` and `expo-web-browser`, but those packages are not declared in `mobile/package.json`. Add them before relying on Google sign-in in a fresh install.

#### Optional Express API (`server/.env` or shell environment)

There is no checked-in `server/.env.example`, but the server expects the following:

| Name | Description | Example value | Required |
| --- | --- | --- | --- |
| `JWT_SECRET` | Secret used to sign and verify JWTs in `server/routes/auth.js` and `server/routes/logs.js` | `b1e6b18b4b6149499d0d2a3b6af5a8de01e8d7fcb0b8e16d2c15f6c8a4c9b51e` | Yes |
| `EXTENSION_ID` | Optional allowlist check for `x-extension-id` header on `/api/extension/sync-logs` | `abcdefghijklmnopabcdefghijklmnop` | No |
| `PORT` | Express listen port | `5000` | No |

### Running Locally

#### 1. Web app

```bash
npm run dev
```

The Vite dev server runs on `http://localhost:5173` by default.

#### 2. Optional Express API

```bash
cd server
export JWT_SECRET="b1e6b18b4b6149499d0d2a3b6af5a8de01e8d7fcb0b8e16d2c15f6c8a4c9b51e"
node server.js
```

The API listens on `http://localhost:5000` unless `PORT` is overridden.

#### 3. Mobile app

```bash
cd mobile
cp .env.example .env
npm start
```

Expo launches the Metro bundler and device dashboard. In a default Expo setup this is typically available on `http://localhost:8081`.

⚠️ **Assumption:** No custom Expo port is configured in `mobile/app.json`, so the README assumes Expo's default Metro behavior.

## Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| `web:dev` | `npm run dev` | Start the Vite web app in development mode |
| `web:build` | `npm run build` | Create a production web build in `dist/` |
| `web:lint` | `npm run lint` | Run ESLint across the web source |
| `web:preview` | `npm run preview` | Serve the production web build locally |
| `mobile:start` | `cd mobile && npm start` | Start Expo Metro and the mobile dev dashboard |
| `mobile:android` | `cd mobile && npm run android` | Open the Expo app in an Android target |
| `mobile:ios` | `cd mobile && npm run ios` | Open the Expo app in an iOS target |
| `mobile:web` | `cd mobile && npm run web` | Run the Expo app in a browser |
| `server:test` | `cd server && npm test` | Placeholder script that currently exits with an error |
| `server:start` | `cd server && node server.js` | Manual server start command because no npm start script is defined |

## API Reference

The only explicit API surface in the repository is the optional Express app under `server/`.

| Method | Route | Description | Auth required? |
| --- | --- | --- | --- |
| `GET` | `/` | Health/info endpoint returning the API version string | No |
| `POST` | `/api/auth/register` | Create a user and return a 7-day JWT | No |
| `POST` | `/api/auth/login` | Authenticate a user and return a 7-day JWT | No |
| `GET` | `/api/logs` | Fetch all logs for the authenticated user, sorted descending by date | Yes (`x-auth-token`) |
| `POST` | `/api/logs/sync` | Upsert up to 500 log entries for the authenticated user | Yes (`x-auth-token`) |
| `POST` | `/api/extension/sync-logs` | Idempotent background sync endpoint for Chrome extension attendance logs | Yes (`x-auth-token`) |

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Asha Shah",
  "email": "asha@example.com",
  "password": "correct-horse-battery-staple"
}
```

```json
{
  "token": "<jwt>",
  "user": {
    "id": "1774502639727",
    "name": "Asha Shah",
    "email": "asha@example.com"
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "asha@example.com",
  "password": "correct-horse-battery-staple"
}
```

```json
{
  "token": "<jwt>",
  "user": {
    "id": "1774502639727",
    "name": "Asha Shah",
    "email": "asha@example.com"
  }
}
```

### Batch log sync

```http
POST /api/logs/sync
x-auth-token: <jwt>
Content-Type: application/json

{
  "logs": [
    [
      "2026-02-04",
      {
        "startTime": "07:55",
        "logInput": "04-Feb-26\t07:55 AM\tIn\t...",
        "totalOutTime": 2,
        "effectiveWorkTime": 151,
        "firstInTime": "07:55",
        "lastOutTime": "10:28"
      }
    ]
  ]
}
```

```json
{
  "msg": "Sync successful"
}
```

### Extension background sync

```http
POST /api/extension/sync-logs
x-auth-token: <jwt>
x-extension-id: <chrome-extension-id>   # required only when EXTENSION_ID is configured
Content-Type: application/json

{
  "source": "chrome-extension",
  "deviceId": "ext-laptop-work",
  "logs": [
    {
      "date": "2026-07-16",
      "in": "09:03",
      "out": "18:11",
      "breakMinutes": 42,
      "idempotencyKey": "2026-07-16|09:03|18:11|42"
    }
  ]
}
```

```json
{
  "msg": "Extension sync successful",
  "inserted": 1,
  "updated": 0,
  "skipped": 0,
  "serverTime": "2026-07-16T11:10:05.217Z"
}
```

## Database Schema

### Firestore collections used by the web and mobile apps

| Path | Key fields | Notes |
| --- | --- | --- |
| `users/{uid}` | `name: string`, `email: string`, `photoURL?: string`, `createdAt: string` | Created on web registration and first Google login |
| `users/{uid}/logs/{date}` | `date: string`, `startTime: string`, `logInput: string`, `totalOutTime: number`, `effectiveWorkTime: number`, `firstInTime: string`, `lastOutTime: string`, `activeLeave?: object`, `updatedAt: string`, `raw?: any` | Main per-day cloud sync target for the web app and read target for mobile Today/History |
| `users/{uid}/settings/preferences` | `shiftDuration: number`, `use24Hour: boolean` | Read by the mobile app; web settings are also cached locally |
| `users/{uid}/leaves/{leaveId}` | `date: string`, `type: string`, `duration: number`, `half?: string`, `reason?: string`, `startTime?: string`, `endTime?: string`, `createdAt`, `updatedAt` | Allowed by `firestore.rules` and read by the mobile Leaves tab |
| `users/{uid}/leaveHistory/{id}` | `leaveType`, `transactionType`, `consumedDays`, `creditDays`, `days`, `date`, `remarks`, `source`, `type`, `importedAt`, `schemaVersion` | Written by the web leave-import utilities |
| `users/{uid}/importMeta/leaveImport` | `lastImportedAt`, `totalRecords` | Leave import metadata document |

### File-based API storage used by the optional Express server

| File | Shape | Notes |
| --- | --- | --- |
| `data/users.json` | Array of `{ id, name, email, password, createdAt }` | Passwords are bcrypt-hashed during register |
| `data/logs.json` | Array of `{ userId, date, updatedAt, ...logFields }` | Upserted by `server/routes/logs.js` on `userId + date` |
| `data/ext-sync-keys.json` | Array of `{ userId, key, createdAt }` | Idempotency ledger used by `/api/extension/sync-logs` |

### Relationships

- One authenticated user owns many daily log documents.
- One authenticated user is expected to own one settings document at `settings/preferences`.
- One authenticated user may own many leave documents and many imported leave-history records.
- The file-based API mirrors a simpler one-to-many relationship between users and logs using JSON arrays.

⚠️ **Assumption:** The leave subsystem appears to be mid-migration. `firestore.rules` explicitly permit `users/{uid}/leaves`, but the web leave-import path writes to `users/{uid}/leaveHistory` and `users/{uid}/importMeta`, which are not covered by the current rules file.

⚠️ **Assumption:** The mobile app reads `users/{uid}/leaves`, while most of the web leave analytics work from `localStorage` and the imported `leaveHistory` collection. Expect schema alignment work before treating the leave model as stable across all clients.

## Architecture Overview

The project is organized as a client-first system with optional backend augmentation:

1. `src/main.jsx` bootstraps the web app and wraps it with Firebase auth, UI, and shift-state providers.
2. `ShiftStateContext` combines the raw log parser, time calculations, local persistence, and autosave behavior into one shared state graph.
3. Every meaningful change to the active day is saved into `localStorage`; if a Firebase user is logged in, the current day can also be written to Firestore via `AuthContext` and `SyncManager`.
4. Leave features split across local storage, Firestore imports, and holiday utilities. The import path normalizes spreadsheet data and batches writes through Firestore.
5. The mobile app does not calculate or mutate shift data locally. It subscribes read-only to Firestore logs, leaves, and settings through `useFirestoreSync`.
6. The Express API is a separate service surface with its own auth model and persistence layer. No current web or mobile source files call `/api/*`, so it should be treated as optional or legacy integration infrastructure.

Notable patterns used in the codebase:

- React Context providers for auth, UI, and shift state
- Hook-based derivation for parsing, analytics, history, and financial calculations
- Render-prop composition in `SyncManager`
- Client-side optimistic persistence through `localStorage` backed by background sync
- Batch writes and real-time subscriptions in Firestore

## Deployment

No Dockerfiles, CI workflows, host-specific config files, or release pipelines are checked into this repository. The sections below reflect the deployment paths implied by the current code.

### Web app / PWA

```bash
npm install
npm run build
```

Deploy the generated `dist/` folder to any static host that can serve a single-page application. The repository does not include Firebase Hosting, Netlify, Vercel, or nginx config, so routing and caching rules must be supplied by the deployment platform.

### Browser extension

The repository already contains a committed build artifact in `extension/`.

1. Open Chrome or Edge extensions.
2. Enable Developer Mode.
3. Choose **Load unpacked**.
4. Select the `extension/` directory.

⚠️ **Assumption:** `extension/` is a packaged output rather than a separately maintained source package. The web build also ships `public/manifest.json`, so you can likely regenerate an unpacked extension from a fresh Vite build, but there is no checked-in automation for that step.

Example MV3 background-sync wiring:

```json
{
  "manifest_version": 3,
  "name": "WorkShift Sync",
  "version": "1.0.0",
  "permissions": ["alarms", "storage"],
  "host_permissions": ["https://your-api-host.example.com/*"],
  "background": { "service_worker": "service_worker.js" }
}
```

```js
// service_worker.js
const API_BASE = 'https://your-api-host.example.com';
const SYNC_ALARM = 'workshift-sync';

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== SYNC_ALARM) return;
  const { token, deviceId, extensionId, pendingLogs = [] } = await chrome.storage.local.get([
    'token', 'deviceId', 'extensionId', 'pendingLogs'
  ]);
  if (!token || !deviceId || pendingLogs.length === 0) return;

  const response = await fetch(`${API_BASE}/api/extension/sync-logs`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-auth-token': token,
      'x-extension-id': extensionId || chrome.runtime.id
    },
    body: JSON.stringify({
      source: 'chrome-extension',
      deviceId,
      logs: pendingLogs
    })
  });

  if (response.ok) {
    await chrome.storage.local.set({ pendingLogs: [] });
  }
});
```

### Optional Express API

```bash
cd server
npm install
export JWT_SECRET="b1e6b18b4b6149499d0d2a3b6af5a8de01e8d7fcb0b8e16d2c15f6c8a4c9b51e"
node server.js
```

Deployment notes:

- Persist the top-level `data/` directory, or user and log data will be lost on restart.
- Review CORS policy before exposing the API publicly; the current code enables unrestricted `cors()`.
- `server/package.json` still declares `main: "index.js"` even though the actual entry point is `server.js`.

### Mobile app

Only development-time Expo configuration is present in the repository.

```bash
cd mobile
npm install
npx expo start
```

⚠️ **Assumption:** Production mobile distribution is not fully wired up. There is no `eas.json`, store metadata, or build automation, so App Store / Play Store releases will require extra Expo/EAS setup outside this repository.

## Testing

Current testing coverage is manual only.

- No root-level test runner, test files, or coverage configuration were found for the web app.
- The mobile app also has no automated tests checked in.
- `cd server && npm test` currently runs the placeholder script from `server/package.json` and exits with `Error: no test specified`.
- Manual verification should cover web auth, log parsing, Firestore sync, leave imports, mobile read-only sync, and API smoke tests.

Coverage expectations are therefore undefined today.

## Contributing

1. Fork the repository and create a focused branch such as `feature/leave-import-fixes` or `fix/mobile-auth`.
2. Install dependencies for the surface you plan to modify:

```bash
npm install
cd mobile && npm install
cd ../server && npm install
```

3. Run the relevant development target and validate the affected workflows manually.
4. Run linting before opening a PR:

```bash
npm run lint
```

5. Keep changes scoped to the appropriate area:

- `src/` for the web app
- `mobile/src/` for the Expo app
- `server/` for the optional API
- `firestore.rules` when cloud schema or access changes

Code style guidance from the repository:

- Follow the ESLint configuration in `eslint.config.js`.
- Use modern React function components and hooks.
- Preserve existing storage keys and Firestore field names unless your change intentionally migrates them.
- Update this README when you add new environment variables, collections, or deployment steps.

⚠️ **Assumption:** No commit message convention is documented in the repository. Use concise, imperative commit titles such as `Add mobile leave sync fallback` or `Fix log batch validation`.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 ShlokSharma-2662.

Note: `server/package.json` still declares `ISC` in its local metadata. Update it to `MIT` if you want the server package to match the repository-wide license.

## Acknowledgements / Credits

- Firebase for authentication and real-time Firestore synchronization
- Expo and React Native for the mobile companion shell
- Vite and React for the web application runtime
- Recharts, Framer Motion, Lucide React, and Ionicons for analytics visuals and UI presentation
