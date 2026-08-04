# Contributing

## Before you start

- Read existing `README.md` and this wiki first.
- Keep changes scoped to the surface you touch (`src/`, `mobile/`, or `server/`).

## Recommended workflow

1. Create a focused branch.
2. Make minimal, targeted changes.
3. Run relevant checks for that surface.
4. Update docs in both code and wiki when behavior changes.

## Surface-specific checks

### Web

- `npm run dev`
- `npm run build`
- `npm run lint`

### Mobile

- `npm start` (Expo dev server)
- Validate on device/emulator when changing auth/firestore sync.

### API

- `cd server && npm start`
- Smoke test `register/login/logs/sync` flows.

## Style expectations

- Preserve existing behavior and storage contracts unless migration is intentional.
- Keep naming and data fields stable (`date`, `effectiveWorkTime`, etc.) unless there is a coordinated schema plan.
- Prefer small commits with clear intent.
