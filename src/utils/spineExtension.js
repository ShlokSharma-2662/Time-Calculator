/**
 * Page-side helpers to talk to the WorkShift Spine Sync extension bridge.
 */

function createRequestId() {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Detect whether the content-script bridge is injected on this origin.
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
export function detectSpineExtension(timeoutMs = 600) {
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

/**
 * Ask the extension to scrape Spine and write HRMS localStorage keys.
 * @returns {Promise<{ ok: boolean, message?: string, needsLogin?: boolean, wrote?: boolean }>}
 */
export function requestSpineSync() {
  if (typeof window === 'undefined') {
    return Promise.resolve({ ok: false, message: 'Not in a browser context.' });
  }

  return new Promise((resolve) => {
    const requestId = createRequestId();
    const onMessage = (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.type !== 'WORKSHIFT_SPINE_SYNC_RESULT' || data.requestId !== requestId) {
        return;
      }
      window.removeEventListener('message', onMessage);
      const result = data.result || { ok: false, message: 'Empty sync result.' };
      resolve({
        ok: Boolean(data.ok && result.ok),
        message: result.message,
        needsLogin: Boolean(result.needsLogin),
        wrote: Boolean(result.wrote),
        payload: result.payload,
      });
    };

    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'WORKSHIFT_SPINE_SYNC', requestId }, '*');

    window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve({
        ok: false,
        message:
          'No response from the Spine Sync extension. Load unpacked extension-src in Chrome/Edge and keep this tab open.',
      });
    }, 90000);
  });
}
