/**
 * Page-side helpers to talk to the WorkShift Spine Sync extension bridge.
 * Retries when Chrome bfcache closes the extension message channel.
 */

import { toSpineDateLabel, shiftLocalISODate, getLocalISODate } from './dateUtils.js';

function createRequestId() {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isTransientChannelError(message) {
  const text = String(message || '').toLowerCase();
  return (
    text.includes('back/forward cache') ||
    text.includes('message channel is closed') ||
    text.includes('asynchronous response') ||
    text.includes('extension context invalidated') ||
    text.includes('receiving end does not exist') ||
    text.includes('could not establish connection')
  );
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Detect whether the content-script bridge is injected on this origin.
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
export function detectSpineExtension(timeoutMs = 800) {
  if (typeof window === 'undefined') return Promise.resolve(false);

  if (window.__WORKSHIFT_SPINE_EXTENSION__?.present) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const requestId = createRequestId();
    let settled = false;

    const onMessage = (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.type !== 'WORKSHIFT_SPINE_PONG' || data.requestId !== requestId) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      resolve(Boolean(data.present));
    };

    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'WORKSHIFT_SPINE_PING', requestId }, '*');

    window.setTimeout(() => {
      if (settled) return;
      window.removeEventListener('message', onMessage);
      resolve(Boolean(window.__WORKSHIFT_SPINE_EXTENSION__?.present));
    }, timeoutMs);
  });
}

function postSpineRequest(type, extra, timeoutMs) {
  return new Promise((resolve) => {
    const requestId = createRequestId();
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(value);
    };

    const onMessage = (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.type !== 'WORKSHIFT_SPINE_SYNC_RESULT' || data.requestId !== requestId) {
        return;
      }
      const result = data.result || { ok: false, message: 'Empty sync result.' };
      finish({
        ok: Boolean(data.ok && result.ok),
        message: result.message,
        needsLogin: Boolean(result.needsLogin),
        needsRefresh: Boolean(result.needsRefresh),
        wrote: Boolean(result.wrote),
        payload: result.payload,
        payloads: result.payloads,
      });
    };

    const timer = window.setTimeout(() => {
      finish({
        ok: false,
        message:
          'No response from the Spine Sync extension. Reload the extension and keep this tab in the foreground while syncing.',
      });
    }, timeoutMs);

    window.addEventListener('message', onMessage);
    window.postMessage({ type, requestId, ...extra }, '*');
  });
}

function requestSpineSyncOnce(options = {}, timeoutMs = 90000) {
  const dateLabel = options.dateLabel || null;
  return postSpineRequest('WORKSHIFT_SPINE_SYNC', { dateLabel }, timeoutMs);
}

async function retrySpineRequest(runOnce) {
  await detectSpineExtension(500);
  let last = await runOnce();
  for (let attempt = 0; attempt < 2 && !last.ok && isTransientChannelError(last.message); attempt += 1) {
    await wait(400 * (attempt + 1));
    if (window.__WORKSHIFT_SPINE_EXTENSION__) {
      window.__WORKSHIFT_SPINE_EXTENSION__.present = false;
    }
    await detectSpineExtension(800);
    last = await runOnce();
  }

  if (!last.ok && isTransientChannelError(last.message)) {
    return {
      ok: false,
      message:
        'Sync channel closed (browser cached this tab). Stay on this page and click Sync again — do not use Back/Forward during sync.',
      needsLogin: false,
    };
  }

  if (!last.ok && /extension was reloaded|needsrefresh|context invalidated/i.test(String(last.message || ''))) {
    return {
      ok: false,
      message: 'Extension was reloaded. Refresh this page, then click Sync again.',
      needsRefresh: true,
    };
  }

  return last;
}

/**
 * Ask the extension to scrape Spine and write HRMS localStorage keys.
 * @param {{ date?: string|Date, dateLabel?: string }} [options]
 *        `date` can be YYYY-MM-DD or Date; `dateLabel` is Spine dd-MMM-yy.
 * @returns {Promise<{ ok: boolean, message?: string, needsLogin?: boolean, wrote?: boolean }>}
 */
export async function requestSpineSync(options = {}) {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'Not in a browser context.' };
  }

  let dateLabel = options.dateLabel || null;
  if (!dateLabel && options.date) {
    dateLabel = toSpineDateLabel(options.date);
  }

  return retrySpineRequest(() => requestSpineSyncOnce({ dateLabel }));
}

/**
 * Fetch several Spine days (oldest first) into History, then apply `endDate` to Today.
 * @param {{ days?: number, endDate?: string }} [options]
 */
export async function requestSpineSyncRange(options = {}) {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'Not in a browser context.' };
  }

  const days = Math.min(31, Math.max(2, Number(options.days) || 7));
  const endIso = options.endDate || getLocalISODate();
  const labels = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const iso = shiftLocalISODate(endIso, -i);
    const label = toSpineDateLabel(iso);
    if (label) labels.push(label);
  }

  const applyDateLabel = labels[labels.length - 1] || null;
  return retrySpineRequest(() =>
    postSpineRequest(
      'WORKSHIFT_SPINE_SYNC_RANGE',
      { dateLabels: labels, applyDateLabel },
      90000 * Math.min(days, 8),
    ),
  );
}

// After bfcache restore, force a fresh presence check for UI.
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    if (window.__WORKSHIFT_SPINE_EXTENSION__) {
      window.__WORKSHIFT_SPINE_EXTENSION__.present = false;
    }
    detectSpineExtension(800).catch(() => {});
  });
}
