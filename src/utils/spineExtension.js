/**
 * Page-side helpers to talk to the WorkShift Spine Sync extension bridge.
 * Retries when Chrome bfcache closes the extension message channel.
 */

function createRequestId() {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isTransientChannelError(message) {
  const text = String(message || '').toLowerCase();
  return (
    text.includes('back/forward cache') ||
    text.includes('message channel is closed') ||
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

function requestSpineSyncOnce(timeoutMs = 90000) {
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
    window.postMessage({ type: 'WORKSHIFT_SPINE_SYNC', requestId }, '*');
  });
}

/**
 * Ask the extension to scrape Spine and write HRMS localStorage keys.
 * Retries once or twice if Chrome closed the port due to bfcache.
 * @returns {Promise<{ ok: boolean, message?: string, needsLogin?: boolean, wrote?: boolean }>}
 */
export async function requestSpineSync() {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'Not in a browser context.' };
  }

  // Ensure the bridge is awake after bfcache / tab sleep.
  await detectSpineExtension(500);

  let last = await requestSpineSyncOnce();
  for (let attempt = 0; attempt < 2 && !last.ok && isTransientChannelError(last.message); attempt += 1) {
    await wait(400 * (attempt + 1));
    // Clear stale marker so detect re-pings the content script.
    if (window.__WORKSHIFT_SPINE_EXTENSION__) {
      window.__WORKSHIFT_SPINE_EXTENSION__.present = false;
    }
    await detectSpineExtension(800);
    last = await requestSpineSyncOnce();
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
