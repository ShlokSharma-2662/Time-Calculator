/**
 * PWA bridge — writes HRMS sync keys into the WorkShift Calc origin localStorage
 * and notifies the page (same-tab storage events do not fire).
 */
(() => {
  const HRMS_KEYS = [
    'hrmsSelectedDate',
    'hrmsSyncAt',
    'hrmsIsToday',
    'hrmsFirstIn',
    'hrmsLastOut',
    'hrmsBreakMin',
    'hrmsPunchCount',
    'hrmsStatus',
    'hrmsSource',
  ];

  function markExtensionPresent() {
    try {
      window.__WORKSHIFT_SPINE_EXTENSION__ = {
        present: true,
        version: '1.0.0',
      };
      window.dispatchEvent(
        new CustomEvent('workshift-spine-extension', {
          detail: { present: true },
        }),
      );
    } catch {
      // ignore
    }
  }

  function writeHrmsPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, message: 'Missing HRMS payload.' };
    }

    try {
      if (payload.logInput != null) {
        localStorage.setItem('logInput', String(payload.logInput));
      }
      if (payload.startTime) {
        localStorage.setItem('startTime', String(payload.startTime));
      }

      for (const key of HRMS_KEYS) {
        if (payload[key] != null) {
          localStorage.setItem(key, String(payload[key]));
        }
      }

      window.dispatchEvent(
        new CustomEvent('workshift-hrms-sync', {
          detail: {
            at: Date.now(),
            selectedDate: payload.hrmsSelectedDate || '',
            punchCount: payload.hrmsPunchCount || '0',
          },
        }),
      );

      return { ok: true };
    } catch (err) {
      return { ok: false, message: err?.message || String(err) };
    }
  }

  function clearHrmsPayload() {
    try {
      HRMS_KEYS.forEach((key) => localStorage.removeItem(key));
      window.dispatchEvent(new CustomEvent('workshift-hrms-sync', { detail: { cleared: true } }));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err?.message || String(err) };
    }
  }

  markExtensionPresent();

  // Page → extension requests (Sync button)
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'WORKSHIFT_SPINE_PING') {
      window.postMessage(
        {
          type: 'WORKSHIFT_SPINE_PONG',
          requestId: data.requestId || null,
          present: true,
        },
        '*',
      );
      return;
    }

    if (data.type === 'WORKSHIFT_SPINE_SYNC') {
      chrome.runtime.sendMessage(
        {
          type: 'SYNC_TODAY',
          source: 'pwa',
          requestId: data.requestId || null,
        },
        (response) => {
          const err = chrome.runtime.lastError;
          window.postMessage(
            {
              type: 'WORKSHIFT_SPINE_SYNC_RESULT',
              requestId: data.requestId || null,
              ok: !err && Boolean(response?.ok),
              result: err
                ? { ok: false, message: err.message }
                : response || { ok: false, message: 'No response from extension.' },
            },
            '*',
          );
        },
      );
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return undefined;

    if (message.type === 'PWA_PING') {
      markExtensionPresent();
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'WRITE_HRMS_SYNC') {
      sendResponse(writeHrmsPayload(message.payload));
      return false;
    }

    if (message.type === 'CLEAR_HRMS_SYNC') {
      sendResponse(clearHrmsPayload());
      return false;
    }

    return undefined;
  });
})();
