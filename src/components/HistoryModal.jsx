import React from 'react';
import { X, Calendar, Download, CornerUpLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const HistoryModal = ({ isOpen, onClose, historyEntries, onLoadEntry, onExport, showSuccess }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <DivWrapper onClose={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] z-50 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 z-10">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-500" /> History
                            </h3>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
                            {historyEntries.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <p>No history recorded yet.</p>
                                    <p className="text-xs mt-1">Logs are saved automatically each day.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {historyEntries.map(([date, data]) => (
                                        <motion.div
                                            key={date}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.01 }}
                                            className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{date}</div>
                                                    <div className="text-xs text-slate-500 mt-1 flex gap-3">
                                                        <span>Work: <b className="text-slate-700 dark:text-slate-300">{data.effectiveWorkTime ? Math.floor(data.effectiveWorkTime / 60) + 'h ' + (data.effectiveWorkTime % 60) + 'm' : '-'}</b></span>
                                                        <span>Breaks: <b className="text-slate-700 dark:text-slate-300">{data.totalOutTime || 0}m</b></span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        onLoadEntry(data);
                                                        showSuccess && showSuccess('📥 Entry loaded successfully!');
                                                        onClose();
                                                    }}
                                                    className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1"
                                                >
                                                    <CornerUpLeft className="w-3 h-3" /> Load
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer actions */}
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-xs text-slate-400">
                                {historyEntries.length} entries stored
                            </span>
                            <button
                                onClick={() => {
                                    onExport();
                                    showSuccess && showSuccess('📊 Data exported to CSV!');
                                }}
                                disabled={historyEntries.length === 0}
                                className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

// Helper component for backdrop animation
const DivWrapper = ({ children, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
    >
        {children}
    </motion.div>
);
