import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Info } from 'lucide-react';

const TONE = {
    error: { wrap: 'border-rose-400/35 bg-rose-500/10 text-rose-100', Icon: AlertTriangle },
    warning: { wrap: 'border-amber-400/35 bg-amber-500/10 text-amber-100', Icon: AlertTriangle },
    info: { wrap: 'border-sky-400/35 bg-sky-500/10 text-sky-100', Icon: Info },
};

export function PunchHealth({ health, compact = false }) {
    const [open, setOpen] = useState(false);

    if (!health) return null;

    if (!health.issues?.length && health.ok) {
        return (
            <div className="flex items-center gap-2 text-sm text-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{health.summary}</span>
            </div>
        );
    }

    const lead = health.issues[0];
    const tone = TONE[lead?.severity] || TONE.info;
    const Icon = tone.Icon;
    const extra = Math.max(0, (health.issues?.length || 0) - 1);
    const expandable = (health.issues?.length || 0) > 1;

    return (
        <div className={`rounded-xl border px-3 py-2.5 ${tone.wrap}`}>
            {expandable ? (
                <button
                    type="button"
                    className="w-full flex items-start gap-2 text-left"
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm">{compact ? health.summary : lead.message}</p>
                        {!compact && extra > 0 && !open && (
                            <p className="text-xs opacity-80 mt-0.5">{extra} more</p>
                        )}
                    </div>
                    <ChevronDown className={`w-4 h-4 mt-0.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            ) : (
                <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm">{compact ? health.summary : lead.message}</p>
                        {lead?.hint && (
                            <p className="text-xs opacity-80 mt-0.5">{lead.hint}</p>
                        )}
                    </div>
                </div>
            )}
            {expandable && open && (
                <ul className="mt-2 space-y-1.5 pl-6">
                    {health.issues.map((issue) => (
                        <li key={issue.id} className="text-sm">
                            <span>{issue.message}</span>
                            {issue.hint && (
                                <span className="block text-xs opacity-80 mt-0.5">{issue.hint}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
