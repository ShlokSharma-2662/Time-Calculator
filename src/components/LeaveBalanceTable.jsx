import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Info, TrendingUp, Calendar, RefreshCcw, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import { calculateMonthlyAccrual } from '../utils/elCalculations';
import { getLeaveHistory, clearHistory, calculateCOStatus } from '../utils/leaveHistory';
import { INITIAL_BALANCES } from '../data/seedHistory';
import {
    formatFinancialYearLabel,
    getCurrentFinancialYearStartYear,
    getFinancialYearRange,
    isDateInFinancialYear,
} from '../utils/financialYear';

export function LeaveBalanceTable({ leaves: leavesProp, fyStartYear }) {
    const { leaves: storedLeaves } = getLeaveHistory();
    const allLeaves = leavesProp || storedLeaves;
    const selectedFYStartYear = Number.isFinite(fyStartYear)
        ? fyStartYear
        : getCurrentFinancialYearStartYear();
    const fyLabel = formatFinancialYearLabel(selectedFYStartYear);
    const fyRange = getFinancialYearRange(selectedFYStartYear);

    const leaves = useMemo(
        () => allLeaves.filter((leave) => isDateInFinancialYear(leave.date || leave.startDate, selectedFYStartYear)),
        [allLeaves, selectedFYStartYear]
    );
    const today = new Date().toISOString().split('T')[0];
    const accrualEndDate = fyRange.endDate && fyRange.endDate < today ? fyRange.endDate : today;
    const accruedEL = useMemo(
        () => calculateMonthlyAccrual(fyRange.startDate, accrualEndDate),
        [fyRange.startDate, accrualEndDate]
    );

    const balances = useMemo(() => {
        const coStatus = calculateCOStatus(leaves, today);
        const openingByCategory = {};

        leaves.forEach((leave) => {
            const category = leave.category || leave.leaveType || 'EL';
            const opening = Number(leave.openingBalance);
            if (!Number.isFinite(opening)) return;

            const dateValue = new Date(leave.date || leave.transactionDate || leave.startDate || leave.endDate);
            if (Number.isNaN(dateValue.getTime())) return;

            const previous = openingByCategory[category];
            if (!previous || dateValue < previous.date) {
                openingByCategory[category] = { value: opening, date: dateValue };
            }
        });

        const getOpening = (category, fallback) => {
            return openingByCategory[category]?.value ?? fallback;
        };

        const result = {
            EL: { opening: getOpening('EL', INITIAL_BALANCES.EL.opening), consumed: 0, credited: 0, expired: 0 },
            CO: {
                opening: getOpening('CO', INITIAL_BALANCES.CO.opening),
                consumed: coStatus.totalConsumed,
                credited: coStatus.totalCredited,
                expired: coStatus.expired,
                expiringSoon: coStatus.expiringSoon
            },
            CF: { opening: getOpening('CF', INITIAL_BALANCES.CF.opening), consumed: 0, credited: 0, expired: 0 },
            MR: { opening: getOpening('MR', 0), consumed: 0, credited: 0, expired: 0 },
            PFH: { opening: getOpening('PFH', 0), consumed: 0, credited: 0, expired: 0 },
            WFH: { opening: getOpening('WFH', 0), consumed: 0, credited: 0, expired: 0 },
        };

        leaves.forEach(leave => {
            const cat = leave.category || leave.leaveType || 'EL';
            if (cat === 'CO' || !result[cat]) return;
            if (leave.days < 0) {
                result[cat].credited += Math.abs(leave.days);
            } else {
                result[cat].consumed += leave.days;
            }
        });

        // EL fallback: if no imported credit rows exist, project accrual for the FY.
        if (result.EL.credited === 0) {
            result.EL.credited = accruedEL;
        }

        return result;
    }, [accruedEL, leaves, today]);

    const handleReset = () => {
        if (window.confirm('Reset leave history to original register report?')) {
            clearHistory();
            window.location.reload();
        }
    };

    const rowData = [
        { id: 'EL', name: 'Earned Leave', icon: <Shield className="w-3.5 h-3.5 text-indigo-400" /> },
        { id: 'CO', name: 'Comp Off (30D)', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
        { id: 'CF', name: 'Carry Forward', icon: <RefreshCcw className="w-3.5 h-3.5 text-emerald-400" /> },
        { id: 'MR', name: 'Med. Reimb.', icon: <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" /> },
        { id: 'PFH', name: 'PFH', icon: <Calendar className="w-3.5 h-3.5 text-violet-400" /> },
        { id: 'WFH', name: 'WFH', icon: <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> },
    ];

    return (
        <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Leave Analytics</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">FY {fyLabel} Overview</p>
                    </div>
                </div>
                <button onClick={handleReset} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 transition-all hover:text-white group">
                    <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                </button>
            </div>

            <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                            <th className="px-6 py-4">Category</th>
                            <th className="px-4 py-4 text-center">Opening</th>
                            <th className="px-4 py-4 text-center">Used</th>
                            <th className="px-4 py-4 text-center">Earned</th>
                            <th className="px-4 py-4 text-center">Exp.</th>
                            <th className="px-6 py-4 text-right">Available</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rowData.map((row) => {
                            const data = balances[row.id] || { opening: 0, consumed: 0, credited: 0, expired: 0 };
                            const available = Number((data.opening + data.credited - data.consumed - data.expired).toFixed(2));

                            return (
                                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                                                {row.icon}
                                            </div>
                                            <span className="font-bold text-slate-300 group-hover:text-white transition-colors">{row.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 text-center text-slate-500 font-mono text-xs">
                                        {data.opening.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-5 text-center text-rose-500/80 font-mono text-xs font-bold">
                                        {data.consumed > 0 ? `-${data.consumed.toFixed(2)}` : '0.00'}
                                    </td>
                                    <td className="px-4 py-5 text-center text-emerald-500/80 font-mono text-xs font-bold">
                                        {data.credited > 0 ? `+${data.credited.toFixed(2)}` : '0.00'}
                                    </td>
                                    <td className="px-4 py-5 text-center text-rose-900/40 group-hover:text-rose-500/40 font-mono text-xs italic transition-colors">
                                        {data.expired > 0 ? `-${data.expired.toFixed(2)}` : '—'}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-black tracking-tight ${available > 0 ? 'neon-text-indigo' : 'text-slate-700'}`}>
                                                {available.toFixed(2)}
                                            </span>
                                            {row.id === 'CO' && data.expiringSoon?.length > 0 && (
                                                <span className="text-[9px] text-amber-500/80 font-bold flex items-center gap-1 mt-1">
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    {data.expiringSoon[0].daysLeft}d left
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                <Info className="w-3.5 h-3.5" />
                <span>Available = (Op + Er) - (Us + Ex)</span>
            </div>
        </div>
    );
}

const Zap = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.71 13 4l-1.5 8h8.5L11 20l1.5-8H4z" /></svg>
);
