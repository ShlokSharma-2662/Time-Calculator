import React from 'react';
import { Clock, Sun, Moon, Settings, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export const Header = ({ darkMode, setDarkMode, onOpenSettings, onOpenHistory }) => {
    return (
        <header className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
                <div className="rounded-lg shadow-lg overflow-hidden">
                    <img src="/logo.png" alt="Daily Calculations" className="w-12 h-12" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Daily Calculations</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Friendly. Daily Routine. Cyclic.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onOpenHistory}
                    className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    title="History"
                >
                    <Calendar className="w-5 h-5" />
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onOpenSettings}
                    className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </motion.button>
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
    );
};
