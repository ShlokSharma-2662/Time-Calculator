/**
 * Pure helpers for Spine "Daily In Out Punch" extraction and HRMS localStorage payloads.
 * Shared by unit tests and documented for the extension scraper (same algorithm).
 */

const PUNCH_ROW_RE = /^(.+?)\t(.+?)\t(In|Out)\s*$/i;

/**
 * Extract tab-separated punch lines from an HTML string that contains a
 * "Daily In Out Punch" table (or preformatted text with the same rows).
 * @param {string} html
 * @returns {string} lines of `date\\ttime\\tIn|Out`
 */
export function extractPunchTextFromHtml(html) {
  const source = String(html || '');
  if (!source.trim()) return '';

  // Prefer DOM when available (browser / jsdom)
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(source, 'text/html');
      const fromDom = extractPunchTextFromDocument(doc);
      if (fromDom) return fromDom;
    } catch {
      // fall through
    }
  }

  const fromMarkup = extractPunchTextFromHtmlMarkup(source);
  if (fromMarkup) return fromMarkup;

  return extractPunchTextFromPlainText(source);
}

/**
 * Regex fallback when DOMParser is unavailable (Node / Vitest).
 * @param {string} html
 * @returns {string}
 */
export function extractPunchTextFromHtmlMarkup(html) {
  const raw = String(html || '');
  if (!raw.includes('Daily In Out Punch')) return '';

  const lines = [];
  const rowRe =
    /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(raw)) !== null) {
    const cells = [];
    const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
      cells.push(
        cellMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/\*\*/g, '')
          .replace(/&nbsp;/gi, ' ')
          .trim(),
      );
    }
    if (cells.length >= 3) {
      const ty = cells[2];
      if (ty === 'In' || ty === 'Out') {
        lines.push(`${cells[0]}\t${cells[1]}\t${ty}`);
      }
    }
  }
  return lines.join('\n');
}

/**
 * @param {Document | { querySelectorAll: Function, body?: { innerText?: string } }} doc
 * @returns {string}
 */
export function extractPunchTextFromDocument(doc) {
  if (!doc) return '';

  const tables = doc.querySelectorAll?.('table') || [];
  for (const table of tables) {
    const tableText = table.innerText || table.textContent || '';
    if (!tableText.includes('Daily In Out Punch')) continue;

    const lines = [];
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const cols = row.querySelectorAll('td');
      if (cols.length < 3) continue;
      const d = (cols[0].innerText || cols[0].textContent || '').trim();
      const t = (cols[1].innerText || cols[1].textContent || '').trim();
      const ty = (cols[2].innerText || cols[2].textContent || '').trim();
      if (ty === 'In' || ty === 'Out') {
        lines.push(`${d}\t${t}\t${ty}`);
      }
    }
    if (lines.length) return lines.join('\n');
  }

  const bodyText = doc.body?.innerText || doc.body?.textContent || '';
  return extractPunchTextFromPlainText(bodyText);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function extractPunchTextFromPlainText(text) {
  const raw = String(text || '');
  const start = raw.indexOf('Daily In Out Punch');
  const slice = start >= 0 ? raw.slice(start) : raw;

  const lines = [];
  for (const line of slice.split(/\r?\n/)) {
    const cleaned = line.replace(/\*\*/g, '').trim();
    if (!cleaned || cleaned.startsWith('Date') || cleaned.includes('Entry Time')) continue;

    if (cleaned.includes('\t')) {
      const parts = cleaned.split('\t').map((p) => p.trim());
      if (parts.length >= 3) {
        const ty = parts[2];
        if (ty === 'In' || ty === 'Out') {
          lines.push(`${parts[0]}\t${parts[1]}\t${ty}`);
        }
      }
      continue;
    }

    // Fallback: "30-Jul-26 11:10 AM In"
    const m = cleaned.match(
      /^(\d{1,2}-[A-Za-z]{3}-\d{2})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s+(In|Out)$/i,
    );
    if (m) {
      lines.push(`${m[1]}\t${m[2]}\t${m[3][0].toUpperCase()}${m[3].slice(1).toLowerCase()}`);
    }
  }

  return lines.join('\n');
}

/**
 * Repair glitched HRMS punch order (common same-minute In/Out swaps).
 * Keeps source order across different times; only reorders consecutive
 * same-timestamp clusters for In/Out alternation.
 */
export function normalizePunchSequence(entries) {
  if (!Array.isArray(entries) || entries.length <= 1) return entries || [];

  const result = [];
  let expectIn = true;
  let cursor = 0;

  while (cursor < entries.length) {
    const current = entries[cursor];
    const currentDate = String(current.date || '');
    const currentMinutes = Number.isFinite(current.minutes) ? current.minutes : null;

    let end = cursor + 1;
    while (end < entries.length) {
      const next = entries[end];
      const nextDate = String(next.date || '');
      const nextMinutes = Number.isFinite(next.minutes) ? next.minutes : null;
      if (nextDate !== currentDate || nextMinutes !== currentMinutes) break;
      end += 1;
    }

    const cluster = entries.slice(cursor, end).map((entry, offset) => ({
      entry,
      index: cursor + offset,
      type: String(entry.type || '').trim().toUpperCase() === 'OUT' ? 'OUT' : 'IN',
    }));

    if (cluster.length === 1) {
      result.push(cluster[0].entry);
      expectIn = cluster[0].type === 'OUT';
    } else {
      const remaining = cluster.slice();
      let wantIn = expectIn;
      while (remaining.length) {
        const want = wantIn ? 'IN' : 'OUT';
        const pickAt = remaining.findIndex((item) => item.type === want);
        const chosen = pickAt >= 0 ? remaining.splice(pickAt, 1)[0] : remaining.shift();
        result.push(chosen.entry);
        wantIn = chosen.type === 'OUT';
      }
      expectIn = wantIn;
    }

    cursor = end;
  }

  return result;
}

/**
 * Parse punch lines into first/last times, break minutes, punch count.
 * @param {string} punchText
 */
export function summarizePunchText(punchText) {
  const entries = [];
  for (const line of String(punchText || '').split(/\r?\n/)) {
    const match = line.trim().match(PUNCH_ROW_RE);
    if (!match) continue;
    const typeRaw = match[3][0].toUpperCase() + match[3].slice(1).toLowerCase();
    entries.push({
      date: match[1].trim(),
      time: match[2].trim(),
      type: typeRaw === 'Out' ? 'Out' : 'In',
      minutes: parseClockToMinutes(match[2].trim()),
    });
  }

  if (!entries.length) {
    return {
      selectedDate: '',
      firstIn: '',
      lastOut: '',
      breakMinutes: 0,
      punchCount: 0,
      startTime24: '',
      logInput: '',
    };
  }

  const normalized = normalizePunchSequence(entries);

  const selectedDate = normalized[0].date;
  const firstInEntry = normalized.find((e) => e.type === 'In');
  const lastOutEntry = [...normalized].reverse().find((e) => e.type === 'Out') || normalized[normalized.length - 1];

  let breakMinutes = 0;
  let lastOutAt = null;
  for (const entry of normalized) {
    if (entry.type === 'Out') {
      lastOutAt = entry.minutes;
    } else if (entry.type === 'In' && lastOutAt != null && entry.minutes != null) {
      const gap = entry.minutes - lastOutAt;
      if (gap > 0) breakMinutes += gap;
      lastOutAt = null;
    }
  }

  const logInput = `Daily In Out Punch\n${normalized
    .map((e) => `${e.date}\t${e.time}\t${e.type}`)
    .join('\n')}`;

  return {
    selectedDate,
    firstIn: firstInEntry?.time || '',
    lastOut: lastOutEntry?.time || '',
    breakMinutes,
    punchCount: normalized.length,
    startTime24: firstInEntry ? minutesTo24h(firstInEntry.minutes) : '',
    logInput,
  };
}

/**
 * Build the localStorage key/value map expected by ShiftStateContext.
 * @param {string} punchText
 * @param {{ now?: Date }} [options]
 */
export function buildHrmsSyncPayload(punchText, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const summary = summarizePunchText(punchText);
  if (!summary.punchCount) {
    return null;
  }

  const todayKey = formatSpineDate(now);
  const isToday = summary.selectedDate === todayKey;

  return {
    logInput: summary.logInput,
    startTime: summary.startTime24 || undefined,
    hrmsSelectedDate: summary.selectedDate,
    hrmsSyncAt: String(now.getTime()),
    hrmsIsToday: isToday ? 'true' : 'false',
    hrmsFirstIn: summary.firstIn,
    hrmsLastOut: summary.lastOut,
    hrmsBreakMin: String(summary.breakMinutes),
    hrmsPunchCount: String(summary.punchCount),
    hrmsStatus: isToday ? 'today' : 'past',
    hrmsSource: 'spine-hrms',
  };
}

/** Spine attendance report date link format: dd-MMM-yy */
export function formatSpineDate(date = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = date instanceof Date ? date : new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mon}-${yy}`;
}

function parseClockToMinutes(rawTime) {
  const match = String(rawTime || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = match[3]?.toUpperCase();
  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function minutesTo24h(totalMinutes) {
  if (totalMinutes == null || !Number.isFinite(totalMinutes)) return '';
  const minutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
