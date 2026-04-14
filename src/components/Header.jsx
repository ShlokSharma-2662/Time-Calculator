import { Sun, Moon, Settings, Calendar, Briefcase, Palmtree, RefreshCw, LogOut, Download } from 'lucide-react';
import { motion } from 'framer-motion';

export const Header = ({ onOpenSettings, onOpenHistory, activeView = 'shift', setActiveView, onLogout, isSyncing, onSync, onRestore, user }) => {
    return (
        <div className="space-y-6 mb-10">
            <header className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-12 h-12 rounded-2xl shadow-lg shadow-indigo-500/20 object-cover" />
                    ) : (
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Briefcase className="w-6 h-6 text-white" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight uppercase">WorkShift <span className="text-indigo-500">v3.0</span></h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Premium Performance Tracker</p>
                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{user?.name}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 p-1.5 glass rounded-2xl border-white/20">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onSync} disabled={isSyncing}
                        className="p-2.5 rounded-xl hover:bg-white/10 text-emerald-500 transition-all font-bold text-[10px] flex items-center gap-2"
                        title="Push to Cloud">
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline uppercase">{isSyncing ? 'Syncing...' : 'Push'}</span>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onRestore} disabled={isSyncing}
                        className="p-2.5 rounded-xl hover:bg-white/10 text-sky-400 transition-all font-bold text-[10px] flex items-center gap-2"
                        title="Restore from Cloud">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline uppercase">Pull</span>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onOpenHistory}
                        className="p-2.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-indigo-500 transition-all font-bold text-[10px] flex items-center gap-2"
                        title="History">
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline uppercase">History</span>
                    </motion.button>

                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onOpenSettings}
                        className="p-2.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-indigo-500 transition-all font-bold text-[10px] flex items-center gap-2"
                        title="Settings">
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline uppercase">Settings</span>
                    </motion.button>

                    <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onLogout}
                        className="p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-all font-bold text-[10px] flex items-center gap-2"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">EXIT</span>
                    </motion.button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="flex gap-2 p-1.5 glass rounded-2xl border-white/10 max-w-sm mx-auto sm:mx-0">
                <button
                    onClick={() => setActiveView('shift')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${activeView === 'shift'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xl'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                >
                    <Briefcase className="w-4 h-4" />
                    Dashboard
                </button>
                {user?.email === 'suttamshlok@gmail.com' && (
                    <button
                        onClick={() => setActiveView('leave')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${activeView === 'leave'
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xl'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                    >
                        <Palmtree className="w-4 h-4" />
                        Archive
                    </button>
                )}
            </nav>
        </div>
    );
};
