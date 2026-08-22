const DEFAULT_LEAVE_EMAILS = ['suttamshlok@gmail.com'];

export function parseLeaveAccessEmails(allowlistEnv) {
    const extra = String(allowlistEnv || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
    return [...new Set([...DEFAULT_LEAVE_EMAILS, ...extra])];
}

export function canAccessLeaveView(email, allowlistEnv = import.meta.env?.VITE_LEAVE_ACCESS_EMAILS) {
    const allowed = new Set(parseLeaveAccessEmails(allowlistEnv));
    return allowed.has(String(email || '').trim().toLowerCase());
}
