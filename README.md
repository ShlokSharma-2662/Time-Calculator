# WorkShift Calc

WorkShift Calc is a smart, productivity-focused utility application designed to help professionals manage their daily work schedules and analyze attendance logs efficiently.

## Features

### 🕒 Smart Shift Calculator

Calculate your work day milestones instantly based on your start time.

- **Full Day**: Calculates the time you complete a standard shift (Default: 9 hours).
- **Half Day**: Identifies the mid-point of your shift.
- **Short Leave**: Tells you when you can leave if taking a short leave (Full Day - 90 mins).
- **Auto-Sync**: Automatically updates your start time if you paste logs containing an "IN" time.

### 📊 Attendance Log Analyzer

Make sense of unstructured, messy attendance logs.

- **Messy Log Parsing**: Pasting raw logs (e.g., `09:56 AMIn 12:30 PMOut`) automatically extracts valid time entries.
- **Effective Work Time**: Calculates your net working hours, excluding breaks.
- **Break Analysis**: Identifies all breaks taken (time between OUT and IN) and sums them up.
- **Visual Timeline**: A color-coded progress bar visualizes your work blocks (Green) and breaks (Yellow) for the day.

### ⚙️ Customizable Settings

Tailor the app to your specific work policies.

- **Shift Duration**: Adjust the "Full Day" length (e.g., 8 hours, 8.5 hours, 9 hours).
- **Time Format**: Toggle between 12-hour (AM/PM) and 24-hour clock formats.
- **Dark Mode**: Fully supported dark theme for comfortable viewing in low light.

### 💾 Local Persistence

- Your preferences (Settings, Theme) and current input state (Start Time, Logs) are saved automatically to your browser's Local Storage, so you never lose context on refresh.

## How to Use

1. **Set Your Start Time**: Use the time picker or let the app auto-detect it from your logs.
2. **Check Key Times**: View the large cards to see exactly when your shift ends.
3. **Analyze Logs**: Copy your attendance history from your biometric/HR system and paste it into the analyzer text area. The app will generate a summary of your effective hours and breaks.
4. **Copy Summary**: Use the "Copy Summary" button to get a concise text report to paste into your timesheet or status update.

## Tech Stack

- **Frontend**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useMemo, useEffect)

## Installation & Running Locally

1. Clone the repository:

    ```bash
    git clone <repository-url>
    ```

2. Navigate to the project directory:

    ```bash
    cd Time-Calculator
    ```

3. Install dependencies:

    ```bash
    npm install
    ```

4. Start the development server:

    ```bash
    npm run dev
    ```

## Credits

**Developed by [Shlok Sharma](https://github.com/ShlokSharma-2662)**
