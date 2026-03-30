import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, Info, TrendingUp, Calendar, Zap,
    Award, PieChart, Database, LayoutGrid, Sliders
} from 'lucide-react';
import { LeaveTracker } from './LeaveTracker';
import { LeaveBalanceTable } from './LeaveBalanceTable';
import { EncashmentProjection } from './EncashmentProjection';
import { SalaryStructure } from './SalaryStructure';
import { LeaveImport } from './LeaveImport';
import { calculateMonthlyAccrual } from '../utils/elCalculations';
import { getLeaveHistory } from '../utils/leaveHistory';
import { INITIAL_BALANCES } from '../data/seedHistory';

export function LeaveManagement() {
    const { leaves } = getLeaveHistory();
    const [isImportOpen, setIsImportOpen] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const accruedEL = leaves.length > 0 ? calculateMonthlyAccrual('2025-04-01', today) : 0;

    // Calculate Top Stats
    const stats = useMemo(() => {
        let totalTaken = 0;
        let elConsumed = 0;
        let elCredited = 0;

        leaves.forEach(l => {
            // Global Taken Tally (all categories)
            if (l.days > 0) totalTaken += l.days;

            // EL Specific Tally (for top card)
            const cat = l.category || 'EL';
            if (cat === 'EL') {
                if (l.days < 0) {
                    elCredited += Math.abs(l.days);
                } else {
                    elConsumed += l.days;
                }
            }
        });

        const elAvailable = INITIAL_BALANCES.EL.opening + elCredited - elConsumed;

        return {
            totalTaken: totalTaken.toFixed(1),
            elAvailable: elAvailable.toFixed(1),
        };
    }, [leaves]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 pb-12"
        >
            {/* Action Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                        <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em]">Leave Management</h2>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">Your Financial & Leave Dashboard</h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2.5 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all group"
                    >
                        <Database className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-widest">Migrate Legacy Data</span>
                    </button>
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-slate-500 hover:text-white cursor-pointer transition-colors">
                        <Sliders className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <LeaveImport
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
            />

            {/* Premium Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="glass-card glass-card-hover relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="w-12 h-12 text-indigo-500" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl">
                            <ShieldCheck className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">EL Available</p>
                            <h4 className="text-3xl font-black neon-text-indigo">{stats.elAvailable}</h4>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="glass-card glass-card-hover relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <PieChart className="w-12 h-12 text-violet-500" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-500/10 rounded-2xl">
                            <Calendar className="w-6 h-6 text-violet-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Total Taken</p>
                            <h4 className="text-3xl font-black neon-text-violet">{stats.totalTaken}</h4>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="glass-card glass-card-hover relative overflow-hidden group border-rose-500/20">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Award className="w-12 h-12 text-rose-500" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-500/10 rounded-2xl">
                            <TrendingUp className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Monthly Accrual</p>
                            <h4 className="text-3xl font-black text-rose-500" style={{ textShadow: '0 0 10px rgba(244, 63, 94, 0.3)' }}>1.75</h4>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Side: Balance and Salary */}
                <div className="lg:col-span-8 space-y-8">
                    <motion.div variants={itemVariants}>
                        <LeaveBalanceTable />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <SalaryStructure />
                    </motion.div>
                </div>

                {/* Right Side: Projections and Tracker */}
                <div className="lg:col-span-4 space-y-6">
                    <motion.div variants={itemVariants}>
                        <EncashmentProjection />
                    </motion.div>

                    <motion.div variants={itemVariants} className="glass-card bg-indigo-600/5 border-indigo-500/20">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <Zap className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">Quick Register</h4>
                        </div>
                        <LeaveTracker />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}

export default LeaveManagement;
