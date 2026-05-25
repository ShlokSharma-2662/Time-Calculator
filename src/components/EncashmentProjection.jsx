import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowUpRight, Ban, Info, ShieldCheck, IndianRupee, Eye, EyeOff } from 'lucide-react';
import { calculateMonthlyAccrual } from '../utils/elCalculations';
import { getLeaveHistory } from '../utils/leaveHistory';
import { INITIAL_BALANCES } from '../data/seedHistory';
import { useFinancialSettings } from '../hooks/useFinancialSettings';
import { PasscodeModal } from './PasscodeModal';
import {
    formatFinancialYearLabel,
    getCurrentFinancialYearStartYear,
    getFinancialYearRange,
    isDateInFinancialYear,
} from '../utils/financialYear';

export function EncashmentProjection({ leaves: leavesProp, fyStartYear }) {
    const { leaves: storedLeaves } = getLeaveHistory();
    const allLeaves = leavesProp || storedLeaves;
    const selectedFYStartYear = Number.isFinite(fyStartYear)
        ? fyStartYear
        : getCurrentFinancialYearStartYear();
    const fyLabel = formatFinancialYearLabel(selectedFYStartYear);
    const fyRange = getFinancialYearRange(selectedFYStartYear);
    const fyScopedLeaves = useMemo(
        () => allLeaves.filter((leave) => isDateInFinancialYear(leave.date || leave.startDate, selectedFYStartYear)),
        [allLeaves, selectedFYStartYear]
    );
    const { financialData, isPrivacyMode, togglePrivacy, hasPasscode, setPasscode } = useFinancialSettings();
    const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
    const [isSettingMode, setIsSettingMode] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const accrualEndDate = fyRange.endDate && fyRange.endDate < today ? fyRange.endDate : today;
    const accruedEL = calculateMonthlyAccrual(fyRange.startDate, accrualEndDate);

    const projection = useMemo(() => {
        const elLeaves = fyScopedLeaves.filter((leave) => (leave.category || leave.leaveType || 'EL') === 'EL');
        const elTaken = elLeaves
            .filter((leave) => leave.days > 0)
            .reduce((sum, leave) => sum + leave.days, 0);
        const elCreditFromTransactions = elLeaves
            .filter((leave) => leave.days < 0)
            .reduce((sum, leave) => sum + Math.abs(leave.days), 0);
        const openingCandidates = elLeaves
            .filter((leave) => Number.isFinite(Number(leave.openingBalance)))
            .sort((a, b) => new Date(a.date || a.transactionDate || a.startDate) - new Date(b.date || b.transactionDate || b.startDate));
        const elOpening = openingCandidates.length > 0
            ? Number(openingCandidates[0].openingBalance)
            : INITIAL_BALANCES.EL.opening;

        const effectiveELCredit = elCreditFromTransactions > 0 ? elCreditFromTransactions : accruedEL;
        const available = elOpening + effectiveELCredit - elTaken;

        const carryForward = Math.min(available, 6);
        const afterCF = Math.max(0, available - carryForward);

        const encashable = Math.min(afterCF, 8);
        const lapsed = Math.max(0, afterCF - encashable);

        const estValueBasic = (financialData.basic / 30) * encashable;
        const estValueGross = (financialData.grossMonthly / 30) * encashable;

        return {
            total: available.toFixed(1),
            cf: carryForward.toFixed(1),
            enc: encashable.toFixed(1),
            lap: lapsed.toFixed(1),
            estValueBasic: estValueBasic.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
            estValueGross: estValueGross.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
            percentCF: (carryForward / (available || 1)) * 100,
            percentENC: (encashable / (available || 1)) * 100,
            percentLAP: (lapsed / (available || 1)) * 100
        };
    }, [fyScopedLeaves, accruedEL, financialData.basic, financialData.grossMonthly]);

    const handleToggle = () => {
        if (!isPrivacyMode) {
            togglePrivacy();
            return;
        }

        if (!hasPasscode) {
            setIsSettingMode(true);
            setIsPasscodeModalOpen(true);
        } else {
            setIsSettingMode(false);
            setIsPasscodeModalOpen(true);
        }
    };

    const handlePasscodeSuccess = (input) => {
        if (isSettingMode) {
            setPasscode(input);
            togglePrivacy(input);
            setIsPasscodeModalOpen(false);
            return true;
        } else {
            const success = togglePrivacy(input);
            if (success) setIsPasscodeModalOpen(false);
            return success;
        }
    };

    const blurClass = isPrivacyMode ? "blur-md select-none transition-all duration-300" : "transition-all duration-300";

    return (
        <div className="glass-card flex flex-col h-full bg-violet-600/5 border-violet-500/20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-500/10 rounded-xl">
                        <Wallet className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white tracking-widest uppercase">Encashment Projection</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tentative Analysis (FY {fyLabel})</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleToggle}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-600 hover:text-white transition-all"
                        title={isPrivacyMode ? "Show Details" : "Hide Details"}
                    >
                        {isPrivacyMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <div className="text-right">
                        <span className="text-xs font-black neon-text-violet">{projection.total}</span>
                        <p className="text-[8px] font-black text-slate-600 uppercase">Available</p>
                    </div>
                </div>
            </div>

            <PasscodeModal
                isOpen={isPasscodeModalOpen}
                onClose={() => setIsPasscodeModalOpen(false)}
                onSuccess={handlePasscodeSuccess}
                isSettingMode={isSettingMode}
            />

            {/* Segmented Bar */}
            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden flex mb-6">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${projection.percentCF}%` }}
                    className="h-full bg-emerald-500 border-r border-emerald-400/20"
                    title={`Carry Forward: ${projection.cf}`}
                />
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${projection.percentENC}%` }}
                    transition={{ delay: 0.1 }}
                    className="h-full bg-indigo-500 border-r border-indigo-400/20"
                    title={`Encashable: ${projection.enc}`}
                />
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${projection.percentLAP}%` }}
                    transition={{ delay: 0.2 }}
                    className="h-full bg-slate-700"
                    title={`Lapsed: ${projection.lap}`}
                />
            </div>

            {/* Breakdown List */}
            <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="p-2 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                    <div className="flex items-center gap-1.5 mb-1">
                        <ArrowUpRight className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="text-[7px] font-black text-slate-500 uppercase">TO CF</span>
                    </div>
                    <p className="text-base font-black text-white">{projection.cf}</p>
                </div>
                <div className="p-2 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Wallet className="w-2.5 h-2.5 text-indigo-400" />
                        <span className="text-[7px] font-black text-slate-500 uppercase">TO Cash</span>
                    </div>
                    <p className="text-base font-black text-white">{projection.enc}</p>
                </div>
                <div className="p-2 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Ban className="w-2.5 h-2.5 text-slate-500" />
                        <span className="text-[7px] font-black text-slate-500 uppercase">Lapsed</span>
                    </div>
                    <p className="text-base font-black text-slate-400">{projection.lap}</p>
                </div>
            </div>

            {/* Estimated Valuation Card */}
            <div className="bg-indigo-500/10 rounded-2xl p-4 border border-indigo-500/20 mb-6 group/eval overflow-hidden relative">
                <div className="absolute inset-0 bg-indigo-500/5 group-hover/eval:bg-indigo-500/10 transition-colors" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                                <IndianRupee className="w-3 h-3 text-indigo-400" />
                            </div>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Est. Payout</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Based on Basic</span>
                            <h4 className={`text-xl font-black text-white tracking-tighter ${blurClass}`}>₹{projection.estValueBasic}</h4>
                        </div>
                        <div className="flex items-center justify-between opacity-80 decoration-indigo-500/30">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Based on Gross</span>
                            <h4 className={`text-lg font-bold text-slate-300 tracking-tighter ${blurClass}`}>₹{projection.estValueGross}</h4>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 flex items-start gap-2">
                <ShieldCheck className="w-3 h-3 text-slate-600 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-tight">
                    <strong className="text-indigo-400">Valuation:</strong> Calculated based on settings (Salary / 30 * days).
                </p>
            </div>
        </div>
    );
}
