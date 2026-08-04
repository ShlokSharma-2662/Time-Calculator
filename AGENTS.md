# AGENTS.md

## Cursor Cloud specific instructions

### What this repo actually is

`CLAUDE.md` is **stale and misleading** — it describes an unrelated Python project ("Antigravity Kit / ui-ux-pro-max"). Ignore it. The real project is **WorkShift Calc**: a React 19 + Vite + Firebase PWA that turns pasted attendance logs into work-time/leave analytics. Treat `README.md` as the source of truth.

### Layout: three independent npm projects (not a workspaces monorepo)

| Surface | Path | Run in dev | Notes |
| --- | --- | --- | --- |
| Web app (primary product) | `/workspace` | `npm run dev` → http://localhost:5173 | Vite. Also `npm run build`, `npm run preview`, `npm run lint`. |
| Optional Express API (legacy) | `/workspace/server` | `JWT_SECRET=<any> node server.js` → :5000 | File-based storage in `/workspace/data/*.json`. **No web/mobile client calls it.** `JWT_SECRET` is required or auth routes fail. |
| Mobile companion | `/workspace/mobile` | `npm start` (Expo) | Read-only Firebase companion; needs a device/simulator, so not runnable headless. |

Each has its own `package.json` / lockfile; the update script installs all three.

### Non-obvious gotchas

- **Firebase is the real backend.** Web `.env` (committed, project `workshift-ws2026`) holds the `VITE_FIREBASE_*` config. Email/password auth is enabled and reachable from the cloud VM, so register/login works without extra setup. The app gates everything behind auth — you must sign in to reach the dashboard.
- **`npm run lint` currently reports ~518 pre-existing errors** across `src/`. This is the repo's existing state, not a setup problem; do not "fix" them unless asked.
- **Log parser is real-time by default.** When a pasted attendance log has **no date**, effective work is computed against the current system clock, so it shows `0h` until "now" is past the shift start. To see a completed day's totals (e.g. 8h work / 1h break), prepend a **past date line** (e.g. `2026-08-01`) to the log — then it's treated as historical and fully computed. Simple parseable log format is `HH:MM AM/PM IN` / `HH:MM AM/PM OUT`, one event per line.
- **The Leave Management view is hard-gated to a single hardcoded email** (`suttamshlok@gmail.com`) in `src/App.jsx`. Any other logged-in user only ever sees the Shift view; this is intentional, not a bug.
- **Mobile Google sign-in is incomplete:** `mobile/src/context/AuthContext.js` imports `expo-auth-session` / `expo-web-browser`, which are not declared in `mobile/package.json`. Add them before relying on Google login.
- No Dockerfiles, no CI workflows, and no automated test suites exist (`server`'s `npm test` is a placeholder that exits 1).
