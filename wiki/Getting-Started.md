# Getting Started

## What this project contains

WorkShift Calc is a **multi-surface shift intelligence workspace** with three active parts:

- **`src/`**: Main web app for attendance parsing, analytics, leave tooling, and sync.
- **`server/`**: Optional Express API for registration/login and log syncing via local JSON files.
- **`mobile/`**: Expo companion that reads Firebase data for Today, History, and Leave screens.

## Prerequisites

- Node.js `22.x` (or `>=20.19.0 <21 || >=22.12.0`)
- npm 10+
- Firebase project with Auth + Firestore
- Optional: Expo CLI / device for mobile testing

## Install

```bash
git clone <repository-url>
cd Time-Calculator

npm install
cd mobile && npm install
cd ../server && npm install
```

## Run targets

### Web app

```bash
cd <repo-root>
npm run dev
```

Runs at: `http://localhost:5173`.

### Optional API

```bash
cd server
export JWT_SECRET=your-secret
node server.js
```

Runs at: `http://localhost:5000`.

### Mobile

```bash
cd mobile
cp .env.example .env
npm start
```

## Environment setup

See **[Configuration](./Configuration.md)** for every required variable and known caveats.
