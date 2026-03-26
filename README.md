# 🚀 WorkShift Calc v3.0

**WorkShift Calc** is a high-performance, cloud-sync-enabled React application designed to modernize work-life tracking. Featuring a premium glassmorphic UI, it combines a precision shift calculator, attendance log analyzer, and advanced multi-month analytics into a single, professional dashboard.

---

## ✨ v3.0 Modernization Highlights

This version marks a significant architectural shift toward enterprise-grade stability and cross-device availability.

### 🌐 Secure Cloud Sync & Google Auth

- **Google Sign-In**: Integrated with Firebase Authentication for seamless, secure login.
- **Cloud Persistence**: Automatic daily backups of your shift history to Firestore.
- **Bi-Directional Sync**: "Pull" latest data from the cloud to restore history on new devices instantly.

### 📊 Advanced Analytics & Goals

- **Monthly Summary (NEW)**: Complete tracking of monthly work hours, days worked, and progress toward a 180h target.
- **Weekly Trend (v2.0)**: 45h goal assessment with dynamic, glowing progress bars.
- **Interactive Heatmap**: 52-week activity visualization with synchronized month/day labels and "Latest-First" perspective.
- **SVG Trend Charts**: High-fidelity line charts for daily hours with accurate X/Y axis labeling and interactive tooltips.

### 📅 Integrated Holiday Management

- **Public holiday Suite**: Detects and highlights public holidays across all views (Dashboard, Heatmap, History Calendar).
- **Custom Holiday Manager**: Add personal or region-specific holidays via the Settings menu with full persistence and UI markers.
- **Sandwich Rule Awareness**: Analytics and leave checkers intelligently account for holidays to provide accurate compliance assessments.

### 📝 Smart Log Analyzer

- **Fragmented Session Handling**: Automatically identifies breaks and calculates effective work time from messy biometric raw data.
- **Contextual Badges**: Highlights holidays directly within your activity list for better reporting context.

---

## 🎨 Design Philosophy (V3)

- **Premium Glassmorphism**: Built with `backdrop-blur`, sophisticated HSL gradients, and modern typography (Inter/Outfit).
- **Interactive Experience**: Leverages `Framer Motion` for fluid layout transitions, tab switching, and micro-animations.
- **Adaptive UI**: Optimized for mobile and desktop, featuring a flexible, vertically oriented activity-to-analytics flow.

---

## 🛠️ Modern Tech Stack

- **Core**: React 19, Vite 7
- **Database/Auth**: Firebase (Auth & Firestore)
- **Styling**: Tailwind CSS 4, Framer Motion
- **Visualization**: Recharts & Custom SVG Engine
- **Icons**: Lucide React
- **PWA**: `vite-plugin-pwa` for desktop/mobile "App" installability.

---

## 🔒 Security Architecture

WorkShift v3.0 prioritizes data privacy and security through several layers of protection:

- **Environment Protection**: All service credentials are moved to the `.env` layer using Vite-prefixed variables.
- **Firestore Security Rules**: Strict owner-level access policies (`request.auth.uid`) ensure your work history remains private.
- **Safe Inputs**: Comprehensive sanitization for all user-defined meta-data (like holiday names) to prevent XSS.
- **Content Security Policy**: Robust CSP headers to restrict unauthorized script execution and data exfiltration.

---

## 🚀 Getting Started

1. **Setup Environment**:
   Create a `.env` file in the root directory with your Firebase configuration:

   ```env
   VITE_FIREBASE_API_KEY=YOUR_KEY
   VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
   ...
   ```

2. **Run Locally**:

   ```bash
   npm install
   npm run dev
   ```

3. **Deploy**:

   ```bash
   npm run build
   # Deploy the 'dist' folder to Firebase Hosting or Netlify
   ```

---

## ✍️ Author & Vision

**[Shlok Sharma](https://github.com/ShlokSharma-2662)**  
*Modernizing productivity, one shift at a time.*
