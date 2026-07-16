import React from 'react';
import { Heart } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="text-center py-12">
            <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full glass border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for Productivity
                </div>
                <p className="text-slate-400 dark:text-slate-600 text-[10px] font-bold uppercase tracking-tighter">
                    WorkShift v2.0 • © {new Date().getFullYear()} <span className="text-indigo-600 dark:text-indigo-400">Shlok Sharma</span>
                </p>
            </div>
        </footer>
    );
};
