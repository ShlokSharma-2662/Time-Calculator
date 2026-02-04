import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Briefcase, Coffee, Sun, ClipboardList, AlertCircle, ArrowRight, CheckCircle2, Moon, Trash2, Copy } from 'lucide-react';

// --- Helper Functions ---

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes, format24 = false) => {
  let minutes = totalMinutes % (24 * 60);
  if (minutes < 0) minutes += 24 * 60;

  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);

  if (format24) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

// Regex
const LOG_REGEX = /(\d{1,2}:\d{2})\s*(AM|PM)?\s*(IN|OUT)/gi;

export default function App() {
  // --- State ---
  const [startTime, setStartTime] = useState(() => {
    // Load from local storage or default to now
    const saved = localStorage.getItem('startTime');
    if (saved) return saved;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const [logInput, setLogInput] = useState(() => {
    return localStorage.getItem('logInput') || "";
  });

  const [synced, setSynced] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [copied, setCopied] = useState(false);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('startTime', startTime);
  }, [startTime]);

  useEffect(() => {
    localStorage.setItem('logInput', logInput);
  }, [logInput]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // --- Derived State: Shift Calculator ---
  const startMinutes = useMemo(() => timeToMinutes(startTime), [startTime]);

  const shiftDetails = useMemo(() => {
    return {
      fullDay: minutesToTime(startMinutes + 540),
      halfDay: minutesToTime(startMinutes + 270),
      shortLeave: minutesToTime(startMinutes + 450),
    };
  }, [startMinutes]);

  // --- Derived State: Log Analyzer ---
  const { events, breaks, totalOutTime, autoStartTime, effectiveWorkTime, firstInTime, lastOutTime } = useMemo(() => {
    const matches = [...logInput.matchAll(LOG_REGEX)];
    const parsedEvents = [];

    for (const m of matches) {
      const timeStr = m[1];
      const ampm = m[2];
      const type = m[3].toUpperCase();

      let [h, min] = timeStr.split(':').map(Number);

      if (ampm) {
        const isPM = ampm.toUpperCase() === 'PM';
        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;
      }

      parsedEvents.push({
        id: Math.random().toString(36).substr(2, 9),
        minutes: h * 60 + min,
        displayTime: minutesToTime(h * 60 + min),
        type: type
      });
    }

    parsedEvents.sort((a, b) => a.minutes - b.minutes);

    const computedBreaks = [];
    let totalOut = 0;

    for (let i = 0; i < parsedEvents.length - 1; i++) {
      if (parsedEvents[i].type === 'OUT' && parsedEvents[i + 1].type === 'IN') {
        const diff = parsedEvents[i + 1].minutes - parsedEvents[i].minutes;
        if (diff > 0) {
          computedBreaks.push({
            start: parsedEvents[i].displayTime,
            end: parsedEvents[i + 1].displayTime,
            duration: diff
          });
          totalOut += diff;
        }
      }
    }

    const firstIn = parsedEvents.find(e => e.type === 'IN');
    // For net work, we typically look at Last OUT - First IN - Breaks. 
    // If no last out, we can't fully calculate, but assuming user pastes completed logs:
    const lastOut = [...parsedEvents].reverse().find(e => e.type === 'OUT');

    let netWork = 0;
    if (firstIn && lastOut) {
      const totalDuration = lastOut.minutes - firstIn.minutes;
      netWork = totalDuration - totalOut;
    }

    return {
      events: parsedEvents,
      breaks: computedBreaks,
      totalOutTime: totalOut,
      autoStartTime: firstIn ? minutesToTime(firstIn.minutes, true) : null,
      effectiveWorkTime: netWork > 0 ? netWork : 0,
      firstInTime: firstIn ? firstIn.displayTime : null,
      lastOutTime: lastOut ? lastOut.displayTime : null
    };
  }, [logInput]);

  // --- Auto-Sync ---
  useEffect(() => {
    if (autoStartTime && autoStartTime !== startTime) {
      if (!synced) { // Simple guard
        setStartTime(autoStartTime);
        setSynced(true);
        const timer = setTimeout(() => setSynced(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [autoStartTime]);

  // --- Handlers ---
  const handleCopySummary = () => {
    const summary = `Start: ${firstInTime || '?'} | End: ${lastOutTime || '?'} | Breaks: ${totalOutTime}m | Net Work: ${formatDuration(effectiveWorkTime)}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    if (confirm("Clear all logs?")) {
      setLogInput("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 font-sans selection:bg-indigo-100 selection:text-indigo-700 transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">WorkShift Calc</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your day efficiently</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* --- Shift Calculator Section --- */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 text-indigo-200">
                  <Sun className="w-5 h-5" /> Start Time
                </h2>
                <p className="text-slate-400 text-xs mt-1">When did you begin work?</p>
              </div>
              {synced && (
                <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-3 h-3" /> Auto-Synced
                </span>
              )}
            </div>

            <div className="mt-4">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-5xl font-bold bg-transparent border-b-2 border-slate-700 dark:border-slate-600 focus:border-indigo-400 focus:outline-none py-2 text-center tracking-wider font-mono dark:text-white"
              />
            </div>
          </div>

          <div className="p-6 grid gap-4 bg-white dark:bg-slate-800">
            {/* Primary Card: Full Day */}
            <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-700 dark:to-slate-800 border border-indigo-100 dark:border-slate-600 p-5 rounded-xl flex justify-between items-center shadow-sm">
              <div>
                <span className="text-indigo-600 dark:text-indigo-300 font-medium text-sm uppercase tracking-wide">Day End</span>
                <div className="text-4xl font-bold text-indigo-900 dark:text-white mt-1">{shiftDetails.fullDay}</div>
                <div className="text-indigo-400 dark:text-indigo-300 text-xs mt-1">9 Hours Shift</div>
              </div>
              <Briefcase className="w-10 h-10 text-indigo-200 dark:text-slate-600" />
            </div>

            {/* Grid for Secondary Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-4 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase">Half Day</span>
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1">{shiftDetails.halfDay}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-4 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase">Short Leave</span>
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1">{shiftDetails.shortLeave}</div>
              </div>
            </div>
          </div>
        </section>

        {/* --- Log Analyzer Section --- */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
              <ClipboardList className="w-5 h-5 text-indigo-500" /> Attendance Log Analyzer
            </h2>
            <div className="flex gap-2">
              {logInput && (
                <button
                  onClick={handleClearLogs}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  title="Clear logs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <textarea
                value={logInput}
                onChange={(e) => setLogInput(e.target.value)}
                placeholder="Paste your messy logs here (e.g., '09:56 AMIn, 12:30 PMOut')..."
                className="w-full h-32 p-3 rounded-lg border border-slate-300 dark:border-slate-600 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:placeholder-slate-600"
              />
              <p className="text-xs text-slate-400 mt-2 text-right">
                {events.length} events parsed
              </p>
            </div>

            {events.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Net Work Time Card */}
                  <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50">
                    <div className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">Effective Work</div>
                    <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{formatDuration(effectiveWorkTime)}</div>
                  </div>

                  {/* Total Out Time Card */}
                  <div className={`p-4 rounded-xl border ${totalOutTime > 60 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50'} flex flex-col justify-center`}>
                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${totalOutTime > 60 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      Total Breaks
                    </div>
                    <div className={`text-2xl font-bold ${totalOutTime > 60 ? 'text-red-800 dark:text-red-200' : 'text-emerald-800 dark:text-emerald-200'}`}>
                      {totalOutTime} min
                    </div>
                  </div>
                </div>

                {/* Copy Button */}
                <button
                  onClick={handleCopySummary}
                  className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied to Clipboard!" : "Copy Summary"}
                </button>

                {/* Breaks List */}
                {breaks.length > 0 ? (
                  <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Identified Breaks
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700">
                      {breaks.map((b, idx) => (
                        <div key={idx} className="px-4 py-3 flex justify-between items-center text-sm bg-white dark:bg-slate-800">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <span>{b.start}</span>
                            <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                            <span>{b.end}</span>
                          </div>
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {b.duration} min
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Raw Events Debug */}
                <details className="group">
                  <summary className="cursor-pointer text-xs text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1 w-fit">
                    View Parsed Events <ArrowRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                    {events.map((e) => (
                      <div key={e.id} className={e.type === 'IN' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-500'}>
                        {e.displayTime} {e.type}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
