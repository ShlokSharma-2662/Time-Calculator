# 🚀 WorkShift Calc (Enterprise Edition)

**WorkShift Calc** is a high-performance, real-time cloud-sync enabled React application designed to modernize your work-life tracking. Featuring a premium glassmorphic UI, it combines a precision shift calculator, a smart attendance log analyzer, virtual leave management, and advanced multi-month analytics into a single, professional dashboard.

---

## 🎯 The Problem It Solves

Corporate HR portals track your biometric punches, but they rarely tell you **when you are allowed to leave** or **how many effective hours you have actually worked** after factoring in all your micro-breaks.

WorkShift Calc constantly monitors your required hours, dynamically subtracting your break times to give you your **True Effective Work Time** and an accurate, down-to-the-minute countdown to the end of your shift.

---

## 📖 Comprehensive Application Walkthrough

### 1. 🕒 The Dashboard & Live Shift Calculator

The core interface of WorkShift is the **active shift tracker**.

- **Start Time Logging**: Enter your arrival time, or let the app auto-detect your first punch of the day from your portal logs.
- **Dynamic Estimates**: Based on your configured required shift duration in Settings (e.g., 8.5 hours or 9 hours), WorkShift calculates your exact "Est. Exit" time.
- **Micro-Break Deductions**: When you log a break, it is dynamically subtracted from your effective work time. This pushes your "Est. Exit" backward in real-time, guaranteeing you only leave when you have completed your mandatory hours.
- **Live Progress & Alerts**: A glowing, circular progress indicator fills up in real-time. If you are falling short, it alerts you. If you cross into *Overtime*, it displays your extra earned minutes!

### 2. 📝 The Log Analyzer & Quick-Paste Parser

The most powerful feature of WorkShift is its ability to ingest messy, multi-line data from any corporate biometric portal and instantly extract actionable data.

- **How to Use**: Copy your raw biometric log table from your company HR portal and paste it into the "Log Analyzer" text area on the dashboard.
- **Newline-Agnostic Engine**: WorkShift uses a highly intelligent regex parsing engine `(\d{1,2}:\d{2}\s*(?:AM|PM))\s+(In|Out)` that hunts down every single "**In**" and "**Out**" punch. Even if your browser's copy-paste completely strips out all the newlines and table formatting, the parser still succeeds.
- **Gap Aggregation**: The app automatically links each "Out" punch with the subsequent "In" punch, calculating the exact minute duration of your breaks across the entire day.
- **Fallback Format A**: If you paste a generic single-line summary (e.g., *09:00 AM to 18:00 PM - 0.50 Break*), the engine smartly falls back to extracting the decimal values and converting them to minutes.

### 3. 📅 The Attendance Log & Interactive History

Your recorded shifts are permanently stored and displayed in a sleek, paginated history table.

- **Pagination & Search**: Browse your history 10 rows at a time. Search by specific dates (YYYY-MM-DD) or filter your shifts by status.
- **Status Badges**: Instantly see if a shift was "On-Time", "Late Arrival", or a "Short Shift", calculated mathematically against your custom target arrival threshold (default 09:30 AM).
- **Hover-Swap UI**: Designed to save horizontal space, the Status Badge smoothly slides away when hovered, replaced seamlessly by action buttons ("Eye" and "Pencil") within the exact same boundaries. No squished text or messy horizontal scrollbars!
- **Edit Shift**: Click the Pencil icon to open an overlay Modal where you can manually override your First In, Last Out, and Total Break times.

### 4. 👁️ Detailed View Modal & Graphical Timeline

Click the **Eye Icon** on any recorded shift to dive aggressively deep into the data of that day.

- **Graphical Vertical Timeline**: Instead of just showing you the raw data dump, WorkShift takes your pasted portal log and re-parses it inside the Modal.
- **Stepper Display**: It builds a beautiful, colorful, chronological Vertical Timeline detailing the exact time you punched In (marked with an Emerald Badge) and Out (marked with a Rose Badge) throughout that historical day.
- **Raw Input Retention**: The exact unformatted text you originally pasted is also securely stored and available for audit purposes.

### 5. 🏖️ Virtual Leave Management

A dedicated module allowing you to intelligently handle time-offs without ruining your monthly adherence metrics.

- **Flexible Leave Types**: Log Sick Leaves, Casual Leaves, or Custom Leaves.
- **Fractional Adjustments**: Select **Full Day**, **1st Half**, **2nd Half**, or even down to **Short Time-Off** (e.g., explicitly subtract 120 minutes of leave).
- **Virtual Anchoring**: If you log a "1st Half" leave, WorkShift recalculates your dashboard! It anchors your required work hours to the 2nd Half starting hour. Your analytics will correctly reflect 100% adherence, and your progress bars will accurately fill according to the abbreviated targets!
- **Visibility**: Your leave statuses are stamped directly across your Dashboard and Attendance Log histories (with vivid red/orange Warning labels).

### 6. 📊 Advanced Analytics & Global Metrics

- **52-Week GitHub-Style Heatmap**: Visualize your entire year's attendance patterns at a glance. Darker nodes mean longer hours worked. Perfect for spotting burnout or absence streaks.
- **SVG Trend Charts**: High-fidelity SVG line charts plot your daily "Effective Hours Worked" and "Minutes on Break", giving you visual insight into productivity trends.
- **Month-to-Date (MTD) Adherence**: Your dashboard calculates exactly where you stand against the total required hours for the current month so far.

### 7. ⚡ Real-Time Firebase Synchronization

WorkShift perfectly syncs your data across all your devices simultaneously.

- **Firestore onSnapshot Topology**: The application uses cutting-edge `onSnapshot` real-time listeners instead of slow manual API-pushes.
- **Instant Mirroring**: If you edit a shift on your mobile phone, the UI on your laptop will instantly update in milliseconds. No refreshing required.
- **Local Persistence Fallback**: Uses `localStorage` as an incredibly fast initial cache state so the app works immediately, syncing quietly in the background instantly when connection is confirmed.

---

## 🎨 Professional Glassmorphic Design

- **Next-Gen Aesthetics**: Built with deep `backdrop-blur`, sophisticated HSL gradients, complex CSS box-shadows, and modern typography (Inter/Outfit).
- **Fluid Micro-Interactions**: Leverages `Framer Motion` extensively for zero-jank layout transitions, staggering list load animations, and perfectly timed modal pop-ups.
- **Responsive Layout**: Designed mobile-first but fully expands to take advantage of ultrawide HD monitors without stretching awkwardly.

---

## 🛠️ Modern Tech Stack

- **Framework**: React 19, Vite 7
- **Database/Auth**: Firebase v10 (Authentication & Cloud Firestore)
- **Styling**: Tailwind CSS 4, Framer Motion (for all physics-based animations)
- **Icons**: Lucide React (feather-light SVG icons)
- **PWA Ready**: Easily installable as an app-like desktop component via browser prompts.

---

## 🚀 Deployment & Installation

1. **Setup Environment**:
   Clone the repository and create a `.env` file in the root directory. Paste in your Firebase configuration keys:

   ```env
   VITE_FIREBASE_API_KEY=YOUR_API_KEY
   VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
   VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=YOUR_APP_ID
   ```

2. **Run Locally in Development**:

   ```bash
   npm install
   npm run dev
   ```

3. **Deploy to Production**:

   ```bash
   npm run build
   # Deploy the 'dist' folder to Firebase Hosting, Vercel, or Netlify
   ```

---

## ✍️ Author & Vision

**[Shlok Sharma](https://github.com/ShlokSharma-2662)**  
*Re-engineering productivity tracking—because knowing exactly when you can go home shouldn't involve mental math.*
