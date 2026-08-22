import { useCallback, useEffect, useRef, useState } from 'react';

const ENABLED_KEY = 'leaveNotifyEnabled';
const FIRED_KEY = 'leaveNotifyFired';

function canUseNotifications() {
    return typeof window !== 'undefined' && 'Notification' in window;
}

function readFiredMap() {
    try {
        return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}') || {};
    } catch (_e) {
        return {};
    }
}

function writeFiredMap(map) {
    try {
        localStorage.setItem(FIRED_KEY, JSON.stringify(map));
    } catch (_e) { /* ignore quota */ }
}

function showLeaveNotification(title, body, tag) {
    if (!canUseNotifications() || Notification.permission !== 'granted') return;
    try {
        new Notification(title, {
            body,
            tag,
            icon: '/pwa-192x192.png',
        });
    } catch (_e) {
        /* Safari private mode / denied after grant */
    }
}

export function useLeaveNotification({
    remainingMinutes,
    exitLabel,
    workDate,
    isHistorical,
    hasShift,
}) {
    const [enabled, setEnabledState] = useState(() => {
        try { return localStorage.getItem(ENABLED_KEY) === 'true'; }
        catch (_e) { return false; }
    });
    const [permission, setPermission] = useState(() => (
        canUseNotifications() ? Notification.permission : 'unsupported'
    ));
    const previousRemaining = useRef(null);

    useEffect(() => {
        try { localStorage.setItem(ENABLED_KEY, String(enabled)); }
        catch (_e) { /* ignore */ }
    }, [enabled]);

    const supported = permission !== 'unsupported';

    const setEnabled = useCallback(async (nextEnabled) => {
        if (!nextEnabled) {
            setEnabledState(false);
            return false;
        }
        if (!canUseNotifications()) {
            setPermission('unsupported');
            setEnabledState(false);
            return false;
        }
        let nextPermission = Notification.permission;
        if (nextPermission === 'default') {
            nextPermission = await Notification.requestPermission();
        }
        setPermission(nextPermission);
        const granted = nextPermission === 'granted';
        setEnabledState(granted);
        return granted;
    }, []);

    useEffect(() => {
        previousRemaining.current = null;
    }, [workDate]);

    useEffect(() => {
        if (!enabled || !hasShift || isHistorical || !supported || permission !== 'granted') {
            previousRemaining.current = remainingMinutes;
            return;
        }

        const remaining = Number.isFinite(remainingMinutes) ? remainingMinutes : null;
        if (remaining === null) return;

        const fired = readFiredMap();
        const soonKey = `${workDate}:soon:${exitLabel || remaining}`;
        const nowKey = `${workDate}:now:${exitLabel || remaining}`;

        if (previousRemaining.current === null) {
            previousRemaining.current = remaining;
            if (remaining === 0) {
                fired[nowKey] = true;
                writeFiredMap(fired);
                return;
            }
        }

        if (remaining > 0 && remaining <= 15 && !fired[soonKey]) {
            fired[soonKey] = true;
            writeFiredMap(fired);
            showLeaveNotification(
                'Almost done',
                `About ${remaining}m left. Target exit ${exitLabel || 'soon'}.`,
                'workshift-leave-soon'
            );
        }

        if (remaining === 0 && previousRemaining.current > 0 && !fired[nowKey]) {
            fired[nowKey] = true;
            writeFiredMap(fired);
            showLeaveNotification(
                'You can leave',
                `Shift target reached${exitLabel ? ` (${exitLabel})` : ''}.`,
                'workshift-leave-now'
            );
        }

        previousRemaining.current = remaining;
    }, [enabled, hasShift, isHistorical, remainingMinutes, exitLabel, workDate, supported, permission]);

    return {
        enabled,
        setEnabled,
        supported,
        permission,
    };
}
