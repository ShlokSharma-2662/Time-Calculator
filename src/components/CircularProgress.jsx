import React from 'react';
import { useReducedMotion } from 'framer-motion';

export const CircularProgress = ({ progress, size = 200, strokeWidth = 10, color = "#6366f1" }) => {
    const prefersReducedMotion = useReducedMotion();
    const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(progress, 100)) : 0;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (safeProgress / 100) * circumference;

    return (
        <div
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(safeProgress)}
            aria-label="Shift progress"
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90 drop-shadow-2xl"
            >
                {/* Glow Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    className="text-slate-200 dark:text-slate-800/50"
                />

                {/* Subtle Glow Background */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeOpacity="0.1"
                />

                {/* Main Progress Stroke */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: offset,
                        transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 1.2s cubic-bezier(0.075, 0.82, 0.165, 1)',
                        filter: `drop-shadow(0 0 8px ${color}80)`
                    }}
                />
            </svg>
        </div>
    );
};
