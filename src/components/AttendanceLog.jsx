import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Search, Filter, LayoutGrid, Timer, AlertCircle, CheckCircle2,
    Coffee, Zap, TrendingUp, Edit2, Check, X, Eye, Download
} from 'lucide-react';
import { transformHistoryToShifts, getGoals } from '../utils/shiftHistory';
import { useAuth } from '../context/AuthContext';
import { useShiftState } from '../context/ShiftStateContext';
import { parseAttendanceLogInput, applyParsedLogToEditValues } from '../utils/attendanceLogParser';
import { useUI } from '../context/UIContext';

const ITEMS_PER_PAGE = 10;

const emptyEditValues = {
    startTime: '',
    lastOutTime: '',
    totalBreak: 0,
    shortTimeOffMinutes: 0,
    shortTimeOffEntries: [],
    logInput: '',
};

export function AttendanceLog() {
    const { syncLogsToCloud, user } = useAuth();
    const { history, saveEntry, exportToCSV } = useShiftState();
    const { showError } = useUI();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Editing State
    const [editingDate, setEditingDate] = useState(null);
    const [editValues, setEditValues] = useState(emptyEditValues);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingShift, setViewingShift] = useState(null);

    const [leaveHistory, setLeaveHistory] = useState([]);

    const goals = useMemo(() => getGoals(), []);

    useEffect(() => {
        const loadLeaves = () => {
            const stored = localStorage.getItem('leave_history_data');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setLeaveHistory(parsed.leaves || []);
                } catch (_e) {
                    setLeaveHistory([]);
                }
            }
        };
        loadLeaves();
        const handleStorageChange = () => {
            loadLeaves();
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
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

    useEffect(() => setCurrentPage(1), [searchTerm, filterStatus]);

    const handleStartEdit = (shift) => {
        const dayData = history[shift.date] || {};
        setEditingDate(shift.date);
        setEditValues({
            startTime: shift.startTime || '09:00',
            lastOutTime: shift.fullDayEnd || '18:00',
            totalBreak: shift.totalBreak || 0,
            shortTimeOffMinutes: shift.shortTimeOffMinutes || dayData.shortTimeOffMinutes || 0,
            shortTimeOffEntries: dayData.shortTimeOffEntries || [],
            logInput: dayData.logInput || '',
        });
        setIsModalOpen(true);
    };

    const handleQuickPaste = (text) => {
        if (!text || text.trim() === '') return;

        const parsed = parseAttendanceLogInput(text);
        const applied = applyParsedLogToEditValues(parsed, text);
        if (!applied) return;

        setEditValues((prev) => ({
            ...prev,
            startTime: applied.startTime || prev.startTime,
            lastOutTime: applied.lastOutTime || prev.lastOutTime,
            totalBreak: applied.totalBreak,
            shortTimeOffMinutes: applied.shortTimeOffMinutes || 0,
            shortTimeOffEntries: applied.shortTimeOffEntries || [],
            logInput: applied.logInput || text,
        }));
    };

    const handleSaveEdit = async () => {
        if (!editingDate) return;

        const dayData = history[editingDate] || {};

        // Recalculate effective minutes
        const [sH, sM] = editValues.startTime.split(':').map(Number);
        const [eH, eM] = editValues.lastOutTime.split(':').map(Number);
        let startMins = sH * 60 + (sM || 0);
        let endMins = eH * 60 + (eM || 0);
        if (endMins < startMins) endMins += 24 * 60;
        const totalMins = Math.max(0, endMins - startMins);
        const totalBreakMinutes = Number.parseInt(editValues.totalBreak, 10);
        const shortTimeOffMinutes = Number.parseInt(editValues.shortTimeOffMinutes, 10);
        const totalBreak = Number.isFinite(totalBreakMinutes) && totalBreakMinutes > 0 ? totalBreakMinutes : 0;
        const shortTimeOff = Number.isFinite(shortTimeOffMinutes) && shortTimeOffMinutes > 0 ? shortTimeOffMinutes : 0;
        const effectiveWorkTime = Math.max(0, totalMins - totalBreak) + shortTimeOff;

        const entryData = {
            ...dayData,
            startTime: editValues.startTime,
            lastOutTime: editValues.lastOutTime,
            firstInTime: editValues.startTime,
            totalOutTime: totalBreak,
            shortTimeOffMinutes: shortTimeOff,
            shortTimeOffEntries: Array.isArray(editValues.shortTimeOffEntries)
                ? editValues.shortTimeOffEntries
                : (dayData.shortTimeOffEntries || []),
            logInput: editValues.logInput || dayData.logInput || '',
            effectiveWorkTime
        };

        saveEntry(editingDate, entryData);

        if (user) {
            try {
                await syncLogsToCloud([[editingDate, entryData]]);
            } catch (err) {
                showError('Cloud sync failed: ' + (err?.message || 'Unknown error'));
            }
        }

        setEditingDate(null);
        setIsModalOpen(false);
    };

    const handleCloseModal = () => {
        setEditingDate(null);
        setIsModalOpen(false);
    };

    return (
        <div className="glass-card overflow-hidden border-indigo-500/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2.5 bg-indigo-500/15 rounded-xl hover:bg-indigo-500/25 transition-all text-indigo-300 border border-indigo-500/30 group"
                    >
                        {isCollapsed
                            ? <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                            : <ChevronUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                        }
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-lg font-semibold text-white tracking-tight">History</h3>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/20">Live</span>
                        </div>
                        <p className="text-sm text-slate-400">
                            {filteredShifts.length} shifts · page {currentPage} of {totalPages}
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
                            className="pl-9 pr-4 py-2 bg-slate-900/30 border border-indigo-400/20 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400/60 focus:bg-slate-900/45 transition-all w-full md:w-40"
                        />
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/40 border border-indigo-400/20 rounded-xl">
                        <Filter className="w-3 h-3 text-slate-500" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-200 focus:outline-none"
                        >
                            <option value="All" className="bg-slate-950">All Status</option>
                            <option value="On-Time" className="bg-slate-950">On-Time</option>
                            <option value="Late Arrival" className="bg-slate-950">Late</option>
                            <option value="Short Shift" className="bg-slate-950">Short</option>
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={() => exportToCSV()}
                        className="px-3 py-2 rounded-xl border border-indigo-400/20 bg-slate-900/40 text-xs text-indigo-200 inline-flex items-center gap-1.5 hover:border-indigo-400/50"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </button>
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
                        <div className="w-full pb-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/40 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 border-y border-white/10">
                                        <th className="px-6 py-5 w-[16%]">Shift Date</th>
                                        <th className="px-4 py-5 w-[14%]">In Time</th>
                                        <th className="px-4 py-5 w-[14%]">Out Time</th>
                                        <th className="px-4 py-5 w-[14%]">Working</th>
                                        <th className="px-4 py-5 w-[14%] text-center">Break</th>
                                        <th className="px-6 py-5 text-right w-[28%]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedShifts.map((shift, idx) => {
                                        const status = getStatus(shift);
                                        const isEditing = editingDate === shift.date;
                                        const leaveOnThisDay = leaveHistory.find(l => l.date === shift.date);
                                        return (
                                            <motion.tr
                                                key={shift.date}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className={`transition-colors group ${isEditing ? 'bg-indigo-500/5' : 'hover:bg-white/[0.02]'}`}
                                            >
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2.5 text-xs font-mono text-slate-300 group-hover:text-indigo-300 transition-colors">
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
                                                        <div className="p-1 px-1.5 rounded-md bg-indigo-500/15 border border-indigo-500/25">
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
                                                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-200 bg-indigo-500/10 py-1 px-2 rounded-lg border border-indigo-500/20 inline-flex">
                                                        <Coffee className="w-3 h-3 text-orange-400/60" />
                                                        {shift.totalBreak}m
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap align-middle w-[140px]">
                                                    <div className="relative flex justify-end items-center h-[34px] w-full">
                                                        {/* Status Badge */}
                                                        <div className="absolute right-0 flex items-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:opacity-0 group-hover:translate-x-4 pointer-events-none">
                                                            <span className={`px-2.5 py-1.5 rounded-full text-[8.5px] font-black uppercase tracking-widest border border-current shadow-sm ${status.color} ${status.bg} border-opacity-20 flex items-center gap-1.5`}>
                                                                {status.isPulse && <span className="w-1 h-1 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]"></span>}
                                                                {status.label}
                                                            </span>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="absolute right-0 flex items-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] opacity-0 -translate-x-4 group-hover:translate-x-0 group-hover:opacity-100">
                                                            <button
                                                                onClick={() => setViewingShift(shift)}
                                                                className="p-1.5 bg-white/5 text-slate-400 rounded-lg hover:bg-indigo-500 hover:text-white transition-colors border border-white/5 shadow-md flex items-center justify-center"
                                                                title="View Details"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleStartEdit(shift)}
                                                                className="p-1.5 bg-white/5 text-slate-400 rounded-lg hover:bg-amber-500 hover:text-white transition-colors border border-white/5 shadow-md flex items-center justify-center"
                                                                title="Edit Shift"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
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
                                                        <p className="text-sm text-slate-300">No shifts yet</p>
                                                        <p className="text-xs text-slate-500 mt-1">Save a day from Analytics or paste a log on Today.</p>
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
                            <div className="p-6 border-t border-indigo-500/10 flex items-center justify-between bg-slate-900/20">
                                <div className="hidden sm:flex items-center gap-3">
                                    <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                                        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                        Node {Math.min(filteredShifts.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredShifts.length, currentPage * ITEMS_PER_PAGE)} of {filteredShifts.length}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 bg-slate-900/40 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/15 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-white" />
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const pageNumber = i + 1;
                                            // Only show 5 pages around current page
                                            if (totalPages > 7) {
                                                if (pageNumber !== 1 && pageNumber !== totalPages && Math.abs(pageNumber - currentPage) > 1) {
                                                    if (Math.abs(pageNumber - currentPage) === 2) {
                                                        return <span key={`ellipsis-${pageNumber}`} className="text-slate-700">.</span>;
                                                    }
                                                    return null;
                                                }
                                            }
                                            return (
                                                <button
                                                    key={`page-${pageNumber}`}
                                                    onClick={() => setCurrentPage(pageNumber)}
                                                    className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNumber
                                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 translate-y-[-2px]'
                                                        : 'bg-slate-900/40 text-slate-200 hover:bg-indigo-500/20'
                                                        }`}
                                                >
                                                    {pageNumber}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 bg-slate-900/40 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/15 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
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
                            className="glass-card w-full max-w-lg relative z-10 overflow-hidden shadow-2xl shadow-indigo-500/15 border border-indigo-500/30"
                        >
                            <div className="p-6 border-b border-indigo-500/20 flex items-center justify-between bg-indigo-500/10">
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

                            <div className="p-6 space-y-6 bg-slate-900/20">
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
                                                className="w-full pl-10 pr-4 py-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-sm text-white placeholder:text-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all font-mono shadow-inner shadow-black/20 resize-y min-h-[80px]"
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
                                                className="w-full bg-slate-900/40 border border-indigo-400/20 rounded-xl pl-3 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono shadow-inner shadow-black/20"
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
                                                className="w-full bg-slate-900/40 border border-indigo-400/20 rounded-xl pl-3 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono shadow-inner shadow-black/20"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Break (Mins)</label>
                                        <div className="relative">
                                            <Coffee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                value={editValues.totalBreak}
                                                onChange={(e) => setEditValues({ ...editValues, totalBreak: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-indigo-400/20 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono shadow-inner shadow-black/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Short Time-Off (Mins)</label>
                                        <div className="relative">
                                            <Timer className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                value={editValues.shortTimeOffMinutes}
                                                onChange={(e) => setEditValues({
                                                    ...editValues,
                                                    shortTimeOffMinutes: e.target.value,
                                                    shortTimeOffEntries: Number(e.target.value) > 0
                                                        ? editValues.shortTimeOffEntries
                                                        : [],
                                                })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-indigo-400/20 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono shadow-inner shadow-black/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-indigo-500/10 bg-slate-900/20 flex items-center justify-end gap-3">
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

            {/* View Details Modal Overlay */}
            <AnimatePresence>
                {viewingShift && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewingShift(null)}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="glass-card w-full max-w-lg relative z-10 overflow-hidden shadow-2xl shadow-indigo-500/15 border border-indigo-500/30"
                        >
                            <div className="p-6 border-b border-indigo-500/20 flex items-center justify-between bg-indigo-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                                        <Eye className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white tracking-tight">Shift Details</h3>
                                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">{viewingShift.date}</p>
                                    </div>
                                </div>
                                <button onClick={() => setViewingShift(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-900/20">
                                <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">First In</p>
                                        <p className="text-lg font-mono text-white">{history[viewingShift.date]?.firstInTime || viewingShift.startTime || '--:--'}</p>
                                    </div>
                                                <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Out</p>
                                        <p className="text-lg font-mono text-white">{history[viewingShift.date]?.lastOutTime || viewingShift.fullDayEnd || '--:--'}</p>
                                    </div>
                                                <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Break</p>
                                        <p className="text-lg font-mono text-white">{viewingShift.totalBreak || '0'}m</p>
                                    </div>
                                                <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Effective Work</p>
                                        <p className="text-lg font-black text-emerald-400">{viewingShift.workingHours || '0.0'}h</p>
                                    </div>
                                </div>

                                {(() => {
                                    const dayData = history[viewingShift.date] || {};
                                    const rawLog = dayData.logInput;
                                    if (!rawLog) return null;

                                    const parsed = parseAttendanceLogInput(rawLog);
                                    const punchMatches = (parsed.events || []).map((event) => ({
                                        timeStr: event.rawTime || event.time24 || event.displayTime,
                                        time24: event.time24 || event.displayTime,
                                        type: String(event.type || '').toLowerCase(),
                                        machine: event.machine || '',
                                    }));
                                    const shortTimeOffMinutes = dayData.shortTimeOffMinutes
                                        || parsed.shortTimeOffMinutes
                                        || 0;

                                    return (
                                        <div className="space-y-4">
                                            {shortTimeOffMinutes > 0 && (
                                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 font-mono">
                                                    Short Time-Off credited: {shortTimeOffMinutes}m
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <LayoutGrid className="w-3 h-3 text-indigo-400" />
                                                    Punched Timeline
                                                </label>
                                            </div>

                                            {punchMatches.length > 0 ? (
                                                <div className="p-5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl relative pr-4">
                                                    <div className="absolute left-[31px] top-6 bottom-6 w-px bg-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.35)]"></div>
                                                    <div className="space-y-4 relative z-10">
                                                        {punchMatches.map((punch, idx) => (
                                                            <motion.div
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: idx * 0.05 }}
                                                                key={`${punch.time24}-${punch.type}-${idx}`}
                                                                className="flex items-center gap-4"
                                                            >
                                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center bg-slate-900 shadow-lg ${punch.type === 'in' ? 'border-emerald-500 shadow-emerald-500/20' : 'border-rose-500 shadow-rose-500/20'}`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${punch.type === 'in' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                                </div>
                                                                <div className="flex-1 flex justify-between items-center px-4 py-2.5 bg-slate-900/35 hover:bg-indigo-500/15 transition-colors border border-indigo-500/20 rounded-lg shadow-inner">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-mono text-sm text-white drop-shadow-md">{punch.timeStr}</span>
                                                                        {punch.machine ? (
                                                                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{punch.machine}</span>
                                                                        ) : null}
                                                                    </div>
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-sm ${punch.type === 'in' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-500/20' : 'text-rose-400 bg-rose-400/10 border border-rose-500/20'}`}>
                                                                        Punch {punch.type}
                                                                    </span>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-slate-900/35 border border-indigo-500/20 rounded-xl whitespace-pre-wrap font-mono text-[10px] text-indigo-200/50">
                                                    {rawLog}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="p-6 border-t border-indigo-500/10 bg-slate-900/20 flex items-center justify-end">
                                <button
                                    onClick={() => setViewingShift(null)}
                                    className="px-6 py-2.5 bg-white/5 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
