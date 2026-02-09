import React from 'react';
import { Clock, Sun, Moon, Settings, Calendar, Briefcase, Palmtree } from 'lucide-react';
import { motion } from 'framer-motion';
import { CircularProgress } from './CircularProgress';

export const Header = ({ darkMode, setDarkMode, onOpenSettings, onOpenHistory, workProgress = 0, activeView = 'shift', setActiveView }) => {
    return (
        <div className="space-y-4 mb-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="rounded-lg shadow-lg overflow-hidden">
                        <img src="/logo.png" alt="Daily Calculations" className="w-12 h-12" />
                    </div>
                    {activeView === 'shift' && workProgress > 0 && (
                        <CircularProgress percentage={workProgress} size={50} />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Daily Calculations</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Friendly. Daily Routine. Cyclic.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {activeView === 'shift' && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenHistory}
                            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                            title="History"
                        >
                            <Calendar className="w-5 h-5" />
                        </motion.button>
                    )}
                    {activeView === 'shift' && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenSettings}
                            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </motion.button>
                    )}
                    <motion.button
                        whileTap={{ scale: 0.9, rotate: 180 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                        title="Toggle Theme"
                    >
                        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </motion.button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveView('shift')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${activeView === 'shift'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                >
                    <Briefcase className="w-5 h-5" />
                    <span>Shift Calculator</span>
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveView('leave')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${activeView === 'leave'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                >
                    <Palmtree className="w-5 h-5" />
                    <span>Leave Management</span>
                </motion.button>
            </div>
        </div>
    );
};
