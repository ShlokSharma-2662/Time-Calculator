import React from 'react';
import { IndianRupee, TrendingUp, ShieldHalf, ArrowDownToLine, ReceiptText, Eye, EyeOff } from 'lucide-react';
import { useFinancialSettings } from '../hooks/useFinancialSettings';
import { PasscodeModal } from './PasscodeModal';

export function SalaryStructure() {
    const { financialData, isPrivacyMode, togglePrivacy, hasPasscode, setPasscode } = useFinancialSettings();
    const [isPasscodeModalOpen, setIsPasscodeModalOpen] = React.useState(false);
    const [isSettingMode, setIsSettingMode] = React.useState(false);

    const handleToggle = () => {
        if (!isPrivacyMode) {
            // Turning privacy ON
            togglePrivacy();
            return;
        }

        // Turning privacy OFF (Revealing)
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

    const earnings = [
        { name: 'Basic Salary', amount: financialData.basic, color: 'text-indigo-400' },
        { name: 'HRA', amount: financialData.hra, color: 'text-slate-400' },
        { name: 'Transport', amount: financialData.transport, color: 'text-slate-400' },
        { name: 'CCA Allowance', amount: financialData.cca, color: 'text-slate-400' },
    ];

    const deductions = [
        { name: 'Provident Fund', amount: financialData.employeePF },
        { name: 'Professional Tax', amount: financialData.pt },
    ];

    const blurClass = isPrivacyMode ? "blur-md select-none transition-all duration-300" : "transition-all duration-300";

    return (
        <div className="glass-card relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />

            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                        <ReceiptText className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white tracking-widest uppercase">Pay Structure</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Monthly CTC Details</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleToggle}
                        className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all flex items-center gap-2 group/btn"
                        title={isPrivacyMode ? "Show Details" : "Hide Details"}
                    >
                        {isPrivacyMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/btn:block">
                            {isPrivacyMode ? "Reveal" : "Mask"}
                        </span>
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Active Slab</span>
                    </div>
                </div>
            </div>

            <PasscodeModal
                isOpen={isPasscodeModalOpen}
                onClose={() => setIsPasscodeModalOpen(false)}
                onSuccess={handlePasscodeSuccess}
                isSettingMode={isSettingMode}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Earnings Breakdown</h4>
                    </div>
                    {earnings.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between group/item">
                            <span className="text-xs font-bold text-slate-400 group-hover/item:text-slate-200 transition-colors uppercase tracking-tight">{item.name}</span>
                            <span className={`text-xs font-black ${item.color} ${blurClass}`}>₹{Math.round(item.amount).toLocaleString()}</span>
                        </div>
                    ))}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs font-black text-white uppercase tracking-wider">Gross Total</span>
                        <span className={`text-sm font-black text-white ${blurClass}`}>₹{Math.round(financialData.grossMonthly).toLocaleString()}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldHalf className="w-3.5 h-3.5 text-rose-400" />
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Statutory Deductions</h4>
                    </div>
                    {deductions.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between group/item">
                            <span className="text-xs font-medium text-slate-500 group-hover/item:text-slate-400 transition-colors uppercase tracking-tight">{item.name}</span>
                            <span className={`text-xs font-black text-rose-500/70 ${blurClass}`}>₹{Math.round(item.amount).toLocaleString()}</span>
                        </div>
                    ))}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Deductions</span>
                        <span className={`text-sm font-black text-rose-500 ${blurClass}`}>₹{Math.round(financialData.employeePF + financialData.pt).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="bg-indigo-600/10 -mx-6 -mb-6 p-6 border-t border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-2xl">
                        <ArrowDownToLine className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest">Net Take-Home</p>
                        <h4 className={`text-3xl font-black text-white tracking-tighter ${blurClass}`}>₹{Math.round(financialData.netPay).toLocaleString()}</h4>
                    </div>
                </div>
                <div className="flex flex-col items-start sm:items-end">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <IndianRupee className="w-3 h-3" />
                        Annual CTC
                    </div>
                    <h5 className={`text-sm font-black text-emerald-400 ${blurClass}`}>₹{financialData.annualCTC.toLocaleString()}</h5>
                </div>
            </div>
        </div>
    );
}
