import React from 'react';
import { Clock, Sun, Moon, Settings } from 'lucide-react';

export const Header = ({ darkMode, setDarkMode, onOpenSettings }) => {
    return (
        <header className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
                <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
                    <Clock className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">WorkShift Calc</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your day efficiently</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onOpenSettings}
                    className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    title="Toggle Theme"
                >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>
        </header>
    );
};
