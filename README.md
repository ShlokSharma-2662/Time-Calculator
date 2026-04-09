# 🚀 WorkShift

**WorkShift** is a full-stack productivity and shift-tracking platform consisting of a **React web app** and a **React Native mobile companion app**. It combines real-time Firebase sync, smart log parsing, leave management, and analytics into a premium glassmorphic UI.

## Detailed Summary

WorkShift is designed for employees who receive raw attendance or biometric logs from corporate HR systems but still have to manually figure out their real working time, break deductions, expected exit time, overtime, and leave impact. Instead of treating the day as a simple clock-in/clock-out pair, the app models the full workday by parsing every punch event and recalculating progress against the configured shift duration.

The main web app centers on a shared shift state. After authentication, a user can paste portal logs, let the parser extract the first in-time and intermediate in/out punches, and immediately see derived values such as effective work minutes, total break time, current shortfall or surplus, projected logout time, and month-to-date adherence. The dashboard, shift calculator, history modal, and analytics views all consume that same derived state, so changes in logs or settings propagate everywhere without requiring duplicate data entry.

Beyond daily tracking, the product also acts as a personal attendance and leave operations workspace. Historical entries can be reviewed, reloaded, edited, and exported. The leave area covers balance tracking, leave history, calendar views, imports, holiday support, sandwich leave checks, and earned leave encashment and projection utilities. Firebase authentication and Firestore synchronization provide cross-device persistence for the web and mobile clients, while local caching keeps the interface responsive during normal use. The mobile app focuses on read-only visibility into today's shift, attendance history, and leave balances, and the optional Express server provides a place for backend integrations or protected log-processing workflows when a standalone frontend is not sufficient.

---

## 📦 Monorepo Structure

```
workshift/
├── src/                   # Web app (React + Vite)
├── server/                # Express API server
├── mobile/                # Mobile companion app (Expo SDK 54)
├── firestore.rules        # Firestore security rules
└── public/                # Static assets
```

---

## 🌐 Web App

### What It Does

Corporate HR portals track biometric punches but rarely tell you **when you can leave** or **how many effective hours you've worked** after accounting for all breaks. WorkShift solves this by constantly monitoring your required hours, dynamically subtracting break time to give you a **True Effective Work Time** and an accurate countdown to shift end.

### Features

#### 🕒 Live Shift Calculator
- Auto-detects your first punch from pasted portal logs
- Calculates estimated exit time based on configured shift duration
- Deducts micro-breaks from effective work time in real-time
- Circular progress ring with overtime indicator

#### 📝 Smart Log Analyzer
- Paste raw biometric logs directly from your HR portal
- Regex engine extracts every In/Out punch even when table formatting is stripped
- Aggregates gap durations across the entire day
- Supports multiple log formats including decimal summaries

#### 📅 Attendance History
- Paginated history with date search and status filters
- Status badges: On-Time, Late Arrival, Short Shift
- Tap-to-expand detail view with graphical vertical timeline
- Edit mode to manually override shift data

#### 🏖️ Leave Management
- Full Day, 1st Half, 2nd Half, Short Time-Off leave types
- Virtual anchoring — leave adjusts your target hours and progress bars accurately
- Leave status stamped across dashboard and history

#### 📊 Analytics
- 52-week GitHub-style attendance heatmap
- SVG trend charts for effective hours and break time
- Month-to-Date (MTD) adherence tracking
- Weekly trend area chart

#### ☁️ Firebase Sync
- Real-time `onSnapshot` listeners across all devices
- Batch write sync with schema validation
- `localStorage` as instant cache with background sync

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19, Vite |
| Auth & DB | Firebase v11 (Auth + Firestore) |
| Styling | Tailwind CSS, Framer Motion |
| Icons | Lucide React |
| Server | Express (optional REST API) |

### Setup

```bash
# 1. Clone and install
npm install

# 2. Create .env
cp .env.example .env
# Fill in your Firebase config:
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_AUTH_DOMAIN=...
# VITE_FIREBASE_PROJECT_ID=...
# VITE_FIREBASE_STORAGE_BUCKET=...
# VITE_FIREBASE_MESSAGING_SENDER_ID=...
# VITE_FIREBASE_APP_ID=...

# 3. Run dev server
npm run dev

# 4. Build for production
npm run build
```

---

## 📱 Mobile App (`mobile/`)

A **read-only companion app** that syncs from the same Firestore backend. No data entry — just a clean, at-a-glance view of your shift, history, and leave balance.

### Screens

| Tab | Content |
|-----|---------|
| **Today** | Circular progress ring, active work time, break time, first in / last out, estimated exit, live overtime indicator, leave badge |
| **History** | Scrollable attendance list with mini bar chart (last 7 days), tap-to-expand daily detail |
| **Leaves** | Balance cards by category (EL, CO, CF, SL, CL), leave history list |

### Auth
- Email/password login using the same Firebase credentials as the web app
- Google Sign-In via `expo-auth-session`
- Auth token persisted across app restarts via AsyncStorage

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54, React Native 0.77 |
| Navigation | React Navigation v7 (bottom tabs) |
| Auth & DB | Firebase v11 — read-only `onSnapshot` |
| Icons | `@expo/vector-icons` (Ionicons) |

### Setup

```bash
cd mobile

# 1. Install dependencies
npm install

# 2. Create .env
copy .env.example .env
# Fill in Firebase config (EXPO_PUBLIC_ prefix) + Google OAuth client IDs

# 3. Run
npx expo start

# Scan the QR code with Expo Go on your phone
# or press 'a' for Android emulator / 'i' for iOS simulator
```

### Environment Variables

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...

# Google Sign-In (from Google Cloud Console)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
```

---

## 🔒 Security

- Firestore rules enforce per-user read/write with field-level validation
- Server-side log validation: size limits, prototype pollution sanitization, max 500 entries per sync
- Financial passcodes hashed with SHA-256 (never stored in plaintext)
- Mobile app is strictly read-only — no Firestore writes from mobile client

---

## 🗺️ Roadmap

- [ ] Push notifications (shift reminders, CO expiry alerts)
- [ ] Biometric unlock (Face ID / Fingerprint)
- [ ] iOS Widget / Android Glance for shift progress
- [ ] Leave request submission from mobile
- [ ] Monthly analytics dashboard on mobile
- [ ] Apple Watch / Wear OS complication

---

## ✍️ Author

**[Shlok Sharma](https://github.com/ShlokSharma-2662)**
*Re-engineering productivity tracking — because knowing exactly when you can go home shouldn't involve mental math.*
