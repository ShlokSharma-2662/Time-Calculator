import { Settings, Calendar, Briefcase, Palmtree, RefreshCw, LogOut, Download } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export const Header = ({ onOpenSettings, onOpenHistory, activeView = 'shift', setActiveView, onLogout, isSyncing, onSync, onRestore, user }) => {
    const prefersReducedMotion = useReducedMotion();
    const MotionSpan = motion.span;
    return (
        <div className="space-y-6 mb-10">
            <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 animate-enter-up">
                <div className="flex items-center gap-4 min-w-0">
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt={user?.name || 'Profile'} className="w-12 h-12 rounded-2xl shadow-lg shadow-indigo-500/20 object-cover animate-pop-soft" />
                    ) : (
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pop-soft">
                            <Briefcase className="w-6 h-6 text-white" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">WorkShift <span className="text-indigo-400">Dashboard</span></h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide leading-none">Performance tracker</p>
                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                            <span className="text-xs text-indigo-300 font-semibold tracking-wide truncate max-w-52">{user?.name}</span>
                        </div>
                    </div>
                </div>

                <div className="flex w-full lg:w-auto flex-wrap items-center gap-1 p-1.5 glass rounded-2xl border-white/20">
                    <button
                        type="button"
                        onClick={onSync} disabled={isSyncing}
                        className="p-2.5 rounded-xl hover:bg-white/10 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 text-emerald-400 transition-all duration-200 font-bold text-xs flex items-center gap-2"
                        title="Push to Cloud">
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline uppercase">{isSyncing ? 'Syncing...' : 'Push'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={onRestore} disabled={isSyncing}
                        className="p-2.5 rounded-xl hover:bg-white/10 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 text-sky-300 transition-all duration-200 font-bold text-xs flex items-center gap-2"
                        title="Restore from Cloud">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline uppercase">Pull</span>
                    </button>
                    <button
                        type="button"
                        onClick={onOpenHistory}
                        className="p-2.5 rounded-xl hover:bg-white/10 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 text-slate-300 hover:text-indigo-300 transition-all duration-200 font-bold text-xs flex items-center gap-2"
                        title="History">
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline uppercase">History</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenSettings}
                        className="p-2.5 rounded-xl hover:bg-white/10 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 text-slate-300 hover:text-indigo-300 transition-all duration-200 font-bold text-xs flex items-center gap-2"
                        title="Settings">
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline uppercase">Settings</span>
                    </button>

                    <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="p-2.5 rounded-xl hover:bg-rose-500/10 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 text-rose-400 transition-all duration-200 font-bold text-xs flex items-center gap-2"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">EXIT</span>
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="flex gap-2 p-1.5 glass rounded-2xl border-white/10 max-w-sm mx-auto sm:mx-0 animate-enter-up [animation-delay:120ms]" aria-label="Main views">
                <button
                    type="button"
                    onClick={() => setActiveView('shift')}
                    aria-current={activeView === 'shift' ? 'page' : undefined}
                    className={`relative isolate flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${activeView === 'shift'
                        ? 'bg-slate-900/0 dark:bg-slate-100/0 text-white dark:text-slate-900 shadow-xl'
                        : 'text-slate-400 hover:text-slate-100'
                        }`}
                >
                    {!prefersReducedMotion && activeView === 'shift' && (
                        <MotionSpan
                            layoutId="active-view-pill"
                            className="absolute inset-1 rounded-xl bg-slate-900 dark:bg-slate-100 -z-10"
                            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                        />
                    )}
                    <Briefcase className="w-4 h-4" />
                    Dashboard
                </button>
                {user?.email === 'suttamshlok@gmail.com' && (
                    <button
                        type="button"
                        onClick={() => setActiveView('leave')}
                        aria-current={activeView === 'leave' ? 'page' : undefined}
                        className={`relative isolate flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${activeView === 'leave'
                            ? 'bg-slate-900/0 dark:bg-slate-100/0 text-white dark:text-slate-900 shadow-xl'
                            : 'text-slate-400 hover:text-slate-100'
                            }`}
                    >
                        {!prefersReducedMotion && activeView === 'leave' && (
                            <MotionSpan
                                layoutId="active-view-pill"
                                className="absolute inset-1 rounded-xl bg-slate-900 dark:bg-slate-100 -z-10"
                                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                            />
                        )}
                        <Palmtree className="w-4 h-4" />
                        Archive
                    </button>
                )}
            </nav>
        </div>
    );
};
