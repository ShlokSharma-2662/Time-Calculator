import React, { useState, useEffect, lazy, Suspense } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { useAuth } from './context/AuthContext';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ShiftCalculator } from './components/ShiftCalculator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyncManager } from './components/SyncManager';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toast } from './components/Toast';
import { UIProvider, useUI } from './context/UIContext';
import { ShiftStateProvider, useShiftState } from './context/ShiftStateContext';
import { RefreshCw } from 'lucide-react';
import { HeroSection } from './components/HeroSection';

const LogAnalyzer = lazy(() => import('./components/LogAnalyzer').then((module) => ({ default: module.LogAnalyzer })));
const ShiftAnalytics = lazy(() => import('./components/ShiftAnalytics').then((module) => ({ default: module.ShiftAnalytics })));
const LeaveManagement = lazy(() => import('./components/LeaveManagement').then((module) => ({ default: module.LeaveManagement })));
const AttendanceLog = lazy(() => import('./components/AttendanceLog').then((module) => ({ default: module.AttendanceLog })));

function AppContent() {
  const { user, loading, logout } = useAuth();
  const {
    showSuccess, toasts, dismissToast,
    confirm, confirmDialog, closeConfirm
  } = useUI();

  const {
    startTime, setStartTime, logInput, setLogInput,
    shiftDuration, setShiftDuration, use24Hour, setUse24Hour,
    currentMinutes,
    history, getAllEntries, exportToCSV,
    activeLeave, logStats, shiftDetails, mtdProgress, currentDayProgress,
    hrmsSync, clearHrmsSync,
  } = useShiftState();

  const [authMode, setAuthMode] = useState('login');
  const [showHero, setShowHero] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('activeView') || 'shift';
  });
  const canAccessLeaveView = user?.email === 'suttamshlok@gmail.com';
  const effectiveActiveView = canAccessLeaveView ? activeView : 'shift';

  // --- Effects ---
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  useEffect(() => {
    localStorage.setItem('activeView', effectiveActiveView);
  }, [effectiveActiveView]);

  const SectionFallback = ({ label }) => (
    <div className="glass-card">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
        <p className="text-sm text-slate-300 font-semibold">Loading {label}...</p>
      </div>
    </div>
  );

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

  // Auto-detect start time from parsed logs
  const { autoStartTime } = logStats;
  useEffect(() => {
    if (autoStartTime && autoStartTime !== startTime) {
      setStartTime(autoStartTime);
    }
  }, [autoStartTime, startTime, setStartTime]);

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
    <SyncManager>
      {({ syncLogs, restoreFromCloud, isSyncing, synced }) => (
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
              activeView={effectiveActiveView}
              setActiveView={(nextView) => {
                if (nextView === 'leave' && !canAccessLeaveView) {
                  return;
                }
                setActiveView(nextView);
              }}
            />

            <main className="mt-8">
              {effectiveActiveView === 'shift' ? (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                  <div className="xl:col-span-8 space-y-8">
                    <ErrorBoundary label="Dashboard">
                      <Dashboard
                        workProgress={currentDayProgress}
                        shiftDetails={shiftDetails}
                        logStats={logStats}
                        isOvertime={logStats.isOvertime}
                        activeLeave={activeLeave}
                        mtdProgress={mtdProgress}
                        history={history}
                        shiftDuration={shiftDuration}
                        use24Hour={use24Hour}
                      />
                    </ErrorBoundary>
                    <ErrorBoundary label="Log Analyzer">
                      <Suspense fallback={<SectionFallback label="log analyzer" />}>
                        <LogAnalyzer
                          logInput={logInput}
                          setLogInput={setLogInput}
                          stats={logStats}
                          currentTimeMinutes={currentMinutes}
                          hrmsSync={hrmsSync}
                          clearHrmsSync={clearHrmsSync}
                        />
                      </Suspense>
                    </ErrorBoundary>
                    <ErrorBoundary label="Shift Analytics">
                      <Suspense fallback={<SectionFallback label="shift analytics" />}>
                        <ShiftAnalytics
                          currentShift={{ ...logStats, startTime }}
                          history={history}
                        />
                      </Suspense>
                    </ErrorBoundary>

                    {/* Universal Logs (Attendance) */}
                    <div className="space-y-8">
                      <ErrorBoundary label="Attendance Log">
                        <Suspense fallback={<SectionFallback label="attendance log" />}>
                          <AttendanceLog />
                        </Suspense>
                      </ErrorBoundary>
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
                <ErrorBoundary label="Leave Management">
                  <Suspense fallback={<SectionFallback label="leave management" />}>
                    <LeaveManagement />
                  </Suspense>
                </ErrorBoundary>
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
      )}
    </SyncManager>
  );
}

export default function App() {
  return (
    <UIProvider>
      <ShiftStateProvider>
        <AppContent />
      </ShiftStateProvider>
    </UIProvider>
  );
}
