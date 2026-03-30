import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Search, Filter, LayoutGrid, Timer, AlertCircle, CheckCircle2,
    Coffee, Zap, TrendingUp, Edit2, Check, X
} from 'lucide-react';
import { transformHistoryToShifts, getGoals } from '../utils/shiftHistory';
import { useAuth } from '../context/AuthContext';

const ITEMS_PER_PAGE = 10;

export function AttendanceLog() {
    const { syncLogsToCloud, user } = useAuth();
    const [history, setHistory] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Editing State
    const [editingDate, setEditingDate] = useState(null);
    const [editValues, setEditValues] = useState({ startTime: '', lastOutTime: '', totalBreak: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [leaveHistory, setLeaveHistory] = useState([]);

    const goals = useMemo(() => getGoals(), []);

    useEffect(() => {
        const loadHistory = () => {
            const stored = localStorage.getItem('workShift_history');
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        };
        const loadLeaves = () => {
            const stored = localStorage.getItem('leave_history_data');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setLeaveHistory(parsed.leaves || []);
                } catch (e) {
                    setLeaveHistory([]);
                }
            }
        };
        loadHistory();
        loadLeaves();
        window.addEventListener('storage', () => {
            loadHistory();
            loadLeaves();
        });
        return () => window.removeEventListener('storage', loadHistory);
    }, []);

    const shifts = useMemo(() => transformHistoryToShifts(history), [history]);

    const getStatus = (shift) => {
        if (!shift.startTime || shift.startTime === '00:00') return { label: 'Inactive', color: 'text-slate-500', bg: 'bg-slate-500/10' };

        // Check if shift is still ongoing (no Out Time or Out Time is same as current time-ish)
        if (!shift.fullDayEnd || shift.fullDayEnd === '--:--' || shift.fullDayEnd === '00:00') {
            return { label: 'Logging...', color: 'text-indigo-400', bg: 'bg-indigo-400/10', isPulse: true };
        }

        const [h, m] = shift.startTime.split(':').map(Number);
        const startMins = h * 60 + m;
        const [tH, tM] = (goals.targetStartTime || '09:30').split(':').map(Number);
        const targetMins = tH * 60 + tM;

        if (startMins > targetMins + 15) return { label: 'Late Arrival', color: 'text-amber-500', bg: 'bg-amber-500/10' };
        if (shift.workingHours < 7.5 && shift.workingHours > 0) return { label: 'Short Shift', color: 'text-rose-500', bg: 'bg-rose-500/10' };
        return { label: 'On-Time', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    };

    const filteredShifts = useMemo(() => {
        return shifts.filter(s => {
            const matchesSearch = s.date.includes(searchTerm);
            const status = getStatus(s);
            const matchesStatus = filterStatus === 'All' || status.label === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [shifts, searchTerm, filterStatus]);

    const totalPages = Math.max(1, Math.ceil(filteredShifts.length / ITEMS_PER_PAGE));
    const paginatedShifts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredShifts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredShifts, currentPage]);

    useMemo(() => setCurrentPage(1), [searchTerm, filterStatus]);

    const handleStartEdit = (shift) => {
        setEditingDate(shift.date);
        setEditValues({
            startTime: shift.startTime || '09:00',
            lastOutTime: shift.fullDayEnd || '18:00',
            totalBreak: shift.totalBreak || 0
        });
        setIsModalOpen(true);
    };

    const handleQuickPaste = (text) => {
        if (!text || text.trim() === '') return;

        const parseTimeString = (timeStr) => {
            if (!timeStr) return null;
            const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!match) return null;
            let [_, hours, minutes, ampm] = match;
            hours = parseInt(hours);
            if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
            return `${String(hours).padStart(2, '0')}:${minutes}`;
        };

        const timeToMins = (timeStr) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        // Detect Multi-line Punch Log (Format B)
        // Robust global search for [Time] [In/Out] pairs (handles tabs, spaces, newlines)
        const punchMatches = [];
        const punchRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM))\s+(In|Out)\b/gi;
        let match;

        while ((match = punchRegex.exec(text)) !== null) {
            punchMatches.push({
                time: parseTimeString(match[1]),
                type: match[2].toLowerCase()
            });
        }

        if (punchMatches.length >= 2) {
            // Sort by time to ensure chronological processing
            punchMatches.sort((a, b) => timeToMins(a.time) - timeToMins(b.time));

            const firstIn = punchMatches.find(p => p.type === 'in')?.time || punchMatches[0].time;
            const lastOut = [...punchMatches].reverse().find(p => p.type === 'out')?.time || punchMatches[punchMatches.length - 1].time;

            // Calculate Break Gaps (Sum of Out -> next In intervals)
            let totalBreakMins = 0;
            for (let i = 0; i < punchMatches.length - 1; i++) {
                if (punchMatches[i].type === 'out' && punchMatches[i + 1].type === 'in') {
                    const gap = timeToMins(punchMatches[i + 1].time) - timeToMins(punchMatches[i].time);
                    if (gap > 0 && gap < 480) { // Safety: gaps > 8h are probably different days
                        totalBreakMins += gap;
                    }
                }
            }

            setEditValues(prev => ({
                ...prev,
                startTime: firstIn,
                lastOutTime: lastOut,
                totalBreak: totalBreakMins.toString()
            }));
            return; // STOP: Multi-line log takes precedence
        }

        // Fallback to Single-Line Summary (Format A: Planned In, Planned Out, Actual In, Actual Out)
        const timeMatches = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/gi);
        if (timeMatches && timeMatches.length >= 4) {
            const inTime = parseTimeString(timeMatches[2]);
            const outTime = parseTimeString(timeMatches[3]);

            const durationMatches = text.match(/\b(\d+\.\d{2})\b/g);
            let breakMinutes = 45;
            if (durationMatches && durationMatches.length >= 3) {
                const lastMatch = durationMatches[durationMatches.length - 1];
                const breakHours = parseFloat(lastMatch);
                if (breakHours < 12) { // 12+ hours break in a summary is unlikely
                    breakMinutes = Math.round(breakHours * 60);
                }
            }

            if (inTime && outTime) {
                setEditValues(prev => ({
                    ...prev,
                    startTime: inTime,
                    lastOutTime: outTime,
                    totalBreak: breakMinutes.toString()
                }));
            }
        }
    };

    const handleSaveEdit = () => {
        if (!editingDate) return;

        const updatedHistory = { ...history };
        const dayData = updatedHistory[editingDate] || {};

        // Recalculate effective minutes
        const [sH, sM] = editValues.startTime.split(':').map(Number);
        const [eH, eM] = editValues.lastOutTime.split(':').map(Number);
        const startMins = sH * 60 + (sM || 0);
        const endMins = eH * 60 + (eM || 0);
        const totalMins = Math.max(0, endMins - startMins);
        const effectiveWorkTime = Math.max(0, totalMins - parseInt(editValues.totalBreak));

        updatedHistory[editingDate] = {
            ...dayData,
            startTime: editValues.startTime,
            lastOutTime: editValues.lastOutTime,
            totalOutTime: parseInt(editValues.totalBreak),
            effectiveWorkTime: effectiveWorkTime
        };

        localStorage.setItem('workShift_history', JSON.stringify(updatedHistory));
        setHistory(updatedHistory);

        if (user) {
            syncLogsToCloud([[editingDate, updatedHistory[editingDate]]]);
        }

        setEditingDate(null);
        setIsModalOpen(false);
    };

    const handleCloseModal = () => {
        setEditingDate(null);
        setIsModalOpen(false);
    };

    return (
        <div className="glass-card mt-8 overflow-hidden border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.05)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2.5 bg-indigo-500/10 rounded-xl hover:bg-indigo-500/20 transition-all text-indigo-500 group"
                    >
                        {isCollapsed
                            ? <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                            : <ChevronUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                        }
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-lg font-black text-white tracking-tight">Attendance Log</h3>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">Live</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {filteredShifts.length} Shifts Tracked • Page {currentPage} of {totalPages}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="YYYY-MM-DD"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all w-full md:w-40"
                        />
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                        <Filter className="w-3 h-3 text-slate-500" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-300 focus:outline-none"
                        >
                            <option value="All" className="bg-slate-900">All Status</option>
                            <option value="On-Time" className="bg-slate-900">On-Time</option>
                            <option value="Late Arrival" className="bg-slate-900">Late</option>
                            <option value="Short Shift" className="bg-slate-900">Short</option>
                        </select>
                    </div>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="w-full">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-y border-white/5">
                                        <th className="px-6 py-5 w-[18%]">Shift Date</th>
                                        <th className="px-4 py-5 w-[16%]">In Time</th>
                                        <th className="px-4 py-5 w-[16%]">Out Time</th>
                                        <th className="px-4 py-5 w-[16%]">Working</th>
                                        <th className="px-4 py-5 w-[14%] text-center">Break</th>
                                        <th className="px-6 py-5 text-right w-[20%]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedShifts.map((shift, idx) => {
                                        const status = getStatus(shift);
                                        const isEditing = editingDate === shift.date;
                                        const leaveOnThisDay = leaveHistory.find(l => l.date === shift.date);
                                        return (
                                            <motion.tr
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className={`transition-colors group ${isEditing ? 'bg-indigo-500/5' : 'hover:bg-white/[0.02]'}`}
                                            >
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400 group-hover:text-indigo-400 transition-colors">
                                                            <Calendar className="w-3.5 h-3.5 opacity-40" />
                                                            {shift.date}
                                                        </div>
                                                        {leaveOnThisDay && (
                                                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-opacity-20 max-w-fit ${leaveOnThisDay.duration === 0.5
                                                                ? 'bg-amber-500/10 text-amber-500 border-amber-500'
                                                                : 'bg-rose-500/10 text-rose-500 border-rose-500'
                                                                }`}>
                                                                <AlertCircle className="w-2.5 h-2.5" />
                                                                {leaveOnThisDay.duration === 0.5 ? '0.5 Day' : 'Full Day'}: {leaveOnThisDay.type}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                                                        <div className="p-1 px-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                                                            <Clock className="w-3 h-3 text-indigo-400" />
                                                        </div>
                                                        <span className="font-mono">{shift.startTime || '--:--'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
                                                        {(!shift.fullDayEnd || shift.fullDayEnd === '--:--' || shift.fullDayEnd === '00:00') ? (
                                                            <span className="text-slate-600 italic">--:--</span>
                                                        ) : (
                                                            <span className="text-slate-300 font-mono">{shift.fullDayEnd}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-1 px-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                                                            <Zap className="w-3 h-3 text-amber-500" />
                                                        </div>
                                                        <span className="text-xs font-black text-white tracking-tight">{shift.workingHours}h</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 bg-white/5 py-1 px-2 rounded-lg border border-white/5 inline-flex">
                                                        <Coffee className="w-3 h-3 text-orange-400/60" />
                                                        {shift.totalBreak}m
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-3 transition-opacity">
                                                        <span className={`px-2.5 py-1.5 rounded-full text-[8.5px] font-black uppercase tracking-widest border border-current transition-all shadow-sm ${status.color} ${status.bg} border-opacity-20 flex items-center gap-1.5`}>
                                                            {status.isPulse && <span className="w-1 h-1 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]"></span>}
                                                            {status.label}
                                                        </span>
                                                        <button
                                                            onClick={() => handleStartEdit(shift)}
                                                            className="p-2 opacity-0 group-hover:opacity-100 bg-white/5 text-slate-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg border border-white/5"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                    {paginatedShifts.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-20">
                                                    <Timer className="w-12 h-12 text-slate-400" />
                                                    <div>
                                                        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Zero Attendance Nodes</p>
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1">Initialize your first shift to begin tracking</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="p-6 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                                <div className="hidden sm:flex items-center gap-3">
                                    <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                                        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        Node {Math.min(filteredShifts.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredShifts.length, currentPage * ITEMS_PER_PAGE)} of {filteredShifts.length}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-white" />
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        {[...Array(totalPages)].map((_, i) => {
                                            // Only show 5 pages around current page
                                            if (totalPages > 7) {
                                                if (i + 1 !== 1 && i + 1 !== totalPages && Math.abs(i + 1 - currentPage) > 1) {
                                                    if (Math.abs(i + 1 - currentPage) === 2) return <span key={i} className="text-slate-700">.</span>;
                                                    return null;
                                                }
                                            }
                                            return (
                                                <button
                                                    key={i + 1}
                                                    onClick={() => setCurrentPage(i + 1)}
                                                    className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1
                                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 translate-y-[-2px]'
                                                        : 'bg-white/5 text-slate-500 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick-Paste Modal Overlay */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseModal}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="glass-card w-full max-w-lg relative z-10 overflow-hidden shadow-2xl shadow-indigo-500/10 border border-indigo-500/20"
                        >
                            <div className="p-6 border-b border-indigo-500/10 flex items-center justify-between bg-indigo-500/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                                        <Edit2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white tracking-tight">Edit Shift</h3>
                                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">{editingDate}</p>
                                    </div>
                                </div>
                                <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Quick Paste Area */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Zap className="w-3 h-3 text-indigo-400" />
                                            Portal Link Quick-Paste
                                        </label>
                                    </div>
                                    <div className="relative group/paste">
                                        <LayoutGrid className="absolute left-3.5 top-4 w-4 h-4 text-indigo-400 opacity-50 group-focus-within/paste:opacity-100 transition-opacity" />
                                        <textarea
                                            rows="3"
                                            placeholder="Paste full portal log here (multiple lines supported...)"
                                            onChange={(e) => handleQuickPaste(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-sm text-white placeholder:text-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all font-mono shadow-inner shadow-black/20 resize-y min-h-[80px]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">In Time</label>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                value={editValues.startTime}
                                                onChange={(e) => setEditValues({ ...editValues, startTime: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono shadow-inner shadow-black/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Out Time</label>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                value={editValues.lastOutTime}
                                                onChange={(e) => setEditValues({ ...editValues, lastOutTime: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono shadow-inner shadow-black/20"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Break/Shortage (Mins)</label>
                                    <div className="relative">
                                        <Coffee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            value={editValues.totalBreak}
                                            onChange={(e) => setEditValues({ ...editValues, totalBreak: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono shadow-inner shadow-black/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-end gap-3">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
