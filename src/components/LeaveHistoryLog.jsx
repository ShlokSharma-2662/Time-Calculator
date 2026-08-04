import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Calendar, Tag, FileText, Cloud, User, Trash2, SlidersHorizontal
} from 'lucide-react';
import { getLeaveHistory } from '../utils/leaveHistory';

const CATEGORIES = ['All', 'EL', 'CO', 'CF', 'MR', 'PFH', 'WFH'];
const TYPES = ['All', 'Taken', 'Credit'];
const ITEMS_PER_PAGE = 10;

export function LeaveHistoryLog({ leaves: leavesProp, fyLabel }) {
    const { leaves: storedLeaves } = getLeaveHistory();
    const leaves = leavesProp || storedLeaves;
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const filteredLeaves = useMemo(() => {
        return (leaves || []).filter(l => {
            const remarks = (l.remarks || '').toLowerCase();
            const matchesSearch = remarks.includes(searchTerm.toLowerCase());

            const cat = l.category || l.leaveType || 'EL';
            const matchesCategory = filterCategory === 'All' || cat === filterCategory;

            const isCredit = l.days < 0 || l.transactionType === 'credit';
            const matchesType = filterType === 'All' ||
                (filterType === 'Taken' && !isCredit) ||
                (filterType === 'Credit' && isCredit);

            return matchesSearch && matchesCategory && matchesType;
        });
    }, [leaves, searchTerm, filterCategory, filterType]);

    const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / ITEMS_PER_PAGE));
    const paginatedLeaves = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredLeaves.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredLeaves, currentPage]);

    // Reset to first page when filters or source data change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCategory, filterType, leaves.length]);

    return (
        <div className="glass-card mt-8 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2.5 bg-indigo-500/10 rounded-xl hover:bg-indigo-500/20 transition-all text-indigo-500"
                    >
                        {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Transaction History</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {filteredLeaves.length} Records Found • Page {currentPage} of {totalPages}
                            {fyLabel ? ` • FY ${fyLabel}` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search remarks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all w-full md:w-48"
                        />
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                        <Tag className="w-3 h-3 text-slate-500" />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-300 focus:outline-none"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                        <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-300 focus:outline-none"
                        >
                            {TYPES.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
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
                        <div className="overflow-x-auto -mx-6">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-4 py-4">Category</th>
                                        <th className="px-4 py-4">Type</th>
                                        <th className="px-4 py-4 text-center">Magnitude</th>
                                        <th className="px-6 py-4">Remarks</th>
                                        <th className="px-6 py-4 text-right">Source</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedLeaves.map((leave, idx) => {
                                        const isCredit = leave.days < 0 || leave.transactionType === 'credit';
                                        const cat = leave.category || leave.leaveType || 'EL';

                                        return (
                                            <motion.tr
                                                key={leave.id || idx}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className="hover:bg-white/[0.02] transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400 group-hover:text-indigo-400 transition-colors">
                                                        <Calendar className="w-3 h-3 opacity-40" />
                                                        {leave.date}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${cat === 'EL' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                                        cat === 'CO' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                        }`}>
                                                        {cat}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                                    {leave.type || (leave.days === 0.5 ? 'Half Day' : leave.days === 1.0 ? 'Full Day' : leave.transactionType === 'credit' ? 'Credit' : 'Adjustment')}
                                                </td>
                                                <td className="px-4 py-4 text-center font-mono text-xs font-black">
                                                    <span className={isCredit ? 'text-emerald-500' : 'text-rose-500'}>
                                                        {isCredit ? `+${Math.abs(leave.days || leave.creditDays || 0).toFixed(2)}` : `-${Math.abs(leave.days || leave.consumedDays || 0).toFixed(2)}`}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-medium text-slate-400 italic max-w-[200px] truncate">
                                                    {leave.remarks || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {leave.isCloud ? (
                                                        <div className="flex items-center justify-end gap-1.5 text-indigo-400/60 group-hover:text-indigo-400 transition-colors">
                                                            <Cloud className="w-3 h-3" />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">Cloud</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-1.5 text-slate-600 group-hover:text-slate-400 transition-colors">
                                                            <User className="w-3 h-3" />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">Local</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                    {paginatedLeaves.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-20">
                                                    <Search className="w-8 h-8 text-slate-400" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No records found</p>
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
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Showing {Math.min(filteredLeaves.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} to {Math.min(filteredLeaves.length, currentPage * ITEMS_PER_PAGE)} of {filteredLeaves.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-white" />
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1
                                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                    : 'bg-white/5 text-slate-500 hover:bg-white/10'
                                                    }`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
