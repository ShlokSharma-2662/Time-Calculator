import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ShiftCalculator } from './components/ShiftCalculator';
import { LogAnalyzer } from './components/LogAnalyzer';
import { ShiftAnalytics } from './components/ShiftAnalytics';
import { LeaveManagement } from './components/LeaveManagement';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { Toast } from './components/Toast';
import { useShiftCalculations } from './hooks/useShiftCalculations';
import { useLogParser } from './hooks/useLogParser';
import { useHistory } from './hooks/useHistory';
import { useToast } from './hooks/useToast';
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
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('activeView') || 'shift';
  });

  // --- Hooks ---
  const { saveEntry, getAllEntries, exportToCSV } = useHistory();
  const { toasts, showSuccess, showError, showInfo, dismiss } = useToast();

  // --- Effects ---
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

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
    localStorage.setItem('activeView', activeView);
  }, [activeView]);

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
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Convert hours to minutes for the hook
  const fullDayMinutes = shiftDuration * 60;
  const logStats = useLogParser(logInput, use24Hour, currentMinutes);
  const shiftDetails = useShiftCalculations(startTime, fullDayMinutes, use24Hour, logStats.totalOutTime);

  // Calculate work progress percentage
  const workProgress = logStats.effectiveWorkTime > 0
    ? Math.min((logStats.effectiveWorkTime / fullDayMinutes) * 100, 100)
    : 0;

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
    <div className="min-h-screen transition-colors duration-500 selection:bg-indigo-100 selection:text-indigo-700">
      {/* Animated Background Gradients - Adjusted for Dark Mode */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-500/15 blur-[100px] rounded-full animate-float"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-violet-500/10 blur-[100px] rounded-full animate-float [animation-delay:2s]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Header
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          workProgress={workProgress}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        <main className="mt-8">
          {activeView === 'shift' ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              {/* Left Column: Analytics & Logs (Wider) */}
              <div className="xl:col-span-8 space-y-4">
                <Dashboard
                  shiftDetails={shiftDetails}
                  logStats={logStats}
                  workProgress={workProgress}
                  startTime={startTime}
                />

                <LogAnalyzer
                  logInput={logInput}
                  setLogInput={setLogInput}
                  stats={logStats}
                  showSuccess={showSuccess}
                  showError={showError}
                  currentTimeMinutes={currentMinutes}
                />
              </div>

              {/* Right Column: Key Inputs & Settings (Narrower) */}
              <div className="xl:col-span-4 sticky top-8">
                <div className="space-y-8">
                  <ShiftCalculator
                    startTime={startTime}
                    setStartTime={setStartTime}
                    synced={synced}
                    shiftDetails={shiftDetails}
                  />

                  {/* Additional Quick Action Card */}
                  <div className="glass-card p-6 border-white/5 bg-indigo-500/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4 text-center">System Overview</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-slate-500 italic">Sync Status</span>
                        <span className="text-emerald-500">OPTIMAL</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-slate-500 italic">Total Logs</span>
                        <span className="text-slate-800 dark:text-slate-100">{logStats.events.length} entries</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <LeaveManagement />
          )}
        </main>

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
          showSuccess={showSuccess}
        />

        <Toast toasts={toasts} onDismiss={dismiss} />
      </div>
    </div>
  );
}
