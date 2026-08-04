# Architecture

## System overview

WorkShift Calc uses a **client-first architecture**:

```text
User input (web/mobile) 
  -> React state + parsing/derived calculations
  -> localStorage (browser) for persistence
  -> Firebase Auth + Firestore for synced users/logs/settings
  -> Optional Express API (legacy/standalone JSON persistence)
```

## Web app architecture

- `src/main.jsx` bootstraps providers.
- `src/App.jsx` controls feature gating and navigation.
- `src/context/AuthContext.jsx` handles Firebase auth + sync helpers.
- `src/context/ShiftStateContext.jsx` stores derived shift/work/leave state.
- `src/context/UIContext.jsx` manages notifications and confirmations.
- Hooks under `src/hooks/` encapsulate parsing, analytics, settings, and history behavior.
- Components under `src/components/` render calculators, charts, modals, and dashboards.

## Data flow (web + mobile)

- Paste/import raw attendance log text in web app
- Parse in `attendanceLogParser` logic
- Persist per-day entry in localStorage for instant recovery
- Optional sync: write to Firestore (`users/{uid}/logs`)
- Mobile app consumes Firestore documents through `useFirestoreSync`

## Optional API service

The `server/` folder is a separate Node service and is currently not required by the main web/mobile clients:

- `POST /api/auth/register` / `POST /api/auth/login` issues JWT
- `GET /api/logs` reads file-backed logs for the token user
- `POST /api/logs/sync` upserts logs for that user

`server/db.js` reads/writes `data/users.json` and `data/logs.json`.

## Domain rules worth remembering

- If an attendance log line has no explicit date, parser calculations are treated relative to current date and time.
- `npm run lint` on web currently reports many pre-existing issues in the repository state.
