import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ShiftCalculator } from './components/ShiftCalculator';
import { LogAnalyzer } from './components/LogAnalyzer';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { useShiftCalculations } from './hooks/useShiftCalculations';
import { useLogParser } from './hooks/useLogParser';
import { useHistory } from './hooks/useHistory';
import { motion } from 'framer-motion';

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [synced, setSynced] = useState(false);

  // --- Hooks ---
  const { saveEntry, getAllEntries, exportToCSV } = useHistory();

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

  // --- Idle Detection & Auto-Reload ---
  useEffect(() => {
    const IDLE_TIME = 5 * 60 * 1000; // 10 seconds for testing (change to 5 * 60 * 1000 for 5 minutes)
    let idleTimer;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        console.log('Page idle for too long, reloading...');
        window.location.reload();
      }, IDLE_TIME);
    };

    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  // --- Calculations ---
  // Convert hours to minutes for the hook
  const fullDayMinutes = shiftDuration * 60;
  const shiftDetails = useShiftCalculations(startTime, fullDayMinutes, use24Hour);
  const logStats = useLogParser(logInput, use24Hour);

  // --- Auto-Save History ---
  useEffect(() => {
    // We auto-save if there is at least some log input or a non-default start time
    // Debounce this slightly or just run on unmount/change
    const today = new Date().toISOString().slice(0, 10);

    // Only save if there is meaningful data
    if (logInput.trim() !== "" || startTime !== "09:00") { // Approximate check
      const entryData = {
        startTime,
        logInput,
        totalOutTime: logStats.totalOutTime,
        effectiveWorkTime: logStats.effectiveWorkTime,
        firstInTime: logStats.firstInTime,
        lastOutTime: logStats.lastOutTime
      };
      saveEntry(today, entryData);
    }
  }, [startTime, logInput, logStats.totalOutTime, logStats.effectiveWorkTime]); // Dependencies that define "data changed"

  // --- History Handlers ---
  const handleLoadEntry = (entry) => {
    if (confirm("Load this entry? Current unsaved changes will be replaced.")) {
      setStartTime(entry.startTime || "00:00");
      setLogInput(entry.logInput || "");
    }
  };

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 font-sans selection:bg-indigo-100 selection:text-indigo-700 transition-colors duration-300"
    >
      <div className="max-w-2xl mx-auto space-y-6">

        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
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

        <HistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          historyEntries={getAllEntries()}
          onLoadEntry={handleLoadEntry}
          onExport={exportToCSV}
        />

      </div>
    </motion.div>
  );
}
