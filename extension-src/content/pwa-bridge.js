/**
 * PWA bridge — writes HRMS sync keys into WorkShift Calc localStorage.
 *
 * After an extension reload, Chrome leaves the old content script alive but
 * invalidated. We detect that and let a fresh injection take over.
 */
(() => {
  function readExtensionId() {
    try {
      return chrome?.runtime?.id || null;
    } catch {
      return null;
    }
  }

  const extensionId = readExtensionId();
  const previous = window.__WORKSHIFT_PWA_BRIDGE__;

  // Same live extension instance already bound — do nothing.
  if (previous?.active && previous.id && extensionId && previous.id === extensionId) {
    return;
  }

  // Orphaned bridge from a previous extension load — shut it down if possible.
  try {
    previous?.retire?.('superseded-by-new-extension-instance');
  } catch {
    // ignore
  }

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

  const EXTENSION_VERSION = '1.0.9';
  const REFRESH_HINT =
    'Extension was reloaded. Refresh this page, then click Sync again.';

  let retired = false;

  const bridgeApi = {
    id: extensionId,
    active: true,
    version: EXTENSION_VERSION,
    retire: null,
  };
  window.__WORKSHIFT_PWA_BRIDGE__ = bridgeApi;
  // Clear legacy flag from older builds so they don't block us forever.
  try {
    delete window.__WORKSHIFT_PWA_BRIDGE_V2__;
  } catch {
    window.__WORKSHIFT_PWA_BRIDGE_V2__ = false;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isContextValid() {
    try {
      const id = chrome?.runtime?.id;
      return Boolean(id && (!extensionId || id === extensionId));
    } catch {
      return false;
    }
  }

  function isTransientChannelError(message) {
    const text = String(message || '').toLowerCase();
    return (
      text.includes('back/forward cache') ||
      text.includes('message channel is closed') ||
      text.includes('asynchronous response') ||
      text.includes('receiving end does not exist') ||
      text.includes('could not establish connection')
    );
  }

  function isContextInvalidatedError(message) {
    return String(message || '').toLowerCase().includes('extension context invalidated');
  }

  function markExtensionPresent() {
    if (retired || !isContextValid()) return;
    try {
      window.__WORKSHIFT_SPINE_EXTENSION__ = {
        present: true,
        version: EXTENSION_VERSION,
      };
      window.dispatchEvent(
        new CustomEvent('workshift-spine-extension', {
          detail: { present: true, version: EXTENSION_VERSION },
        }),
      );
    } catch {
      // ignore
    }
  }

  function markExtensionPaused(detail = {}) {
    try {
      window.__WORKSHIFT_SPINE_EXTENSION__ = {
        present: false,
        paused: true,
        ...detail,
      };
      window.dispatchEvent(
        new CustomEvent('workshift-spine-extension', {
          detail: { present: false, paused: true, ...detail },
        }),
      );
    } catch {
      // ignore
    }
  }

  function retireBridge(reason) {
    if (retired) return;
    retired = true;
    bridgeApi.active = false;
    markExtensionPaused({ invalidated: true, reason: reason || REFRESH_HINT });

    try {
      window.removeEventListener('message', onWindowMessage);
    } catch {
      // ignore
    }

    try {
      if (isContextValid()) {
        chrome.runtime.onMessage.removeListener(onRuntimeMessage);
      }
    } catch {
      // ignore — this is exactly when context is already dead
    }
  }

  bridgeApi.retire = retireBridge;

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

  function runtimeSendMessage(message) {
    return new Promise((resolve) => {
      if (retired || !isContextValid()) {
        retireBridge('Extension context invalidated.');
        resolve({ ok: false, message: REFRESH_HINT, needsRefresh: true });
        return;
      }

      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      try {
        chrome.runtime.sendMessage(message, (response) => {
          let lastErrorMessage = '';
          try {
            lastErrorMessage = chrome.runtime?.lastError?.message || '';
          } catch (err) {
            lastErrorMessage = err?.message || 'Extension context invalidated.';
          }

          if (lastErrorMessage) {
            if (isContextInvalidatedError(lastErrorMessage)) {
              retireBridge(lastErrorMessage);
              finish({ ok: false, message: REFRESH_HINT, needsRefresh: true });
              return;
            }
            finish({ ok: false, message: lastErrorMessage });
            return;
          }

          finish(response || { ok: false, message: 'No response from extension.' });
        });
      } catch (err) {
        const messageText = err?.message || String(err);
        if (isContextInvalidatedError(messageText)) {
          retireBridge(messageText);
          finish({ ok: false, message: REFRESH_HINT, needsRefresh: true });
          return;
        }
        finish({ ok: false, message: messageText });
      }
    });
  }

  async function runtimeSendMessageWithRetry(message, attempts = 4) {
    let last = { ok: false, message: 'No response from extension.' };
    for (let i = 0; i < attempts; i += 1) {
      if (retired || !isContextValid()) {
        retireBridge('Extension context invalidated.');
        return { ok: false, message: REFRESH_HINT, needsRefresh: true };
      }

      last = await runtimeSendMessage(message);
      if (last?.needsRefresh || isContextInvalidatedError(last?.message)) {
        return { ok: false, message: REFRESH_HINT, needsRefresh: true };
      }
      // Chrome warns when an async listener's port dies mid-flight; treat as retryable.
      if (
        last?.ok ||
        (!isTransientChannelError(last?.message) &&
          !String(last?.message || '')
            .toLowerCase()
            .includes('asynchronous response'))
      ) {
        return last;
      }
      await sleep(250 * (i + 1));
      markExtensionPresent();
    }
    return last;
  }

  async function handlePageSyncRequest(requestId, dateLabel) {
    try {
      const result = await runtimeSendMessageWithRetry({
        type: 'SYNC_TODAY',
        source: 'pwa',
        requestId: requestId || null,
        dateLabel: dateLabel || null,
      });

      window.postMessage(
        {
          type: 'WORKSHIFT_SPINE_SYNC_RESULT',
          requestId: requestId || null,
          ok: Boolean(result?.ok),
          result,
        },
        '*',
      );
    } catch (err) {
      const messageText = err?.message || String(err);
      if (isContextInvalidatedError(messageText)) {
        retireBridge(messageText);
      }
      window.postMessage(
        {
          type: 'WORKSHIFT_SPINE_SYNC_RESULT',
          requestId: requestId || null,
          ok: false,
          result: {
            ok: false,
            message: isContextInvalidatedError(messageText) ? REFRESH_HINT : messageText,
            needsRefresh: isContextInvalidatedError(messageText),
          },
        },
        '*',
      );
    }
  }

  function onWindowMessage(event) {
    if (retired) return;
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'WORKSHIFT_SPINE_PING') {
      if (!isContextValid()) {
        retireBridge('Extension context invalidated.');
        window.postMessage(
          {
            type: 'WORKSHIFT_SPINE_PONG',
            requestId: data.requestId || null,
            present: false,
            needsRefresh: true,
          },
          '*',
        );
        return;
      }
      markExtensionPresent();
      window.postMessage(
        {
          type: 'WORKSHIFT_SPINE_PONG',
          requestId: data.requestId || null,
          present: true,
          version: EXTENSION_VERSION,
        },
        '*',
      );
      return;
    }

    if (data.type === 'WORKSHIFT_SPINE_SYNC') {
      if (!isContextValid()) {
        retireBridge('Extension context invalidated.');
        window.postMessage(
          {
            type: 'WORKSHIFT_SPINE_SYNC_RESULT',
            requestId: data.requestId || null,
            ok: false,
            result: { ok: false, message: REFRESH_HINT, needsRefresh: true },
          },
          '*',
        );
        return;
      }
      handlePageSyncRequest(data.requestId || null, data.dateLabel || null);
    }
  }

  function onRuntimeMessage(message, _sender, sendResponse) {
    try {
      if (retired || !isContextValid()) {
        retireBridge('Extension context invalidated.');
        try {
          sendResponse({ ok: false, message: REFRESH_HINT, needsRefresh: true });
        } catch {
          // ignore
        }
        return false;
      }

      if (!message || typeof message !== 'object') return undefined;

      if (message.type === 'PWA_PING') {
        markExtensionPresent();
        sendResponse({ ok: true, version: EXTENSION_VERSION });
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
    } catch (err) {
      const messageText = err?.message || String(err);
      if (isContextInvalidatedError(messageText)) {
        retireBridge(messageText);
      }
      try {
        sendResponse({
          ok: false,
          message: isContextInvalidatedError(messageText) ? REFRESH_HINT : messageText,
          needsRefresh: isContextInvalidatedError(messageText),
        });
      } catch {
        // ignore
      }
      return false;
    }

    return undefined;
  }

  function bind() {
    window.addEventListener('message', onWindowMessage);
    try {
      if (isContextValid()) {
        chrome.runtime.onMessage.addListener(onRuntimeMessage);
        markExtensionPresent();
      } else {
        retireBridge('Extension context invalidated.');
      }
    } catch (err) {
      retireBridge(err?.message || String(err));
    }
  }

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      markExtensionPaused();
    }
  });

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    if (!isContextValid()) {
      retireBridge('Extension context invalidated.');
      return;
    }
    markExtensionPresent();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!isContextValid()) {
      retireBridge('Extension context invalidated.');
      return;
    }
    markExtensionPresent();
  });

  bind();
})();
