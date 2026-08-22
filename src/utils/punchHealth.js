const SEVERITY_RANK = { error: 0, warning: 1, info: 2 };

function eventTime(event) {
    return event?.displayTime || event?.time24 || event?.rawTime || 'unknown';
}

function eventMinutes(event) {
    if (Number.isFinite(event?.absoluteMinutes)) return event.absoluteMinutes;
    if (Number.isFinite(event?.minutes)) return event.minutes;
    return null;
}

function issuesFromEvents(events, isHistorical) {
    if (!Array.isArray(events) || events.length === 0) return [];

    const issues = [];
    const openIn = [];

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const next = events[i + 1];
        const type = String(event.type || '').toUpperCase();
        const nextType = next ? String(next.type || '').toUpperCase() : null;

        if (next && type === nextType && eventMinutes(event) === eventMinutes(next)) {
            issues.push({
                id: `duplicate-${i}`,
                type: 'duplicate-punch',
                severity: 'warning',
                message: `Duplicate ${type} at ${eventTime(event)}.`,
                hint: 'Remove the extra punch so sessions pair cleanly.',
            });
        }

        if (type === 'IN') {
            openIn.push({ event, index: i });
            continue;
        }

        if (type === 'OUT') {
            const pair = openIn.shift();
            if (!pair) {
                issues.push({
                    id: `unpaired-out-${i}`,
                    type: 'odd-punch-count',
                    severity: 'error',
                    message: `OUT at ${eventTime(event)} has no matching IN before it.`,
                    hint: 'Add the missing IN, or drop this OUT if it is a portal glitch.',
                });
            }
        }
    }

    openIn.forEach(({ event, index }, leftoverIndex) => {
        const isLastOpen = leftoverIndex === openIn.length - 1 && index === events.length - 1;
        if (!isHistorical && isLastOpen) {
            issues.push({
                id: `open-session-${index}`,
                type: 'open-session',
                severity: 'info',
                message: `Still clocked in since ${eventTime(event)}. Live remaining time uses the clock.`,
                hint: 'Paste the OUT punch when you leave, or wait for the live total.',
            });
            return;
        }

        issues.push({
            id: `unpaired-in-${index}`,
            type: 'odd-punch-count',
            severity: 'error',
            message: `IN at ${eventTime(event)} has no matching OUT.`,
            hint: 'Add the missing OUT so this session is counted.',
        });
    });

    for (let i = 0; i < events.length - 1; i++) {
        const current = events[i];
        const next = events[i + 1];
        if (String(current.type).toUpperCase() !== 'OUT' || String(next.type).toUpperCase() !== 'IN') continue;
        const gap = (eventMinutes(next) ?? 0) - (eventMinutes(current) ?? 0);
        if (gap > 120) {
            issues.push({
                id: `long-gap-${i}`,
                type: 'long-gap',
                severity: 'warning',
                message: `Break is ${gap}m (${eventTime(current)} → ${eventTime(next)}), above 2h.`,
                hint: 'Confirm this was a real break, not a missed IN punch.',
            });
        }
    }

    return issues;
}

function remapParserAnomalies(anomalies, events, isHistorical) {
    if (!Array.isArray(anomalies) || anomalies.length === 0) return [];

    const lastEvent = Array.isArray(events) && events.length > 0 ? events[events.length - 1] : null;
    const lastIsOpenIn = lastEvent && String(lastEvent.type).toUpperCase() === 'IN' && !isHistorical;

    const machineChanges = [];
    const issues = [];

    anomalies.forEach((anomaly, index) => {
        if (anomaly.type === 'machine-change') {
            machineChanges.push(anomaly);
            return;
        }

        const isTrailingUnmatchedIn = lastIsOpenIn
            && anomaly.type === 'odd-punch-count'
            && /In at .+ has no matching Out/i.test(anomaly.message || '');

        if (isTrailingUnmatchedIn) {
            issues.push({
                id: `open-session-parser-${index}`,
                type: 'open-session',
                severity: 'info',
                message: `Still clocked in since ${eventTime(lastEvent)}. Live remaining time uses the clock.`,
                hint: 'Paste the OUT punch when you leave, or wait for the live total.',
            });
            return;
        }

        const severity = anomaly.type === 'long-gap' ? 'warning' : 'error';
        const hint = anomaly.type === 'long-gap'
            ? 'Confirm this was a real break, not a missed IN punch.'
            : 'Fix the unpaired punch so work time is not under-counted.';

        issues.push({
            id: `parser-${anomaly.type}-${index}`,
            type: anomaly.type,
            severity,
            message: anomaly.message,
            hint,
        });
    });

    if (machineChanges.length === 1) {
        issues.push({
            id: 'machine-change-0',
            type: 'machine-change',
            severity: 'info',
            message: machineChanges[0].message,
            hint: 'Machine hops are normal when you move floors; they do not change hours.',
        });
    } else if (machineChanges.length > 1) {
        issues.push({
            id: 'machine-change-group',
            type: 'machine-change',
            severity: 'info',
            message: `Machine changed ${machineChanges.length} times during the day.`,
            hint: 'Grouped here so floor hops do not bury real punch errors.',
        });
    }

    return issues;
}

function dedupeIssues(issues) {
    const seen = new Set();
    return issues.filter((issue) => {
        const key = `${issue.type}:${issue.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Normalize parser anomalies (and simple IN/OUT logs) into UI-ready punch health.
 */
export function buildPunchHealth({ events = [], anomalies = [], isHistorical = false } = {}) {
    const fromParser = remapParserAnomalies(anomalies, events, isHistorical);
    const fromEvents = fromParser.length > 0
        ? issuesFromEvents(events, isHistorical).filter((issue) => issue.type === 'duplicate-punch')
        : issuesFromEvents(events, isHistorical);

    const issues = dedupeIssues([...fromParser, ...fromEvents])
        .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));

    const errorCount = issues.filter((issue) => issue.severity === 'error').length;
    const warningCount = issues.filter((issue) => issue.severity === 'warning').length;

    let summary = 'Punches look consistent.';
    if (errorCount > 0) {
        summary = `${errorCount} punch problem${errorCount === 1 ? '' : 's'} to fix.`;
    } else if (warningCount > 0) {
        summary = `${warningCount} warning${warningCount === 1 ? '' : 's'} to review.`;
    } else if (issues.some((issue) => issue.type === 'open-session')) {
        summary = 'Shift still open — remaining time is live.';
    } else if (issues.length > 0) {
        summary = 'No pairing errors.';
    }

    return {
        issues,
        errorCount,
        warningCount,
        summary,
        ok: errorCount === 0,
    };
}
