import React, { useState } from 'react';
import { X, Calendar, Download, CornerUpLeft, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarView } from './CalendarView';
import { getHolidayName } from '../utils/sandwichLeaveLogic';
import { formatDate } from '../utils/dateUtils';

export const HistoryModal = ({ isOpen, onClose, historyEntries, history, onLoadEntry, onExport, showSuccess }) => {
    const [view, setView] = useState('list'); // 'list' | 'calendar'

    return (
        <AnimatePresence>
            {isOpen && (
                <DivWrapper onClose={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="glass-card w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] z-50 relative rounded-[1.5rem] bg-gradient-to-br from-slate-900/90 via-slate-900/65 to-indigo-900/20 border border-indigo-400/20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-indigo-500/20 flex flex-col gap-4 bg-slate-900/55 backdrop-blur-xl z-20">
                            <div className="flex justify-between items-center">
                                <h3 className="font-black text-xl text-white flex items-center gap-3 uppercase tracking-tight">
                                    <div className="p-2 bg-indigo-500/20 border border-indigo-500/40 rounded-xl shadow-lg shadow-indigo-500/25">
                                        <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    History
                                </h3>
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-300 hover:text-indigo-300 border border-transparent hover:border-indigo-400/30">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex p-1 bg-slate-900/45 rounded-2xl gap-1 border border-indigo-500/25">
                                <button
                                    onClick={() => setView('list')}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${view === 'list'
                                        ? 'bg-indigo-500 text-white shadow-sm'
                                        : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                                >
                                    <List className="w-3.5 h-3.5" /> List
                                </button>
                                <button
                                    onClick={() => setView('calendar')}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${view === 'calendar'
                                        ? 'bg-indigo-500 text-white shadow-sm'
                                        : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Calendar className="w-3.5 h-3.5" /> Calendar
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/35 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                {view === 'list' ? (
                                    <motion.div
                                        key="list"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="space-y-4"
                                    >
                                        {historyEntries.length === 0 ? (
                                            <div className="text-center py-20">
                                                <div className="w-16 h-16 bg-slate-800/50 rounded-full mx-auto mb-4 flex items-center justify-center border border-indigo-500/20">
                                                    <List className="w-6 h-6 text-slate-300" />
                                                </div>
                                                <p className="text-sm font-black text-slate-100 uppercase tracking-tighter">No history yet</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Logs are auto-saved daily</p>
                                            </div>
                                        ) : (
                                            historyEntries.map(([date, data]) => (
                                                <motion.div
                                                    key={date}
                                                    layout
                                                    className="bg-slate-900/45 p-4 rounded-2xl border border-indigo-500/20 hover:border-indigo-400/50 transition-all group shadow-sm"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <div className="font-black text-xs text-slate-100 uppercase tracking-tight">{formatDate(date)}</div>
                                                                {getHolidayName(date) && (
                                                                    <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-300 text-[8px] font-black uppercase tracking-widest rounded-full border border-indigo-500/30">
                                                                        {getHolidayName(date)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[9px] text-slate-500 flex gap-3 font-bold uppercase tracking-widest">
                                                                <span>Work: <b className="text-indigo-500">{data.effectiveWorkTime ? Math.floor(data.effectiveWorkTime / 60) + 'h ' + (data.effectiveWorkTime % 60) + 'm' : '-'}</b></span>
                                                                <span className="opacity-40">|</span>
                                                                <span>Breaks: <b className="text-slate-300">{data.totalOutTime || 0}m</b></span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                onLoadEntry(data);
                                                                showSuccess && showSuccess('📥 Entry loaded successfully!');
                                                                onClose();
                                                            }}
                            className="text-[9px] bg-slate-900/80 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2 border border-indigo-400/20 hover:shadow-lg shadow-indigo-500/20"
                                                        >
                                                            <CornerUpLeft className="w-3.5 h-3.5" /> Load
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="calendar"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                    >
                                        <CalendarView
                                            history={history}
                                            onLoadEntry={onLoadEntry}
                                            onClose={onClose}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-900/55 border-t border-indigo-500/20 flex justify-between items-center z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {historyEntries.length} entries
                            </span>
                            <button
                                onClick={() => {
                                    onExport();
                                    showSuccess && showSuccess('📊 Export successful!');
                                }}
                                disabled={historyEntries.length === 0}
                                className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-30 disabled:grayscale shadow-lg shadow-indigo-500/20"
                            >
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                        </div>
                    </motion.div>
                </DivWrapper>
            )}
        </AnimatePresence>
    );
};

const DivWrapper = ({ children, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md"
        onClick={onClose}
    >
        {children}
    </motion.div>
);
