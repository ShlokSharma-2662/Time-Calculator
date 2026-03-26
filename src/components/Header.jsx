import React from 'react';
import { Sun, Moon, Settings, Calendar, Briefcase, Palmtree } from 'lucide-react';
import { motion } from 'framer-motion';

export const Header = ({ onOpenSettings, onOpenHistory, activeView = 'shift', setActiveView }) => {
    return (
        <div className="space-y-6 mb-10">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">WorkShift <span className="text-indigo-500">v2.0</span></h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Premium Performance Tracker</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 glass rounded-2xl border-white/20">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onOpenHistory}
                        className="p-2.5 rounded-xl hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-all font-bold text-[10px] flex items-center gap-2"
                        title="History"
                    >
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline">HISTORY</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onOpenSettings}
                        className="p-2.5 rounded-xl hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-all font-bold text-[10px] flex items-center gap-2"
                        title="Settings"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">SETTINGS</span>
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
            </nav>
        </div>
    );
};
