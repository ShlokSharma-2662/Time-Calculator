import { useState, useEffect, useCallback } from 'react';

/**
 * A shared hook that safely reads/writes to localStorage with:
 * - try/catch around JSON.parse (prevents corrupted storage crash)
 * - Automatic persistence on state changes
 * - Centralized error handling
 *
 * @param {string} key - localStorage key
 * @param {*} defaultValue - fallback if key is missing or corrupted
 * @returns {[value, setValue]} - like useState
 */
export function useLocalStorage(key, defaultValue) {
    const [value, setValue] = useState(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored === null) return defaultValue;

            // For primitive defaults (string, number, boolean), parse intelligently
            if (typeof defaultValue === 'boolean') return stored === 'true';
            if (typeof defaultValue === 'number') {
                const num = Number(stored);
                return isNaN(num) ? defaultValue : num;
            }
            if (typeof defaultValue === 'string') return stored;

            // For objects/arrays, parse JSON
            return JSON.parse(stored);
        } catch (e) {
            console.warn(`[useLocalStorage] Failed to read key "${key}":`, e);
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            if (typeof value === 'object') {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, String(value));
            }
        } catch (e) {
            console.warn(`[useLocalStorage] Failed to write key "${key}":`, e);
        }
    }, [key, value]);

    return [value, setValue];
}

/**
 * Safely read a localStorage key with JSON.parse, returning a fallback on error.
 * For use in non-hook contexts (utility functions, etc.)
 */
export function safeReadStorage(key, fallback = null) {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) return fallback;
        return JSON.parse(stored);
    } catch (e) {
        console.warn(`[safeReadStorage] Failed to read key "${key}":`, e);
        return fallback;
    }
}
