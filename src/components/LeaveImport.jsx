import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileSpreadsheet, FileText, CheckCircle2,
    AlertCircle, Loader2, X, Download, ShieldCheck,
    Database, ArrowRight, Table, Fingerprint, Sparkles,
    FileType, Zap, Trash2, RefreshCw, Cloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseHRExport, parseCSVTemplate, importToFirestore, generateCompositeKey, clearLeaveHistory } from '../utils/leaveImporter';
import { downloadCSVTemplate } from '../utils/csvTemplate';
import { syncLeavesFromFirestore, pushLeavesToFirestore, getLeaveHistory } from '../utils/leaveHistory';
import { useUI } from '../context/UIContext';
import { formatFinancialYearLabel, getFinancialYearStartYear } from '../utils/financialYear';

export function LeaveImport({ isOpen, onClose }) {
    const { user } = useAuth();
    const { showSuccess, showError } = useUI();

    const [file, setFile] = useState(null);
    const [importMode, setImportMode] = useState('hr_export'); // 'hr_export' or 'csv'
    const [status, setStatus] = useState('idle'); // 'idle', 'parsing', 'review', 'uploading', 'success', 'error'
    const [records, setRecords] = useState([]);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [existingKeys, setExistingKeys] = useState(new Set());
    const [importMeta, setImportMeta] = useState({ employeeName: '', leaveBalances: [] });
    const [selectedFYStartYear, setSelectedFYStartYear] = useState(null);
    const fileInputRef = useRef(null);

    // Fetch existing keys for deduplication preview
    React.useEffect(() => {
        if (isOpen && user?.uid) {
            const fetchKeys = async () => {
                try {
                    const { collection, getDocs } = await import('firebase/firestore');
                    const { db } = await import('../firebase');
                    const { generateCompositeKey } = await import('../utils/leaveImporter');

                    const historyRef = collection(db, 'users', user.uid, 'leaveHistory');
                    const snapshot = await getDocs(historyRef);
                    const keys = new Set(snapshot.docs.map(doc => {
                        const d = doc.data();
                        return generateCompositeKey({
                            transactionDate: d.transactionDate || d.date,
                            leaveType: d.leaveType,
                            transactionType: d.transactionType,
                            days: d.days,
                            consumedDays: d.consumedDays,
                            creditDays: d.creditDays
                        });
                    }));
                    setExistingKeys(keys);
                } catch (err) {
                    console.error("Failed to fetch existing keys:", err);
                }
            };
            fetchKeys();
        }
    }, [isOpen, user?.uid]);

    const financialYearOptions = useMemo(() => {
        const years = new Set();
        records.forEach((record) => {
            const fy = getFinancialYearStartYear(record.transactionDate || record.date);
            if (Number.isFinite(fy)) years.add(fy);
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [records]);

    React.useEffect(() => {
        if (financialYearOptions.length === 0) {
            setSelectedFYStartYear(null);
            return;
        }
        if (!financialYearOptions.includes(selectedFYStartYear)) {
            setSelectedFYStartYear(financialYearOptions[0]);
        }
    }, [financialYearOptions, selectedFYStartYear]);

    const scopedRecords = useMemo(() => {
        if (!Number.isFinite(selectedFYStartYear)) return records;
        return records.filter((record) =>
            getFinancialYearStartYear(record.transactionDate || record.date) === selectedFYStartYear
        );
    }, [records, selectedFYStartYear]);

    const previewRecords = useMemo(() => {
        return scopedRecords.slice(0, 15).map((record) => ({
            ...record,
            isDuplicate: existingKeys.has(generateCompositeKey(record))
        }));
    }, [scopedRecords, existingKeys]);

    const scopedLeaveBalances = useMemo(() => {
        const grouped = new Map();

        scopedRecords.forEach((record) => {
            const leaveType = record.leaveType;
            const transactionDate = record.transactionDate || record.date;
            if (!leaveType || !transactionDate) return;

            const days = Math.abs(Number(record.days || record.consumedDays || record.creditDays || 0));
            const transactionType = record.transactionType || (record.creditDays > 0 ? 'credit' : 'debit');
            const openingBalance = Number(record.openingBalance || 0);
            const closingBalance = Number(record.closingBalance || 0);

            if (!grouped.has(leaveType)) {
                grouped.set(leaveType, {
                    leaveType,
                    openingBalance,
                    totalConsumed: 0,
                    totalCredited: 0,
                    availableBalance: Number.isFinite(closingBalance) ? closingBalance : openingBalance,
                    firstDate: transactionDate,
                    lastDate: transactionDate,
                });
            }

            const bucket = grouped.get(leaveType);

            if (transactionDate < bucket.firstDate) {
                bucket.firstDate = transactionDate;
                bucket.openingBalance = openingBalance;
            }
            if (transactionDate >= bucket.lastDate) {
                bucket.lastDate = transactionDate;
                if (Number.isFinite(closingBalance)) {
                    bucket.availableBalance = closingBalance;
                }
            }

            if (transactionType === 'credit') {
                bucket.totalCredited += days;
            } else {
                bucket.totalConsumed += days;
            }
        });

        return Array.from(grouped.values()).map((bucket) => ({
            leaveType: bucket.leaveType,
            openingBalance: bucket.openingBalance,
            totalConsumed: Number(bucket.totalConsumed.toFixed(2)),
            totalCredited: Number(bucket.totalCredited.toFixed(2)),
            availableBalance: Number.isFinite(bucket.availableBalance)
                ? Number(bucket.availableBalance.toFixed(2))
                : Number((bucket.openingBalance + bucket.totalCredited - bucket.totalConsumed).toFixed(2)),
        }));
    }, [scopedRecords]);

    const scopedImportCounts = useMemo(() => {
        const newCount = scopedRecords.filter((record) => !existingKeys.has(generateCompositeKey(record))).length;
        return {
            newCount,
            duplicateCount: scopedRecords.length - newCount,
        };
    }, [scopedRecords, existingKeys]);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (selectedFile.name.endsWith('.csv')) setImportMode('csv');
            else setImportMode('hr_export');
            setStatus('idle');
            setRecords([]);
            setResults(null);
            setImportMeta({ employeeName: '', leaveBalances: [] });
            setSelectedFYStartYear(null);
        }
    };

    const handleParse = async () => {
        if (!file) return;
        try {
            setStatus('parsing');
            let parsedRecords = [];
            if (importMode === 'hr_export') {
                const parsed = await parseHRExport(file);
                parsedRecords = parsed.records || [];
                setImportMeta({
                    employeeName: parsed.employeeName || '',
                    leaveBalances: parsed.leaveBalances || []
                });
            } else {
                parsedRecords = await parseCSVTemplate(file);
                setImportMeta({ employeeName: '', leaveBalances: [] });
            }

            if (parsedRecords.length === 0) {
                throw new Error("No valid records found in the dataset.");
            }

            setRecords(parsedRecords);
            setStatus('review');
        } catch (err) {
            console.error("Parse Error:", err);
            setStatus('error');
            setErrorMessage(err.message || "Protocol error during dataset extraction.");
            showError(err.message || "Parsing failed");
        }
    };

    const handleCommit = async () => {
        try {
            if (!Number.isFinite(selectedFYStartYear) || scopedRecords.length === 0) {
                showError("Select a financial year with records before migration.");
                return;
            }

            setStatus('uploading');
            // 1. Initial Import of the specific file records
            const { importedCount, skippedCount } = await importToFirestore(
                user.uid,
                scopedRecords,
                (p) => setProgress(p),
                {
                    employeeName: importMeta.employeeName,
                    leaveBalances: scopedLeaveBalances,
                    source: importMode === 'hr_export' ? 'legacy_hrms_import' : 'csv_import',
                    replaceFinancialYears: importMode === 'hr_export'
                }
            );

            // 2. Refresh local cache from cloud (authoritative source after migration)
            setResults({ importedCount, skippedCount });
            setErrorMessage("Refreshing Local Cache...");
            localStorage.removeItem('leave_history_data');
            await syncLeavesFromFirestore(user.uid);

            setStatus('success');
            showSuccess(`Successfully migrated FY ${formatFinancialYearLabel(selectedFYStartYear)} with ${importedCount} records.`);
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            console.error("Commit Error:", err);
            setStatus('error');
            setErrorMessage(err.message || "Cloud synchronization interrupted.");
            showError(err.message || "Migration failed");
        }
    };

    const handleSync = async () => {
        try {
            setStatus('uploading'); // Use the processing screen
            setErrorMessage("Initializing Handshake...");
            setProgress(30);

            // 1. Push all local to cloud
            const pushRes = await pushLeavesToFirestore(user.uid);
            setProgress(60);

            // 2. Pull all cloud to local
            const addedCount = await syncLeavesFromFirestore(user.uid);
            setProgress(100);

            setStatus('success');
            setResults({ importedCount: pushRes.importedCount, skippedCount: pushRes.skippedCount });
            showSuccess(`Sync Complete: Pushed ${pushRes.importedCount} | Pulled ${addedCount} new nodes.`);
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            console.error("Sync Error:", err);
            setStatus('error');
            setErrorMessage(err.message || "Handshake failed.");
        }
    };

    const handleReset = async () => {
        if (!window.confirm("CRITICAL: This will permanently delete ALL imported leave history and synchronized records from the cloud. This cannot be undone. Proceed?")) {
            return;
        }

        try {
            setStatus('uploading'); // Use uploading screen for deletion progress
            setErrorMessage("Purging cloud registry...");
            await clearLeaveHistory(user.uid);
            await syncLeavesFromFirestore(user.uid);
            showSuccess("Registry cleared successfully");
            window.location.reload();
        } catch (err) {
            console.error("Reset Error:", err);
            setStatus('error');
            setErrorMessage(err.message || "Failed to clear registry.");
        }
    };

    const reset = () => {
        setFile(null);
        setStatus('idle');
        setRecords([]);
        setProgress(0);
        setResults(null);
        setErrorMessage(null);
        setImportMeta({ employeeName: '', leaveBalances: [] });
        setSelectedFYStartYear(null);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    className="glass-card max-w-5xl w-full border-white/10 p-0 overflow-hidden shadow-[0_0_80px_-15px_rgba(99,102,241,0.4)] flex flex-col md:flex-row max-h-[90vh]"
                >
                    {/* Sidebar Area */}
                    <div className="w-full md:w-80 bg-white/[0.02] border-r border-white/5 p-8 flex flex-col overflow-y-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md">
                                <Database className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white tracking-widest uppercase mb-0.5">Migration</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-indigo-400" />
                                    v2.0 Beta
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Origin Protocol</h4>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setImportMode('hr_export')}
                                        className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-4 group ${importMode === 'hr_export'
                                            ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${importMode === 'hr_export' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-white'}`}>
                                            <FileType className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-white uppercase tracking-wider mb-0.5">HR Export</p>
                                            <p className="text-[9px] font-bold text-slate-500">Auto-parsing</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setImportMode('csv')}
                                        className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-4 group ${importMode === 'csv'
                                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${importMode === 'csv' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-white'}`}>
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-white uppercase tracking-wider mb-0.5">CSV Schema</p>
                                            <p className="text-[9px] font-bold text-slate-500">Manual Template</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Transfer Guide</h4>
                                <ul className="space-y-4">
                                    <li className="flex gap-3">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">Supports Spine, Keka and GreytHR Exports directly.</p>
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                                            Smart Matching: Duplicates are analyzed by **Date**, **Type**, and **Magnitude**.
                                        </p>
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">Batch-committing 500 records per secure transaction.</p>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5 space-y-4">
                            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Danger Zone</h4>
                            <button
                                onClick={async () => {
                                    if (await confirm('This will clear your LOCAL leave history and trigger a fresh sync from Cloud. Your Firebase data will NOT be deleted. Proceed?')) {
                                        localStorage.removeItem('leave_history_data');
                                        window.location.reload();
                                    }
                                }}
                                className="w-full p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500/10 hover:border-indigo-500/20 group transition-all flex items-center gap-4"
                            >
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <RefreshCw className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-white uppercase tracking-wider mb-0.5">Reset Local Cache</p>
                                    <p className="text-[9px] font-bold text-indigo-400/60 uppercase">Fix Sync Inconsistencies</p>
                                </div>
                            </button>

                            <button
                                onClick={handleSync}
                                className="w-full p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 hover:bg-white/10 hover:border-indigo-500/30 group transition-all flex items-center gap-4 shadow-lg shadow-indigo-500/5"
                            >
                                <div className="p-2 rounded-lg bg-indigo-500 text-white shadow-xl shadow-indigo-500/40">
                                    <Cloud className="w-4 h-4 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-white uppercase tracking-wider mb-0.5">Cloud Handshake</p>
                                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Push & Pull Active</p>
                                </div>
                            </button>

                            <button
                                onClick={handleReset}
                                className="w-full p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/20 group transition-all flex items-center gap-4"
                            >
                                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-white uppercase tracking-wider mb-0.5">Purge Registry</p>
                                    <p className="text-[9px] font-bold text-rose-500/60 uppercase">Delete All Records</p>
                                </div>
                            </button>

                            <div className="pt-4 flex items-center gap-3 opacity-40">
                                <ShieldCheck className="w-4 h-4 text-slate-500" />
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Encrypted Cloud Channel</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-h-[500px] bg-slate-950/40 relative">
                        {/* Static Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Data Synchronization</span>
                                </div>
                                <h2 className="text-2xl font-black text-white tracking-tighter">Legacy Leave Migration</h2>
                            </div>
                            <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 flex flex-col">
                            {status === 'idle' && (
                                <div className="flex-1 flex flex-col justify-center animate-in slide-in-from-right-8 duration-500">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`group relative border-2 border-dashed rounded-[3rem] p-20 text-center cursor-pointer transition-all overflow-hidden ${file ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/30 bg-white/[0.02]'
                                            }`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="relative">
                                            <div className={`w-24 h-24 mx-auto rounded-[2.5rem] flex items-center justify-center mb-8 transition-all duration-500 ${file
                                                ? 'bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] scale-110 rotate-12'
                                                : 'bg-white/5 text-slate-500 group-hover:text-indigo-400 group-hover:scale-105'
                                                }`}>
                                                <Upload className="w-10 h-10" />
                                            </div>

                                            {file ? (
                                                <div className="space-y-2">
                                                    <h4 className="text-xl font-black text-white">{file.name}</h4>
                                                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                                        <Fingerprint className="w-4 h-4 animate-pulse" />
                                                        Signature Ready for Extraction
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <h4 className="text-xl font-black text-slate-300 tracking-tight group-hover:text-white transition-colors">Transfer Local Dataset</h4>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                                        Drop your {importMode === 'hr_export' ? '.XLS/.XLSX' : '.CSV'} here or click to browse
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={importMode === 'hr_export' ? ".xls,.xlsx" : ".csv"} />
                                    </div>

                                    <div className="mt-10 flex items-center justify-between">
                                        <button onClick={downloadCSVTemplate} className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-all group">
                                            <Download className="w-4 h-4 group-hover:animate-bounce" />
                                            Download Protocol Template
                                        </button>
                                        <button
                                            disabled={!file}
                                            onClick={handleParse}
                                            className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 rounded-3xl text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-indigo-600/30 transition-all flex items-center gap-4 group disabled:cursor-not-allowed"
                                        >
                                            Initialize Analysis
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {status === 'review' && (
                                <div className="flex-1 flex flex-col justify-center animate-in scale-in-95 duration-500">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                                                <Table className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Dataset Analysis</h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                    {scopedImportCounts.newCount} New Nodes • {scopedImportCounts.duplicateCount} Already Synchronized
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={reset} className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Flush Buffer</button>
                                    </div>

                                    <div className="mb-6 p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Migration Scope</p>
                                            <p className="text-xs font-bold text-slate-300 mt-1">Select which Financial Year to migrate</p>
                                        </div>
                                        <select
                                            value={selectedFYStartYear ?? ''}
                                            onChange={(e) => setSelectedFYStartYear(Number(e.target.value))}
                                            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-wider"
                                        >
                                            {financialYearOptions.map((fy) => (
                                                <option key={fy} value={fy} className="bg-slate-900">
                                                    FY {formatFinancialYearLabel(fy)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex-1 max-h-[340px] overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-md relative">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-slate-900 border-b border-white/5 z-10">
                                                <tr>
                                                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Leave</th>
                                                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Magnitude</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {previewRecords.map((r, i) => (
                                                    <tr key={i} className="group/row hover:bg-white/[0.01]">
                                                        <td className="p-5 text-[11px] font-bold text-slate-400">{r.date}</td>
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-3">
                                                                <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black border border-indigo-500/20">{r.leaveType}</span>
                                                                {r.isDuplicate && (
                                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-tighter border border-emerald-500/20">
                                                                        Already Synchronized
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{r.type}</td>
                                                        <td className="p-5 text-[11px] font-black text-white text-right">
                                                            {(r.consumedDays || r.creditDays || 0).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
                                    </div>

                                    <button
                                        onClick={handleCommit}
                                        disabled={!Number.isFinite(selectedFYStartYear) || scopedRecords.length === 0}
                                        className="mt-10 w-full py-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-3xl text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-4 group"
                                    >
                                        Execute Cloud Synchronization
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </button>
                                </div>
                            )}

                            {(status === 'parsing' || status === 'uploading') && (
                                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-500">
                                    <div className="relative w-40 h-40 mb-10">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="80" cy="80" r="75" className="stroke-white/5 fill-none" strokeWidth="10" />
                                            <motion.circle
                                                cx="80" cy="80" r="75"
                                                className="stroke-indigo-500 fill-none"
                                                strokeWidth="10"
                                                strokeDasharray={`${2 * Math.PI * 75}`}
                                                animate={{
                                                    strokeDashoffset: status === 'parsing' ? [2 * Math.PI * 75, 2 * Math.PI * 10] : 2 * Math.PI * 75 * (1 - progress / 100)
                                                }}
                                                transition={status === 'parsing' ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5 }}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                                            {status === 'uploading' && <span className="text-3xl font-black text-white">{progress}%</span>}
                                            {status === 'parsing' && <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />}
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-2">
                                        {status === 'parsing' ? 'System Analysis' : 'Cloud Integration'}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest max-w-[280px]">
                                        {status === 'parsing' ? 'Performing geometric extraction and node verification...' : 'Batch-writing serialized leave objects to secondary cloud storage...'}
                                    </p>
                                </div>
                            )}

                            {status === 'success' && (
                                <div className="flex-1 flex flex-col justify-center py-10 text-center animate-in slide-in-from-bottom-8 duration-700">
                                    <div className="w-28 h-28 bg-emerald-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-[0_0_40px_rgba(16,185,129,0.3)] border border-emerald-500/20">
                                        <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                                    </div>
                                    <h2 className="text-4xl font-black text-white mb-3 tracking-tighter">Sync Complete</h2>
                                    <p className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-12">Registry synchronized with cloud storage</p>

                                    <div className="grid grid-cols-2 gap-6 mb-12 max-w-sm mx-auto w-full">
                                        <div className="p-8 bg-emerald-500/5 rounded-[3rem] border border-emerald-500/10">
                                            <h4 className="text-5xl font-black text-emerald-500 mb-2">{results?.importedCount}</h4>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New Entries</p>
                                        </div>
                                        <div className="p-8 bg-indigo-500/5 rounded-[3rem] border border-indigo-500/10">
                                            <h4 className="text-5xl font-black text-indigo-400 mb-2">{results?.skippedCount}</h4>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Safeguarded</p>
                                        </div>
                                    </div>

                                    <button onClick={onClose} className="w-full py-6 bg-white/5 hover:bg-white/10 rounded-3xl text-white font-black uppercase tracking-[0.2em] text-xs transition-all border border-white/10 shadow-2xl">
                                        Initialize Final Handshake
                                    </button>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="flex-1 flex flex-col justify-center py-10 text-center">
                                    <div className="w-28 h-28 bg-rose-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-[0_0_40px_rgba(244,63,94,0.3)]">
                                        <AlertCircle className="w-14 h-14 text-rose-500" />
                                    </div>
                                    <h2 className="text-3xl font-black text-white mb-3 tracking-tighter">Sync Failure</h2>
                                    <p className="text-xs font-bold text-rose-400 uppercase tracking-[0.2em] mb-4">
                                        {errorMessage || "Protocol error or corrupt dataset detected"}
                                    </p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-12 max-w-xs mx-auto">
                                        Please verify your file format and ensure all required columns are present.
                                    </p>
                                    <button onClick={reset} className="w-full py-6 bg-rose-600 hover:bg-rose-500 rounded-3xl text-white font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-rose-600/30">
                                        Retry Connection
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
