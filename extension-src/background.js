/* global SpineExtract, importScripts */
importScripts('lib/extractPunches.js');

const { buildHrmsSyncPayload, formatSpineDate } = SpineExtract;

const DEFAULT_SPINE_ORIGIN = 'https://rysun.spinehri.in';
const SPINE_REPORT_PATH = '/Atten/MyAttendanceReport.aspx?mnusr=menu__10101';

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

function isSpineHost(hostname = '') {
  const host = String(hostname).toLowerCase();
  return host.endsWith('.spinehri.in') || host.endsWith('.spinehrm.in');
}

function isSpineUrl(url = '') {
  try {
    return isSpineHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function getSpineOrigin() {
  const { spineOrigin } = await chrome.storage.local.get(['spineOrigin']);
  const stored = String(spineOrigin || '').replace(/\/$/, '');
  if (stored) return stored;

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && isSpineUrl(tab.url)) {
      try {
        return new URL(tab.url).origin;
      } catch {
        // keep looking
      }
    }
  }
  return DEFAULT_SPINE_ORIGIN;
}

async function getSpineHomeUrl() {
  return `${await getSpineOrigin()}/`;
}

async function getSpineReportUrl() {
  return `${await getSpineOrigin()}${SPINE_REPORT_PATH}`;
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
    const reportUrl = await getSpineReportUrl();
    tab = await chrome.tabs.create({ url: reportUrl, active: false, pinned: true });
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
  await chrome.tabs.update(tab.id, { url: await getSpineReportUrl(), active: false });
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

function isChannelClosedError(err) {
  const text = String(err?.message || err || '').toLowerCase();
  return (
    text.includes('message channel is closed') ||
    text.includes('asynchronous response') ||
    text.includes('back/forward cache') ||
    text.includes('receiving end does not exist') ||
    text.includes('could not establish connection')
  );
}

function safeSendResponse(sendResponse, payload) {
  try {
    sendResponse(payload);
  } catch {
    // Popup closed or port already gone — ignore.
  }
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
      if (isChannelClosedError(secondErr) || isChannelClosedError(firstErr)) {
        // Treat as in-flight navigation — caller waits and retries.
        return {
          ok: false,
          navigating: true,
          message: 'Spine tab navigated during scrape — retrying…',
        };
      }
      throw secondErr;
    }
  }
}

async function writePayloadToPwaTabs(payload) {
  const tabs = await findPwaTabs();
  if (!tabs.length) {
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
 * Scrape one Spine day and return a payload without writing to the PWA.
 */
async function scrapeDatePayload(dateLabel) {
  const credentials = await getStoredCredentials();
  const label = dateLabel || formatSpineDate(new Date());
  let tab = await ensureSpineTab();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    let result;
    try {
      result = await sendToTab(tab.id, {
        type: 'SPINE_SCRAPE_TODAY',
        credentials,
        dateLabel: label,
      });
    } catch (err) {
      if (isChannelClosedError(err)) {
        await waitForTabComplete(tab.id).catch(() => null);
        await sleep(800);
        tab = await chrome.tabs.get(tab.id);
        continue;
      }
      return { ok: false, message: err?.message || String(err) };
    }

    if (result?.ok && result.punchText) {
      const payload = buildHrmsSyncPayload(result.punchText);
      if (!payload) {
        return { ok: false, message: `No punches found for ${label}.` };
      }
      return { ok: true, payload };
    }

    if (result?.needsLogin) {
      return {
        ok: false,
        needsLogin: true,
        message:
          result.message ||
          'Spine login required. Save credentials in the extension (optional settings), or open Spine once, then Sync again.',
      };
    }

    if (result?.navigating || isChannelClosedError(result?.message)) {
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

async function syncDate(dateLabel) {
  const scraped = await scrapeDatePayload(dateLabel);
  if (!scraped.ok) return scraped;
  return writePayloadToPwaTabs(scraped.payload);
}

async function writeRangeToPwaTabs(payloads, applyDateLabel) {
  await chrome.storage.local.set({
    lastHrmsPayload: payloads[payloads.length - 1] || null,
    lastRangePayloads: payloads,
    lastSyncAt: Date.now(),
  });

  const tabs = await findPwaTabs();
  if (!tabs.length) {
    return {
      ok: true,
      wrote: false,
      payloads,
      message:
        `Fetched ${payloads.length} day(s). Open WorkShift Calc to apply them to History.`,
    };
  }

  let wrote = false;
  let lastError = '';
  for (const tab of tabs) {
    try {
      let response;
      const message = { type: 'WRITE_HRMS_RANGE', payloads, applyDateLabel: applyDateLabel || null };
      try {
        response = await chrome.tabs.sendMessage(tab.id, message);
      } catch {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/pwa-bridge.js'],
        });
        await sleep(150);
        response = await chrome.tabs.sendMessage(tab.id, message);
      }
      if (response?.ok) wrote = true;
      else if (response?.message) lastError = response.message;
    } catch (err) {
      lastError = err?.message || String(err);
    }
  }

  if (!wrote) {
    return {
      ok: false,
      message: lastError || 'Could not write range data into the WorkShift Calc tab.',
      payloads,
    };
  }

  return {
    ok: true,
    wrote: true,
    payloads,
    message: `Synced ${payloads.length} day(s) from Spine into History.`,
  };
}

async function syncRange(dateLabels, applyDateLabel) {
  const labels = Array.isArray(dateLabels) ? dateLabels.filter(Boolean) : [];
  if (!labels.length) {
    return { ok: false, message: 'No dates to sync.' };
  }

  const payloads = [];
  const failures = [];
  for (const label of labels) {
    const scraped = await scrapeDatePayload(label);
    if (scraped.ok && scraped.payload) {
      payloads.push(scraped.payload);
      continue;
    }
    failures.push({ dateLabel: label, message: scraped.message, needsLogin: scraped.needsLogin });
    if (scraped.needsLogin) {
      if (!payloads.length) return scraped;
      break;
    }
  }

  if (!payloads.length) {
    return {
      ok: false,
      message: failures[0]?.message || 'No punches in that range.',
      needsLogin: Boolean(failures[0]?.needsLogin),
    };
  }

  const result = await writeRangeToPwaTabs(payloads, applyDateLabel || labels[labels.length - 1]);
  if (failures.length && result.ok) {
    result.message = `${result.message} Skipped ${failures.length} day(s) with no punches.`;
  }
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return undefined;

  if (message.type === 'EXTENSION_PING') {
    safeSendResponse(sendResponse, { ok: true, name: 'WorkShift Spine Sync' });
    return false;
  }

  if (message.type === 'SYNC_TODAY' || message.type === 'SYNC_DATE') {
    syncDate(message.dateLabel || null)
      .then((result) => safeSendResponse(sendResponse, result))
      .catch((err) =>
        safeSendResponse(sendResponse, {
          ok: false,
          message: err?.message || String(err),
        }),
      );
    return true;
  }

  if (message.type === 'SYNC_RANGE') {
    syncRange(message.dateLabels || [], message.applyDateLabel || null)
      .then((result) => safeSendResponse(sendResponse, result))
      .catch((err) =>
        safeSendResponse(sendResponse, {
          ok: false,
          message: err?.message || String(err),
        }),
      );
    return true;
  }

  if (message.type === 'OPEN_SPINE') {
    getSpineHomeUrl()
      .then((url) => chrome.tabs.create({ url, active: true }))
      .then(() => safeSendResponse(sendResponse, { ok: true }))
      .catch((err) =>
        safeSendResponse(sendResponse, { ok: false, message: err?.message || String(err) }),
      );
    return true;
  }

  if (message.type === 'SPINE_INVOKE_POSTBACK') {
    const tabId = _sender?.tab?.id;
    if (!tabId) {
      safeSendResponse(sendResponse, { ok: false, message: 'Missing Spine tab for postback.' });
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
        safeSendResponse(
          sendResponse,
          value && typeof value === 'object' ? value : { ok: false, message: 'Postback failed.' },
        );
      })
      .catch((err) => {
        safeSendResponse(sendResponse, { ok: false, message: err?.message || String(err) });
      });
    return true;
  }

  if (message.type === 'GET_STATUS') {
    chrome.storage.local
      .get(['lastSyncAt', 'lastHrmsPayload', 'lastRangePayloads', 'spineSaveCredentials', 'spineUsername'])
      .then((data) =>
        safeSendResponse(sendResponse, {
          ok: true,
          lastSyncAt: data.lastSyncAt || null,
          lastPayload: data.lastHrmsPayload || null,
          lastRangePayloads: data.lastRangePayloads || null,
          credentialsSaved: Boolean(data.spineSaveCredentials && data.spineUsername),
        }),
      )
      .catch((err) =>
        safeSendResponse(sendResponse, { ok: false, message: err?.message || String(err) }),
      );
    return true;
  }

  return undefined;
});
