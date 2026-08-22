import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { TodayStrip } from './components/TodayStrip';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyncManager } from './components/SyncManager';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toast } from './components/Toast';
import { UIProvider, useUI } from './context/UIContext';
import { ShiftStateProvider, useShiftState } from './context/ShiftStateContext';
import { HeroSection } from './components/HeroSection';
import { useLeaveNotification } from './hooks/useLeaveNotification';
import { getTargetWorkMinutes } from './hooks/useShiftCalculations';
import { canAccessLeaveView } from './utils/leaveAccess';

const LogAnalyzer = lazy(() => import('./components/LogAnalyzer').then((module) => ({ default: module.LogAnalyzer })));
const ShiftAnalytics = lazy(() => import('./components/ShiftAnalytics').then((module) => ({ default: module.ShiftAnalytics })));
const LeaveManagement = lazy(() => import('./components/LeaveManagement').then((module) => ({ default: module.LeaveManagement })));
const AttendanceLog = lazy(() => import('./components/AttendanceLog').then((module) => ({ default: module.AttendanceLog })));
const WeeklyTrend = lazy(() => import('./components/WeeklyTrend').then((module) => ({ default: module.WeeklyTrend })));

const HAS_ACCOUNT_KEY = 'workshiftHasAccount';

function readInitialView() {
  const stored = localStorage.getItem('activeView');
  if (stored === 'shift') return 'today';
  if (stored === 'leave' || stored === 'history' || stored === 'analytics' || stored === 'today') return stored;
  return 'today';
}

function formatRemaining(minutes) {
  const value = Math.max(0, Math.floor(Number(minutes) || 0));
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function PasteSkeleton() {
  return (
    <div className="glass-card space-y-3" aria-hidden="true">
      <div className="h-4 w-40 rounded bg-slate-800/80" />
      <div className="h-48 rounded-xl bg-slate-900/70 border border-white/10 animate-pulse" />
    </div>
  );
}

function AppContent() {
  const { user, loading, logout, savePreferences } = useAuth();
  const {
    showError, showInfo, toasts, dismissToast,
    confirmDialog, closeConfirm
  } = useUI();

  const {
    startTime, setStartTime, logInput, setLogInput,
    shiftDuration, setShiftDuration, use24Hour, setUse24Hour,
    workDate, setWorkDate, today,
    currentMinutes,
    history, saveEntry,
    activeLeave, logStats, shiftDetails, mtdProgress, currentDayProgress,
    hrmsSync, clearHrmsSync,
  } = useShiftState();

  const [shiftTarget, setShiftTarget] = useState(() => {
    try {
      const saved = localStorage.getItem('shiftTarget');
      if (saved === 'fullDay' || saved === 'halfDay' || saved === 'shortLeave') return saved;
    } catch { /* ignore */ }
    return 'fullDay';
  });
  const targetWorkMinutes = getTargetWorkMinutes((shiftDuration || 9) * 60, shiftTarget);
  const exitLabel = shiftDetails?.isFullLeave
    ? '--:--'
    : (shiftDetails?.[`${shiftTarget}Adjusted`] || shiftDetails?.activeTargetAdjusted);

  const remainingMinutes = useMemo(() => {
    const worked = Number(logStats.realTimeEffectiveWork || 0);
    if (worked >= targetWorkMinutes) return 0;
    return Math.max(0, targetWorkMinutes - worked);
  }, [targetWorkMinutes, logStats.realTimeEffectiveWork]);

  const isOvertime = Number(logStats.realTimeEffectiveWork || 0) >= targetWorkMinutes;

  const leaveNotify = useLeaveNotification({
    remainingMinutes,
    exitLabel,
    workDate: logStats.detectedDate || workDate || today,
    isHistorical: Boolean(logStats.isHistorical),
    hasShift: Boolean(logStats.firstInTime && (logStats.events?.length > 0 || logInput.trim())),
  });

  const [authMode, setAuthMode] = useState('login');
  const [showHero, setShowHero] = useState(() => {
    try { return localStorage.getItem(HAS_ACCOUNT_KEY) !== 'true'; }
    catch (_e) { return true; }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState(readInitialView);
  const prefersReducedMotion = useReducedMotion();
  const canAccessLeaveViewFlag = canAccessLeaveView(user?.email);
  const allowedViews = canAccessLeaveViewFlag
    ? ['today', 'history', 'analytics', 'leave']
    : ['today', 'history', 'analytics'];
  const effectiveActiveView = allowedViews.includes(activeView) ? activeView : 'today';
  const MotionDiv = motion.div;
  const sectionEnter = prefersReducedMotion ? {} : { opacity: 0, y: 12 };
  const sectionShow = prefersReducedMotion
    ? {}
    : { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } };
  const sectionExit = prefersReducedMotion
    ? {}
    : { opacity: 0, y: 8, transition: { duration: 0.15 } };

  const remainingLabel = logStats.isHistorical
    ? 'Historical day'
    : isOvertime
      ? `+${formatRemaining(Number(logStats.realTimeEffectiveWork || 0) - targetWorkMinutes)} overtime`
      : remainingMinutes === 0
        ? `Leave at ${exitLabel || '--:--'}`
        : `${formatRemaining(remainingMinutes)} left`;

  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  useEffect(() => {
    localStorage.setItem('shiftTarget', shiftTarget);
  }, [shiftTarget]);

  useEffect(() => {
    if (!user || typeof savePreferences !== 'function') return undefined;
    const timer = window.setTimeout(() => {
      Promise.resolve(savePreferences({
        shiftDuration,
        use24Hour,
        startTime,
        shiftTarget,
      })).catch((err) => {
        console.warn('[App] Failed to save preferences:', err?.message || err);
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [user, savePreferences, shiftDuration, use24Hour, startTime, shiftTarget]);

  useEffect(() => {
    localStorage.setItem('activeView', effectiveActiveView);
  }, [effectiveActiveView]);

  const handleSaveCurrentShift = () => {
    const targetDate = logStats?.detectedDate || today;
    saveEntry(targetDate, {
      startTime,
      logInput,
      totalOutTime: logStats.totalOutTime,
      effectiveWorkTime: logStats.effectiveWorkTime,
      firstInTime: logStats.firstInTime,
      lastOutTime: logStats.lastOutTime,
      activeLeave: activeLeave || null,
      shortTimeOffMinutes: logStats.shortTimeOffMinutes || 0,
      shortTimeOffEntries: logStats.shortTimeOffEntries || [],
    });
  };

  const { autoStartTime } = logStats;
  useEffect(() => {
    if (autoStartTime && autoStartTime !== startTime) {
      setStartTime(autoStartTime);
    }
  }, [autoStartTime, startTime, setStartTime]);

  const handleNotifyToggle = async (nextEnabled) => {
    const granted = await leaveNotify.setEnabled(nextEnabled);
    if (nextEnabled && granted) {
      showInfo("We'll ping 15 minutes before exit.");
    } else if (nextEnabled && !granted) {
      showError('Notifications were blocked by the browser.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
          <Briefcase className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm text-slate-400">Checking session…</p>
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
      {({ syncLogs, restoreFromCloud, isSyncing, synced, lastSyncedAt }) => (
        <div className="min-h-screen selection:bg-indigo-500/30 selection:text-white">
          <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
            <div className="absolute top-[-8%] right-[-8%] w-[36%] h-[36%] bg-indigo-500/10 blur-[110px] rounded-full" />
            <div className="absolute bottom-[-8%] left-[-8%] w-[36%] h-[36%] bg-violet-500/8 blur-[110px] rounded-full" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <Header
              onOpenSettings={() => setIsSettingsOpen(true)}
              onLogout={logout}
              isSyncing={isSyncing}
              lastSyncedAt={lastSyncedAt}
              synced={synced}
              onSync={syncLogs}
              onRestore={restoreFromCloud}
              user={user}
              activeView={effectiveActiveView}
              setActiveView={setActiveView}
              remainingLabel={remainingLabel}
              canAccessLeaveView={canAccessLeaveViewFlag}
            />

            <main className="mt-4">
              <AnimatePresence mode="wait" initial={!prefersReducedMotion}>
                {effectiveActiveView === 'today' && (
                  <MotionDiv key="view-today" initial={sectionEnter} animate={sectionShow} exit={sectionExit} className="space-y-6">
                    <ErrorBoundary label="Today">
                      <TodayStrip
                        shiftDetails={shiftDetails}
                        logStats={logStats}
                        workProgress={currentDayProgress}
                        activeLeave={activeLeave}
                        mtdProgress={mtdProgress}
                        shiftDuration={shiftDuration}
                        shiftTarget={shiftTarget}
                        setShiftTarget={setShiftTarget}
                        remainingMinutes={remainingMinutes}
                        isOvertime={isOvertime}
                        exitLabel={exitLabel}
                        use24Hour={use24Hour}
                        workDate={logStats.detectedDate || workDate}
                        setWorkDate={setWorkDate}
                        today={today}
                        leaveNotify={leaveNotify}
                        onNotifyToggle={handleNotifyToggle}
                        hrmsSync={hrmsSync}
                        onClearHrmsSync={clearHrmsSync}
                      />
                    </ErrorBoundary>
                    <ErrorBoundary label="Log paste">
                      <Suspense fallback={<PasteSkeleton />}>
                        <LogAnalyzer
                          logInput={logInput}
                          setLogInput={setLogInput}
                          stats={logStats}
                          currentTimeMinutes={currentMinutes}
                          workDate={logStats.detectedDate || workDate}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  </MotionDiv>
                )}

                {effectiveActiveView === 'history' && (
                  <MotionDiv key="view-history" initial={sectionEnter} animate={sectionShow} exit={sectionExit}>
                    <ErrorBoundary label="History">
                      <Suspense fallback={<PasteSkeleton />}>
                        <AttendanceLog />
                      </Suspense>
                    </ErrorBoundary>
                  </MotionDiv>
                )}

                {effectiveActiveView === 'analytics' && (
                  <MotionDiv key="view-analytics" initial={sectionEnter} animate={sectionShow} exit={sectionExit} className="space-y-6">
                    <ErrorBoundary label="Analytics">
                      <Suspense fallback={<PasteSkeleton />}>
                        <WeeklyTrend history={history} />
                        <ShiftAnalytics
                          currentShift={{ ...logStats, startTime }}
                          history={history}
                          onSaveShift={handleSaveCurrentShift}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  </MotionDiv>
                )}

                {effectiveActiveView === 'leave' && (
                  <MotionDiv key="view-leave" initial={sectionEnter} animate={sectionShow} exit={sectionExit}>
                    <ErrorBoundary label="Leave">
                      <Suspense fallback={<PasteSkeleton />}>
                        <LeaveManagement />
                      </Suspense>
                    </ErrorBoundary>
                  </MotionDiv>
                )}
              </AnimatePresence>
            </main>

            <Footer />

            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              shiftDuration={shiftDuration}
              setShiftDuration={setShiftDuration}
              startTime={startTime}
              setStartTime={setStartTime}
              use24Hour={use24Hour}
              setUse24Hour={setUse24Hour}
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
