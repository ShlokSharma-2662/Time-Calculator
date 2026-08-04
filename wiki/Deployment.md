# Deployment

## Web app / PWA

```bash
npm run build
```

Deploy the generated `dist/` directory on your static host (Firebase Hosting, Netlify, Vercel, etc.).

## Browser extension

The repository includes an `extension/` directory (built artifact).

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
