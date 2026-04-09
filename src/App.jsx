import React, { useState, useEffect, useMemo } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { useAuth } from './context/AuthContext';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ShiftCalculator } from './components/ShiftCalculator';
import { LogAnalyzer } from './components/LogAnalyzer';
import { ShiftAnalytics } from './components/ShiftAnalytics';
import { LeaveManagement } from './components/LeaveManagement';
import { AttendanceLog } from './components/AttendanceLog';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toast } from './components/Toast';
import { UIProvider, useUI } from './context/UIContext';
import { useShiftCalculations } from './hooks/useShiftCalculations';
import { useLogParser } from './hooks/useLogParser';
import { useHistory } from './hooks/useHistory';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { HeroSection } from './components/HeroSection';
import { getMonthToDateAdherence } from './utils/shiftHistory';
import { getLeaveForDate, LEAVE_TYPES } from './utils/leaveHistory';
import { normalizeDate } from './utils/dateUtils';

function AppContent() {
  const { user, loading, logout, syncLogsToCloud, fetchLogsFromCloud, subscribeToLogs } = useAuth();
  const {
    showSuccess, showError, showInfo, toasts, dismissToast,
    confirm, confirmDialog, closeConfirm
  } = useUI();

  const [authMode, setAuthMode] = useState('login');
  const [showHero, setShowHero] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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
  const { history, saveEntry, getAllEntries, exportToCSV, setFullHistory } = useHistory();

  // --- Firebase Sync Logic ---
  const syncLogs = async () => {
    if (!user) return;
    const entries = getAllEntries();
    if (!entries || entries.length === 0) return;
    setIsSyncing(true);
    try {
      await syncLogsToCloud(entries);
      showSuccess("☁️ Synced to Firebase");
    } catch (err) {
      showError("Sync failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSyncing(false);
    }
  };

  // Real-Time Cloud Listener
  useEffect(() => {
    if (!user) return;

    // Subscribe to Firestore changes
    const unsubscribe = subscribeToLogs((cloudLogsArray) => {
      if (!cloudLogsArray || cloudLogsArray.length === 0) return;

      const newHistory = {};
      cloudLogsArray.forEach(log => {
        const { date, id, updatedAt, ...rest } = log;
        newHistory[date] = rest.raw ? rest.raw : rest;
      });

      setFullHistory(newHistory);
      setSynced(true);
      setTimeout(() => setSynced(false), 2000);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Cloud Restore ---
  const restoreFromCloud = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const cloudLogs = await fetchLogsFromCloud();
      if (cloudLogs.length === 0) {
        showInfo('No cloud data found.');
        return;
      }
      for (const log of cloudLogs) {
        const { id, date, updatedAt, ...data } = log;
        saveEntry(date || id, data);

        // If the cloud log contains leave data, ensure it's reflected in local leave history
        if (data.activeLeave) {
          const { saveLeaveEntry } = await import('./utils/leaveHistory');
          saveLeaveEntry({
            date: date || id,
            ...data.activeLeave
          });
        }
      }
      showSuccess(`☁️ Restored ${cloudLogs.length} entries from cloud`);
    } catch (err) {
      showError('Restore failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  useEffect(() => {
    localStorage.setItem('startTime', startTime);
    localStorage.setItem('logInput', logInput);
    localStorage.setItem('shiftDuration', shiftDuration);
    localStorage.setItem('use24Hour', use24Hour);
    localStorage.setItem('activeView', activeView);
  }, [startTime, logInput, shiftDuration, use24Hour, activeView]);

  // --- idle and calculation logic unchanged ---
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

  const startTimeMinutes = useMemo(() => {
    const [h, m] = startTime.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }, [startTime]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const currentParsedDate = useMemo(() => {
    const DATE_REGEX = /(\d{4}-\d{2}-\d{2})|(\d{1,2}[\/-][A-Za-z]{3}[\/-]\d{2,4})|(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g;
    const match = logInput.match(DATE_REGEX);
    return normalizeDate(match ? match[0] : today);
  }, [logInput, today]);

  const activeLeave = useMemo(() => getLeaveForDate(currentParsedDate), [currentParsedDate, history]);

  const logStats = useLogParser(logInput, use24Hour, currentMinutes, startTimeMinutes, today, activeLeave);
  const shiftDetails = useShiftCalculations(logStats.firstInTime || startTime, shiftDuration * 60, use24Hour, logStats.totalOutTime, currentParsedDate);

  const mtdProgress = useMemo(() => {
    return getMonthToDateAdherence(history, logStats, shiftDuration * 60);
  }, [history, logStats, shiftDuration]);

  const currentDayProgress = useMemo(() => {
    const targetMinutes = shiftDuration * 60;
    if (targetMinutes === 0) return 0;
    return Math.min(100, Math.round((logStats.effectiveWorkTime / targetMinutes) * 100));
  }, [logStats.effectiveWorkTime, shiftDuration]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const targetDate = logStats.detectedDate || today;

    if (logInput.trim() !== "" || startTime !== "09:00") {
      const entryData = {
        startTime,
        logInput,
        totalOutTime: logStats.totalOutTime,
        effectiveWorkTime: logStats.effectiveWorkTime,
        firstInTime: logStats.firstInTime,
        lastOutTime: logStats.lastOutTime,
        activeLeave: activeLeave || null // Save leave info with the log (Firestore needs null, not undefined)
      };
      saveEntry(targetDate, entryData);

      if (logStats.detectedDate && user) {
        syncLogsToCloud([[targetDate, entryData]]);
      }
    }
  }, [startTime, logInput, logStats.totalOutTime, logStats.effectiveWorkTime, logStats.detectedDate, user]);

  const handleLoadEntryAttempt = (entry) => {
    confirm({
      title: "Load Entry?",
      message: "This will replace your current workspace logs with the data from this historical entry. Any unsaved changes will be lost.",
      onConfirm: () => {
        setStartTime(entry.startTime || "00:00");
        setLogInput(entry.logInput || "");
        showSuccess('📥 Entry loaded successfully!');
      }
    });
  };

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
  }, [autoStartTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (showHero) {
      return <HeroSection onGetStarted={() => setShowHero(false)} />;
    }
    return authMode === 'login'
      ? <LoginPage onToggleMode={() => setAuthMode('register')} />
      : <RegisterPage onToggleMode={() => setAuthMode('login')} />;
  }

  return (
    <div className="min-h-screen transition-colors duration-500 selection:bg-indigo-100 selection:text-indigo-700">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-500/15 blur-[100px] rounded-full animate-float"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-violet-500/10 blur-[100px] rounded-full animate-float [animation-delay:2s]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Header
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onLogout={logout}
          isSyncing={isSyncing}
          onSync={syncLogs}
          onRestore={restoreFromCloud}
          user={user}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        <main className="mt-8">
          {activeView === 'shift' ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              <div className="xl:col-span-8 space-y-8">
                <Dashboard
                  workProgress={currentDayProgress}
                  shiftDetails={shiftDetails}
                  logStats={logStats}
                  isOvertime={logStats.isOvertime}
                  activeLeave={activeLeave}
                  mtdProgress={mtdProgress}
                  history={history}
                  shiftDuration={shiftDuration}
                />
                <LogAnalyzer
                  logInput={logInput}
                  setLogInput={setLogInput}
                  stats={logStats}
                  currentTimeMinutes={currentMinutes}
                />
                <ShiftAnalytics
                  currentShift={{ ...logStats, startTime }}
                  history={history}
                />

                {/* Universal Logs (Attendance) */}
                <div className="space-y-8">
                  <AttendanceLog />
                </div>
              </div>

              <div className="xl:col-span-4 sticky top-8">
                <div className="space-y-8">
                  <ShiftCalculator
                    startTime={startTime}
                    setStartTime={setStartTime}
                    synced={synced}
                    shiftDetails={shiftDetails}
                  />
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
          history={history}
          onLoadEntry={handleLoadEntryAttempt}
          onExport={exportToCSV}
          showSuccess={showSuccess}
        />

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={closeConfirm}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
        />

        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UIProvider>
      <AppContent />
    </UIProvider>
  );
}
