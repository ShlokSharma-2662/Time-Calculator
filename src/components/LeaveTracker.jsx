import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Trash2, Plus, Coffee, Moon, Sun, MapPin } from 'lucide-react';
import { getLeaveHistory, addLeaveToHistory, removeLeaveFromHistory, LEAVE_TYPES, LEAVE_CATEGORIES } from '../utils/leaveHistory';
import { formatDate } from '../utils/dateUtils';
import { useUI } from '../context/UIContext';

export function LeaveTracker() {
    const { showSuccess, confirm } = useUI();
    const [history, setHistory] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState(LEAVE_TYPES.FULL);
    const [category, setCategory] = useState(LEAVE_CATEGORIES.EL);
    const [remarks, setRemarks] = useState('');
    const [shortDuration, setShortDuration] = useState(60); // minutes

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = () => {
        const data = getLeaveHistory();
        setHistory(data.leaves);
    };

    const handleAdd = (e) => {
        e.preventDefault();

        const leaveData = {
            date,
            type,
            category,
            remarks,
            durationMinutes: type === LEAVE_TYPES.SHORT ? parseInt(shortDuration) : 0
        };

        addLeaveToHistory(leaveData);
        showSuccess('Leave entry added successfully!');
        setRemarks('');
        loadHistory();
    };

    const handleDelete = async (id) => {
        if (await confirm('Permanently delete this entry?')) {
            removeLeaveFromHistory(id);
            loadHistory();
        }
    };

    return (
        <div className="space-y-8">
            {/* Action Form */}
            <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none font-bold"
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none font-bold cursor-pointer appearance-none"
                        >
                            {Object.values(LEAVE_CATEGORIES).map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Duration Type</label>
                    <div className="flex flex-wrap gap-2">
                        {[LEAVE_TYPES.FULL, LEAVE_TYPES.HALF_1, LEAVE_TYPES.HALF_2].map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${type === t ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                            >
                                {t.replace('Day', '').trim()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Remarks</label>
                    <input
                        type="text"
                        placeholder="Add a reason or note..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none font-medium"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 group"
                >
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                    Log Entry
                </button>
            </form>

            {/* Timeline History */}
            <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Recent Activity</h5>
                    <span className="text-[9px] text-slate-600 font-bold">{history.length} Logs</span>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {history.map((leave) => (
                            <motion.div
                                key={leave.id || leave.timestamp}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="group relative flex gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] rounded-xl transition-all"
                            >
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                    <Calendar className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-tighter">
                                            {leave.category} · {leave.type.replace('Day', '').trim()}
                                        </p>
                                        <button
                                            onClick={() => handleDelete(leave.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-rose-500 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold mb-1">
                                        {formatDate(leave.date)}
                                    </p>
                                    {leave.remarks && (
                                        <p className="text-[10px] text-slate-400 font-medium italic truncate">
                                            "{leave.remarks}"
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

const customScrollbarStyle = `
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
`;
