import React from 'react';
import { motion } from 'framer-motion';

export const CircularProgress = ({ percentage, size = 60 }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    // Color based on progress
    const getColor = () => {
        if (percentage < 50) return '#10b981'; // green
        if (percentage < 80) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-slate-200 dark:text-slate-700"
                />
                {/* Progress circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={getColor()}
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{
                        strokeDasharray: circumference
                    }}
                />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {Math.round(percentage)}%
                </span>
            </div>
        </div>
    );
};
