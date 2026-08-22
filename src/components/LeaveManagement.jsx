import React, { useMemo, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
    ShieldCheck, TrendingUp, Calendar, Zap,
    Award, PieChart, Database
} from 'lucide-react';
import { LeaveTracker } from './LeaveTracker';
import { LeaveBalanceTable } from './LeaveBalanceTable';
import { EncashmentProjection } from './EncashmentProjection';
import { SalaryStructure } from './SalaryStructure';
import { LeaveImport } from './LeaveImport';
import { LeaveHistoryLog } from './LeaveHistoryLog';
import { calculateMonthlyAccrual } from '../utils/elCalculations';
import { calculateCOStatus, getLeaveHistory } from '../utils/leaveHistory';
import { INITIAL_BALANCES } from '../data/seedHistory';
import { getLocalISODate } from '../utils/dateUtils';
import {
    formatFinancialYearLabel,
    getAvailableFinancialYears,
    getCurrentFinancialYearStartYear,
    getFinancialYearRange,
    isDateInFinancialYear,
} from '../utils/financialYear';

const CountUp = ({ value }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => latest.toFixed(1));

    useEffect(() => {
        const controls = animate(count, parseFloat(value) || 0, {
            duration: 2,
            ease: [0.16, 1, 0.3, 1]
        });
        return controls.stop;
    }, [value, count]);

    return <motion.span>{rounded}</motion.span>;
};

export function LeaveManagement() {
    const { leaves } = getLeaveHistory();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [selectedFYStartYear, setSelectedFYStartYear] = useState(getCurrentFinancialYearStartYear());

    const financialYearOptions = useMemo(
        () => getAvailableFinancialYears(leaves, { includeCurrent: true }),
        [leaves]
    );

    useEffect(() => {
        if (!financialYearOptions.includes(selectedFYStartYear) && financialYearOptions.length > 0) {
            setSelectedFYStartYear(financialYearOptions[0]);
        }
    }, [financialYearOptions, selectedFYStartYear]);

    const today = getLocalISODate();
    const fyLabel = formatFinancialYearLabel(selectedFYStartYear);
    const fyRange = useMemo(
        () => getFinancialYearRange(selectedFYStartYear),
        [selectedFYStartYear]
    );
    const scopedLeaves = useMemo(
        () => leaves.filter((leave) => isDateInFinancialYear(leave.date || leave.startDate, selectedFYStartYear)),
        [leaves, selectedFYStartYear]
    );
    const accrualEndDate = fyRange.endDate && fyRange.endDate < today ? fyRange.endDate : today;
    const accruedEL = calculateMonthlyAccrual(fyRange.startDate, accrualEndDate);

    // Calculate Top Stats
    const stats = useMemo(() => {
        let totalTaken = 0;
        const categoryBuckets = {};
        const excludedFromAvailable = new Set(['LWP']);
        const coStatus = calculateCOStatus(scopedLeaves, today);

        scopedLeaves.forEach(l => {
            // Global Taken Tally (all categories)
            if (l.days > 0) totalTaken += l.days;

            const category = l.category || l.leaveType || 'EL';
            if (excludedFromAvailable.has(category)) return;

            if (!categoryBuckets[category]) {
                categoryBuckets[category] = {
                    opening: null,
                    openingDate: null,
                    credited: 0,
                    consumed: 0,
                };
            }

            const bucket = categoryBuckets[category];
            const opening = Number(l.openingBalance);
            const dateCandidate = new Date(l.date || l.transactionDate || l.startDate || l.endDate || today);
            if (Number.isFinite(opening) && !Number.isNaN(dateCandidate.getTime())) {
                if (!bucket.openingDate || dateCandidate < bucket.openingDate) {
                    bucket.opening = opening;
                    bucket.openingDate = dateCandidate;
                }
            }

            const transactionType = (l.transactionType || '').toLowerCase();
            const magnitude = Math.abs(Number(l.days || l.consumedDays || l.creditDays || 0));
            if (magnitude <= 0) return;

            const isCredit = transactionType === 'credit'
                || transactionType === 'monthly_increment'
                || Number(l.creditDays) > 0
                || (transactionType === '' && Number(l.days) < 0);

            if (isCredit) {
                bucket.credited += magnitude;
            } else {
                bucket.consumed += magnitude;
            }
        });

        const totalAvailable = Object.entries(categoryBuckets).reduce((sum, [category, bucket]) => {
            const opening = bucket.opening ?? (INITIAL_BALANCES[category]?.opening || 0);
            const effectiveCredited = category === 'EL' && bucket.credited === 0
                ? accruedEL
                : bucket.credited;
            const available = category === 'CO'
                ? opening + coStatus.totalCredited - coStatus.totalConsumed - coStatus.expired
                : opening + effectiveCredited - bucket.consumed;
            return sum + available;
        }, 0);

        return {
            totalTaken: totalTaken.toFixed(1),
            totalAvailable: totalAvailable.toFixed(1),
        };
    }, [accruedEL, scopedLeaves, today]);

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
            {/* Ambient Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div
                    animate={{
                        x: [0, 100, -50, 0],
                        y: [0, 50, 100, 0],
                        scale: [1, 1.2, 0.9, 1],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full"
                />
                <motion.div
                    animate={{
                        x: [0, -100, 50, 0],
                        y: [0, 100, -50, 0],
                        scale: [1, 0.8, 1.1, 1],
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-600/10 blur-[140px] rounded-full"
                />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Leave</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        FY {fyLabel}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedFYStartYear}
                        onChange={(event) => setSelectedFYStartYear(Number(event.target.value))}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-sm cursor-pointer"
                    >
                        {financialYearOptions.map((fyStart) => (
                            <option key={fyStart} value={fyStart} className="bg-slate-900">
                                FY {formatFinancialYearLabel(fyStart)}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 group"
                    >
                        <Database className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm">Import HR file</span>
                    </button>
                </div>
            </div>

            <LeaveImport
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
            />

            {/* Premium Stats Header */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    variants={itemVariants}
                    className="glass-card relative overflow-hidden group border-indigo-500/20"
                >
                    <motion.div
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm"
                    />
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="w-12 h-12 text-indigo-500" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl">
                            <ShieldCheck className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Available</p>
                            <h4 className="text-3xl font-semibold neon-text-indigo">
                                <CountUp value={stats.totalAvailable} />
                            </h4>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    className="glass-card relative overflow-hidden group border-violet-500/20"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <PieChart className="w-12 h-12 text-violet-500" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-500/10 rounded-2xl">
                            <Calendar className="w-6 h-6 text-violet-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Taken</p>
                            <h4 className="text-3xl font-semibold neon-text-violet">
                                <CountUp value={stats.totalTaken} />
                            </h4>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    className="glass-card relative overflow-hidden group border-rose-500/20"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Award className="w-12 h-12 text-rose-500" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-500/10 rounded-2xl">
                            <TrendingUp className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Monthly accrual</p>
                            <h4 className="text-3xl font-semibold text-rose-400">
                                <CountUp value={accruedEL.toFixed(1)} />
                            </h4>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Grid */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Side: Balance and Salary */}
                <div className="lg:col-span-8 space-y-8">
                    <motion.div variants={itemVariants}>
                        <LeaveBalanceTable leaves={leaves} fyStartYear={selectedFYStartYear} />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <SalaryStructure />
                    </motion.div>
                </div>

                {/* Right Side: Projections and Tracker */}
                <div className="lg:col-span-4 space-y-6">
                    <motion.div variants={itemVariants}>
                        <EncashmentProjection leaves={leaves} fyStartYear={selectedFYStartYear} />
                    </motion.div>

                    <motion.div variants={itemVariants} className="glass-card bg-indigo-600/5 border-indigo-500/20">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <Zap className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h4 className="text-sm font-semibold text-white">Quick register</h4>
                        </div>
                        <LeaveTracker />
                    </motion.div>
                </div>
            </div>

            {/* Transaction History Log (Archive) */}
            <div className="mt-12 relative z-10">
                <motion.div variants={itemVariants}>
                    <LeaveHistoryLog leaves={scopedLeaves} fyLabel={fyLabel} />
                </motion.div>
            </div>
        </motion.div>
    );
}

export default LeaveManagement;
