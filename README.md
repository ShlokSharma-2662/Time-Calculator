# WorkShift Calc

WorkShift Calc is a local-first React utility for tracking workdays, parsing attendance logs, and planning leave. It combines a shift calculator, attendance analyzer, leave tools, and lightweight history export in a single browser-based app.

## What It Does

### Shift Calculator

- Calculates full-day, half-day, and short-leave exit times from a chosen start time
- Lets you change shift duration and toggle 12-hour or 24-hour formatting
- Auto-syncs the start time from parsed attendance logs when an `IN` entry is detected
- Shows current work progress visually during the day

### Attendance Log Analyzer

- Parses raw biometric or HR log text, including messy pasted input
- Calculates effective work time after subtracting breaks
- Identifies break windows between `OUT` and `IN` entries
- Displays a visual timeline of work and break segments
- Supports copying summarized results for reporting

### Leave Management

- `EL Encashment Calculator` for carry-forward and encashable earned leave estimates
- `Sandwich Leave Checker` to evaluate whether weekends or holidays get counted as leave
- `Smart Analytics` for leave insights, risk indicators, and date suggestions
- Leave balance and leave-planning history stored locally for later reuse

### History and Persistence

- Saves shift inputs, log text, theme, selected view, and settings in browser storage
- Auto-saves day-wise shift history
- Exports saved shift history to CSV
- Works fully client-side with no backend dependency

## Tech Stack

- React 19
- Vite 7
- Tailwind CSS 4
- Framer Motion
- Lucide React
- `vite-plugin-pwa` for installable PWA support

## Project Structure

```text
src/
  components/    UI modules for shift, logs, leave, history, and analytics
  hooks/         Custom hooks for calculations, parsing, history, toast state
  utils/         Pure logic for leave rules, EL calculations, and persistence helpers
public/          PWA assets and manifest
extension/       Built browser-extension style popup package
```

## Running Locally

### Prerequisites

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Start The Dev Server

```bash
npm run dev
```

The app will run through Vite's local development server.

### Build Production Assets

```bash
npm run build
```

### Preview The Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## PWA and Extension Notes

- The app is configured as a Progressive Web App through [`vite.config.js`](/D:/Azure%20DevOps/WorkShift/Time-Calculator/vite.config.js).
- Manifest assets for the web app live in [`public/manifest.json`](/D:/Azure%20DevOps/WorkShift/Time-Calculator/public/manifest.json).
- A packaged browser popup build is present in the [`extension/`](/D:/Azure%20DevOps/WorkShift/Time-Calculator/extension) folder with its own manifest at [`extension/manifest.json`](/D:/Azure%20DevOps/WorkShift/Time-Calculator/extension/manifest.json).

## Local Storage Behavior

The app stores data in the browser using `localStorage`, including:

- start time and pasted log input
- theme preference
- shift duration and time-format preference
- active view selection
- shift history and leave-related history

No server-side persistence is required for normal use.

## Typical Workflow

1. Enter or auto-detect the day's start time.
2. Paste attendance logs to compute effective work time and breaks.
3. Review end-of-day milestones and progress.
4. Save or export history when needed.
5. Switch to leave tools for EL planning or sandwich-rule checks.

## Repository Notes

- The current UI branding uses the title `Daily Calculations` inside the app, while the package and repository identify the project as `WorkShift Calc`.
- Some leave-policy text is tailored to FY 2025-26 and should be adjusted if policy assumptions change.

## Author

[Shlok Sharma](https://github.com/ShlokSharma-2662)
