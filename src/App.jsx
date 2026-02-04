import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ShiftCalculator } from './components/ShiftCalculator';
import { LogAnalyzer } from './components/LogAnalyzer';
import { SettingsModal } from './components/SettingsModal';
import { useShiftCalculations } from './hooks/useShiftCalculations';
import { useLogParser } from './hooks/useLogParser';

export default function App() {
  // --- State ---
  const [startTime, setStartTime] = useState(() => {
    const saved = localStorage.getItem('startTime');
    if (saved) return saved;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const [logInput, setLogInput] = useState(() => {
    return localStorage.getItem('logInput') || "";
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Settings State
  const [shiftDuration, setShiftDuration] = useState(() => {
    const saved = localStorage.getItem('shiftDuration');
    return saved ? Number(saved) : 9; // Default 9 hours
  });

  const [use24Hour, setUse24Hour] = useState(() => {
    return localStorage.getItem('use24Hour') === 'true';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [synced, setSynced] = useState(false);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('startTime', startTime);
  }, [startTime]);

  useEffect(() => {
    localStorage.setItem('logInput', logInput);
  }, [logInput]);

  useEffect(() => {
    localStorage.setItem('shiftDuration', shiftDuration);
  }, [shiftDuration]);

  useEffect(() => {
    localStorage.setItem('use24Hour', use24Hour);
  }, [use24Hour]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // --- Calculations ---
  // Convert hours to minutes for the hook
  const fullDayMinutes = shiftDuration * 60;
  const shiftDetails = useShiftCalculations(startTime, fullDayMinutes, use24Hour);
  const logStats = useLogParser(logInput, use24Hour);

  // --- Auto-Sync ---
  const { autoStartTime } = logStats;
  useEffect(() => {
    if (autoStartTime && autoStartTime !== startTime) {
      if (!synced) {
        setStartTime(autoStartTime);
        setSynced(true);
        const timer = setTimeout(() => setSynced(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [autoStartTime]); // Removed startTime dependency to avoid loops, though logic guards it

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 font-sans selection:bg-indigo-100 selection:text-indigo-700 transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-6">

        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <ShiftCalculator
          startTime={startTime}
          setStartTime={setStartTime}
          synced={synced}
          shiftDetails={shiftDetails}
        />

        <LogAnalyzer
          logInput={logInput}
          setLogInput={setLogInput}
          stats={logStats}
        />

        <Footer />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          shiftDuration={shiftDuration}
          setShiftDuration={setShiftDuration}
          use24Hour={use24Hour}
          setUse24Hour={setUse24Hour}
        />

      </div>
    </div>
  );
}
