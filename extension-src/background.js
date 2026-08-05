/* global SpineExtract, importScripts */
importScripts('lib/extractPunches.js');

const { buildHrmsSyncPayload, formatSpineDate } = SpineExtract;

const SPINE_HOME = 'https://rysun.spinehri.in/';
const SPINE_REPORT =
  'https://rysun.spinehri.in/Atten/MyAttendanceReport.aspx?mnusr=menu__10101';

const PWA_URL_PATTERNS = [
  /^http:\/\/localhost:5173\//i,
  /^http:\/\/127\.0\.0\.1:5173\//i,
  /^http:\/\/localhost:4173\//i,
  /^http:\/\/127\.0\.0\.1:4173\//i,
  /^https:\/\/[^/]+\.firebaseapp\.com\//i,
  /^https:\/\/[^/]+\.web\.app\//i,
  /^https:\/\/time-calculator-2v4o\.onrender\.com\//i,
  /^https:\/\/[^/]+\.onrender\.com\//i,
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSpineUrl(url = '') {
  return String(url).toLowerCase().includes('rysun.spinehri.in');
}

function isPwaUrl(url = '') {
  return PWA_URL_PATTERNS.some((re) => re.test(String(url)));
}

async function getStoredCredentials() {
  const data = await chrome.storage.local.get(['spineUsername', 'spinePassword', 'spineSaveCredentials']);
  if (!data.spineSaveCredentials) return null;
  if (!data.spineUsername || !data.spinePassword) return null;
  return {
    username: data.spineUsername,
    password: data.spinePassword,
  };
}

async function findSpineTab() {
  const { spineWorkerTabId } = await chrome.storage.local.get(['spineWorkerTabId']);
  if (spineWorkerTabId != null) {
    try {
      const remembered = await chrome.tabs.get(spineWorkerTabId);
      if (remembered?.url && isSpineUrl(remembered.url)) {
        return remembered;
      }
    } catch {
      // tab closed
    }
  }

  const tabs = await chrome.tabs.query({});
  return tabs.find((tab) => tab.url && isSpineUrl(tab.url)) || null;
}

async function rememberSpineTab(tabId) {
  await chrome.storage.local.set({ spineWorkerTabId: tabId });
}

function isAttendanceReportUrl(url = '') {
  return String(url).toLowerCase().includes('myattendancereport');
}

/**
 * Keep Spine in a background tab — do not steal focus or reload every sync.
 */
async function ensureSpineTab() {
  let tab = await findSpineTab();

  if (!tab) {
    // Background worker tab only — never steals focus from WorkShift.
    tab = await chrome.tabs.create({ url: SPINE_REPORT, active: false, pinned: true });
    await rememberSpineTab(tab.id);
    await waitForTabComplete(tab.id);
    await sleep(600);
    return chrome.tabs.get(tab.id);
  }

  await rememberSpineTab(tab.id);

  // Already on the report — scrape in place, no navigation / no focus.
  if (isAttendanceReportUrl(tab.url)) {
    if (tab.status !== 'complete') {
      await waitForTabComplete(tab.id).catch(() => null);
    }
    return chrome.tabs.get(tab.id);
  }

  // On some other Spine page (home/login) — navigate in background only.
  await chrome.tabs.update(tab.id, { url: SPINE_REPORT, active: false });
  await waitForTabComplete(tab.id);
  await sleep(600);
  return chrome.tabs.get(tab.id);
}

async function findPwaTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab) => tab.url && isPwaUrl(tab.url));
}

async function waitForTabComplete(tabId, timeoutMs = 45000) {
  const existing = await chrome.tabs.get(tabId);
  if (existing.status === 'complete') return existing;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Timed out waiting for Spine page to load.'));
    }, timeoutMs);

    function listener(updatedTabId, info) {
      if (updatedTabId !== tabId) return;
      if (info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.get(tabId).then(resolve).catch(reject);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function sendToTab(tabId, message) {
  const trySend = async () => chrome.tabs.sendMessage(tabId, message);

  try {
    return await trySend();
  } catch (firstErr) {
    // Content script may not be injected yet, or bfcache closed the port.
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: message.type?.startsWith('WRITE_') || message.type === 'PWA_PING' || message.type === 'CLEAR_HRMS_SYNC'
          ? ['content/pwa-bridge.js']
          : ['content/spine-scraper.js'],
      });
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/spine-scraper.js'],
      });
    }
    await sleep(250);
    try {
      return await trySend();
    } catch (secondErr) {
      const text = String(secondErr?.message || firstErr?.message || secondErr);
      if (
        text.toLowerCase().includes('back/forward cache') ||
        text.toLowerCase().includes('message channel is closed')
      ) {
        // Nudge the tab awake without stealing focus, then retry once more.
        await chrome.tabs.update(tabId, { active: false }).catch(() => null);
        await sleep(400);
        return trySend();
      }
      throw secondErr;
    }
  }
}

async function writePayloadToPwaTabs(payload) {
  const tabs = await findPwaTabs();
  if (!tabs.length) {
    // Persist for next PWA open via chrome.storage; bridge will not auto-apply,
    // but background keeps last payload for popup status.
    await chrome.storage.local.set({ lastHrmsPayload: payload, lastSyncAt: Date.now() });
    return {
      ok: true,
      wrote: false,
      message:
        'Punches fetched. Open WorkShift Calc (localhost or hosted PWA) with the extension enabled to apply them.',
      payload,
    };
  }

  let wrote = false;
  let lastError = '';
  for (const tab of tabs) {
    try {
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, {
          type: 'WRITE_HRMS_SYNC',
          payload,
        });
      } catch {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/pwa-bridge.js'],
        });
        await sleep(150);
        response = await chrome.tabs.sendMessage(tab.id, {
          type: 'WRITE_HRMS_SYNC',
          payload,
        });
      }
      if (response?.ok) wrote = true;
      else if (response?.message) lastError = response.message;
    } catch (err) {
      lastError = err?.message || String(err);
    }
  }

  await chrome.storage.local.set({ lastHrmsPayload: payload, lastSyncAt: Date.now() });

  if (!wrote) {
    return {
      ok: false,
      message: lastError || 'Could not write sync data into the WorkShift Calc tab.',
      payload,
    };
  }

  return {
    ok: true,
    wrote: true,
    message: `Synced ${payload.hrmsPunchCount} punches for ${payload.hrmsSelectedDate}.`,
    payload,
  };
}

/**
 * Orchestrate Spine scrape for a specific date (dd-MMM-yy), defaulting to today.
 */
async function syncDate(dateLabel) {
  const credentials = await getStoredCredentials();
  const label = dateLabel || formatSpineDate(new Date());
  let tab = await ensureSpineTab();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await sendToTab(tab.id, {
      type: 'SPINE_SCRAPE_TODAY',
      credentials,
      dateLabel: label,
    });

    if (result?.ok && result.punchText) {
      const payload = buildHrmsSyncPayload(result.punchText);
      if (!payload) {
        return { ok: false, message: 'Punch text was empty after scrape.' };
      }
      return writePayloadToPwaTabs(payload);
    }

    if (result?.needsLogin) {
      // Stay on WorkShift — do not force-open Spine. User can save creds or open Spine once.
      return {
        ok: false,
        needsLogin: true,
        message:
          result.message ||
          'Spine login required. Save credentials in the extension (optional settings), or open Spine once, then Sync again.',
      };
    }

    if (result?.navigating) {
      await waitForTabComplete(tab.id).catch(() => null);
      await sleep(800);
      tab = await chrome.tabs.get(tab.id);
      continue;
    }

    return {
      ok: false,
      message: result?.message || `Spine scrape failed for ${label}.`,
    };
  }

  return {
    ok: false,
    message: 'Spine sync stopped after too many navigations. Try again after the report loads.',
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return undefined;

  if (message.type === 'EXTENSION_PING') {
    sendResponse({ ok: true, name: 'WorkShift Spine Sync' });
    return false;
  }

  if (message.type === 'SYNC_TODAY' || message.type === 'SYNC_DATE') {
    syncDate(message.dateLabel || null)
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({
          ok: false,
          message: err?.message || String(err),
        }),
      );
    return true;
  }

  if (message.type === 'OPEN_SPINE') {
    chrome.tabs
      .create({ url: SPINE_HOME, active: true })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, message: err?.message || String(err) }));
    return true;
  }

  if (message.type === 'SPINE_INVOKE_POSTBACK') {
    const tabId = _sender?.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, message: 'Missing Spine tab for postback.' });
      return false;
    }

    const eventTarget = String(message.eventTarget ?? '');
    const eventArgument = String(message.eventArgument ?? '');

    chrome.scripting
      .executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (target, argument) => {
          try {
            if (typeof window.__doPostBack === 'function') {
              window.__doPostBack(target, argument);
              return { ok: true };
            }
            if (typeof __doPostBack === 'function') {
              __doPostBack(target, argument);
              return { ok: true };
            }
            return { ok: false, message: '__doPostBack is not available on this page.' };
          } catch (err) {
            return { ok: false, message: err?.message || String(err) };
          }
        },
        args: [eventTarget, eventArgument],
      })
      .then((results) => {
        const value = results?.[0]?.result;
        sendResponse(value && typeof value === 'object' ? value : { ok: false, message: 'Postback failed.' });
      })
      .catch((err) => {
        sendResponse({ ok: false, message: err?.message || String(err) });
      });
    return true;
  }

  if (message.type === 'GET_STATUS') {
    chrome.storage.local
      .get(['lastSyncAt', 'lastHrmsPayload', 'spineSaveCredentials', 'spineUsername'])
      .then((data) =>
        sendResponse({
          ok: true,
          lastSyncAt: data.lastSyncAt || null,
          lastPayload: data.lastHrmsPayload || null,
          credentialsSaved: Boolean(data.spineSaveCredentials && data.spineUsername),
        }),
      );
    return true;
  }

  return undefined;
});
