# Deployment

## Web app / PWA

```bash
npm run build
```

Deploy the generated `dist/` directory on your static host (Firebase Hosting, Netlify, Vercel, etc.).

## Browser extension — Spine sync

Load **`extension-src/`** (Manifest V3) to sync punches from Spine HRI into WorkShift Calc.

1. Open Chrome/Edge extensions → enable Developer mode.
2. **Load unpacked** → select `extension-src/`.
3. Open the PWA on an allowed origin (`localhost:5173`, `localhost:4173`, `*.web.app`, `*.firebaseapp.com`).
4. Use the extension popup **Sync today**, or the in-app **Sync from Spine** button.

Notes:

- Uses your Spine browser session by default (optional credential fallback in the popup).
- Writes `logInput` + `hrms*` keys into the PWA origin `localStorage` (same contract as existing HRMS sync UI).
- Does **not** use Express / Playwright. Paste remains the fallback when the extension is unavailable.

See [`extension-src/README.md`](../extension-src/README.md) for the manual test checklist.

## Browser extension — legacy UI popup

The repository also includes an `extension/` directory (older full-app popup build artifact).

1. Open Chrome/Edge extensions.
2. Enable Developer mode.
3. Use **Load unpacked** and select `extension/`.

If rebuilding from source, ensure manifest and build pipeline output aligns with the extension host expectations.

## Optional API

```bash
cd server
JWT_SECRET=... node server.js
```

For production, persist `server/data` so `users.json` and `logs.json` are not ephemeral.

## Mobile (Expo)

```bash
cd mobile
npm start
```

Use Expo tooling to run on simulator/device.

## Production caveats

- Restrict CORS in `server/` before public exposure.
- Configure CI/build for any deployment path you add.
- Keep OAuth client IDs consistent with Google platform configuration.
- Spine scrape breaks if the portal DOM / date-link format changes.
