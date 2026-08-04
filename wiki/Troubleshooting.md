# Troubleshooting

## App won't start on web

1. Verify root dependencies: `npm install`.
2. Ensure `.env` exists with all required Firebase web keys.
3. Run `npm run dev` from repo root.

## Firebase auth not working

- Confirm Firebase project is active and Auth providers are enabled.
- Confirm web config keys in root `.env` match your project.

## Logs show `0h` or incomplete for current day

If pasted logs have no date, parser computes against current day and may show `0h` during active shifts.  
For fully calculated historical checks, prepend a date line first (for example, `2026-08-01`).

## Mobile Google sign-in issues

- Add missing dependencies referenced by `mobile/src/context/AuthContext.js` (`expo-auth-session`, `expo-web-browser`) in a fresh install.
- Validate Google client IDs in `mobile/.env`.

## API returns auth/500 errors

- Set `JWT_SECRET` before starting server.
- `server/data/*.json` must remain writable and available.

## Lint output

`npm run lint` has a number of pre-existing issues in this repository. It is currently expected and not part of basic onboarding.

## Leave section not visible

`LeaveManagement` is gated by a hardcoded email check in `src/App.jsx`; this is existing behavior.
