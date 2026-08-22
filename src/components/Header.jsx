import { useEffect, useRef, useState } from 'react';
import { BarChart2, Briefcase, Calendar, ChevronDown, Cloud, LogOut, Palmtree, Settings } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export const Header = ({
    onOpenSettings,
    onLogout,
    isSyncing,
    lastSyncedAt = null,
    synced = false,
    onSync,
    onRestore,
    user,
    activeView = 'today',
    setActiveView,
    remainingLabel,
    canAccessLeaveView = false,
}) => {
    const prefersReducedMotion = useReducedMotion();
    const MotionSpan = motion.span;
    const [syncOpen, setSyncOpen] = useState(false);
    const syncRef = useRef(null);

    useEffect(() => {
        const onPointerDown = (event) => {
            if (syncRef.current && !syncRef.current.contains(event.target)) {
                setSyncOpen(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, []);

    const formatSyncLabel = () => {
        if (isSyncing) return 'Syncing';
        if (synced) return 'Synced';
        if (!lastSyncedAt) return 'Sync';
        const delta = Date.now() - lastSyncedAt;
        if (delta < 60 * 1000) return 'Just now';
        if (delta < 60 * 60 * 1000) return `${Math.floor(delta / 60000)}m ago`;
        return `${Math.floor(delta / 3600000)}h ago`;
    };

    const tabs = [
        { id: 'today', label: 'Today', icon: Briefcase },
        { id: 'history', label: 'History', icon: Calendar },
        { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    ];
    if (canAccessLeaveView) {
        tabs.push({ id: 'leave', label: 'Leave', icon: Palmtree });
    }

    return (
        <div className="space-y-4 mb-6">
            <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                            WorkShift
                        </h1>
                        <p className="text-sm text-slate-400 truncate">{user?.name}</p>
                        {remainingLabel && (
                            <p className="text-sm text-indigo-200/90">{remainingLabel}</p>
                        )}
                    </div>
                </div>

                <div className="flex w-full lg:w-auto flex-wrap items-center gap-1 p-1 glass rounded-xl border-white/15">
                    <div className="relative" ref={syncRef}>
                        <button
                            type="button"
                            onClick={() => setSyncOpen((value) => !value)}
                            disabled={isSyncing}
                            className="p-2 rounded-lg hover:bg-white/10 text-emerald-300 text-sm flex items-center gap-1.5"
                        >
                            <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-spin' : synced ? 'text-emerald-300' : ''}`} />
                            <span className="hidden sm:inline">{formatSyncLabel()}</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                        </button>
                        {syncOpen && (
                            <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/10 bg-slate-950 shadow-xl z-20 overflow-hidden">
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                                    onClick={() => { setSyncOpen(false); onSync?.(); }}
                                >
                                    Push to cloud
                                </button>
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                                    onClick={() => { setSyncOpen(false); onRestore?.(); }}
                                >
                                    Pull from cloud
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onOpenSettings}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-sm flex items-center gap-1.5"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Settings</span>
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <button
                        type="button"
                        onClick={onLogout}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-300 text-sm flex items-center gap-1.5"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign out</span>
                    </button>
                </div>
            </header>

            <nav className="flex gap-1 p-1 glass rounded-xl border-white/10 overflow-x-auto" aria-label="Main views">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const selected = activeView === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveView(tab.id)}
                            aria-current={selected ? 'page' : undefined}
                            className={`relative isolate flex-1 min-w-[7rem] flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm ${selected ? 'text-indigo-200' : 'text-slate-400 hover:text-slate-100'
                                }`}
                        >
                            {!prefersReducedMotion && selected && (
                                <MotionSpan
                                    layoutId="active-view-pill"
                                    className="absolute inset-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 -z-10"
                                    transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                                />
                            )}
                            {prefersReducedMotion && selected && (
                                <span className="absolute inset-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 -z-10" />
                            )}
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};
