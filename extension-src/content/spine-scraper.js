/**
 * Spine HRI content script — silent scrape of Daily In Out Punch.
 * Loads day details in the background, never leaves the day popup open.
 */
(() => {
  const REPORT_URL = `${location.origin}/Atten/MyAttendanceReport.aspx?mnusr=menu__10101`;
  const HIDE_STYLE_ID = 'workshift-spine-silent-hide';

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitFor(predicate, { attempts = 40, delayMs = 250 } = {}) {
    for (let i = 0; i < attempts; i += 1) {
      try {
        if (await predicate()) return true;
      } catch {
        // keep polling
      }
      await sleep(delayMs);
    }
    return false;
  }

  function formatSpineDate(date = new Date()) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(date.getDate()).padStart(2, '0');
    return `${dd}-${months[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
  }

  function isSpinePage() {
    const host = (location.hostname || '').toLowerCase();
    return host.endsWith('.spinehri.in') || host.endsWith('.spinehrm.in');
  }

  function isLoginPage() {
    const url = (location.href || '').toLowerCase();
    return url.includes('login.aspx') || Boolean(document.getElementById('txtUser'));
  }

  function isLoggedInSurface() {
    const text = document.body?.innerText || '';
    return (
      text.includes('Attendance') ||
      text.includes('Welcome') ||
      (location.href || '').toLowerCase().includes('myattendancereport')
    );
  }

  /** Hide day modal / overlays so sync never shows a popup UI. */
  function enableSilentUi() {
    if (document.getElementById(HIDE_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = HIDE_STYLE_ID;
    style.textContent = `
      .modal, .modal-backdrop, .popup, .ui-dialog, .ui-widget-overlay,
      .ui-dialog-content, [role="dialog"], .fancybox-overlay, .fancybox-wrap {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function disableSilentUi() {
    document.getElementById(HIDE_STYLE_ID)?.remove();
  }

  function closeDayPopup() {
    const selectors = [
      '.ui-dialog-titlebar-close',
      '.modal .close',
      '.modal [data-dismiss="modal"]',
      '.popup .close',
      '[aria-label="Close"]',
      'button.close',
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        try {
          btn.click();
        } catch {
          // ignore
        }
      }
    }

    document.querySelectorAll('.modal, .ui-dialog, .popup').forEach((el) => {
      el.style.display = 'none';
      el.classList.remove('show', 'in');
    });
    document.querySelectorAll('.modal-backdrop, .ui-widget-overlay').forEach((el) => el.remove());

    try {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    } catch {
      // ignore
    }
  }

  async function attemptLogin(credentials) {
    if (!credentials?.username || !credentials?.password) {
      return {
        ok: false,
        needsLogin: true,
        message:
          'Not logged into Spine. Save credentials in the extension settings once, or sign in on Spine, then Sync again.',
      };
    }

    const ready = await waitFor(() => document.getElementById('txtUser') != null, {
      attempts: 30,
      delayMs: 200,
    });
    if (!ready) {
      return { ok: false, message: 'Spine login form not found.' };
    }

    const userEl = document.getElementById('txtUser');
    const passEl = document.getElementById('txtPassword');
    const btn = document.getElementById('btnLogin');
    if (!userEl || !passEl || !btn) {
      return { ok: false, message: 'Spine login controls missing.' };
    }

    userEl.value = credentials.username;
    passEl.value = credentials.password;
    userEl.dispatchEvent(new Event('input', { bubbles: true }));
    passEl.dispatchEvent(new Event('input', { bubbles: true }));
    btn.click();

    await sleep(1200);
    if (isLoginPage() && document.getElementById('txtUser')) {
      return {
        ok: false,
        needsLogin: true,
        message: 'Spine login failed. Update saved credentials in the extension, then Sync again.',
      };
    }
    return { ok: true };
  }

  function extractPunchTextFromDocument(doc) {
    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const tableText = table.innerText || table.textContent || '';
      if (!tableText.includes('Daily In Out Punch')) continue;

      const lines = [];
      for (const row of table.querySelectorAll('tr')) {
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
    return '';
  }

  function findTodayAnchor(dateLabel) {
    const target = dateLabel || formatSpineDate(new Date());
    for (const a of document.querySelectorAll('a')) {
      if ((a.textContent || '').trim() === target) return a;
    }
    return null;
  }

  function parseDoPostBackArgs(anchor) {
    if (!anchor) return null;
    const href = anchor.getAttribute('href') || '';
    const onclick = anchor.getAttribute('onclick') || '';
    const source = `${href}\n${onclick}`;

    const patterns = [
      /__doPostBack\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/i,
      /__doPostBack\s*\(\s*"([^"]*)"\s*,\s*"([^"]*)"\s*\)/i,
      /__doPostBack\s*\(\s*'([^']*)'\s*,\s*"([^"]*)"\s*\)/i,
      /__doPostBack\s*\(\s*"([^"]*)"\s*,\s*'([^']*)'\s*\)/i,
    ];

    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match) {
        return { eventTarget: match[1], eventArgument: match[2] };
      }
    }
    return null;
  }

  /**
   * Spine date cells use javascript:__doPostBack(...). Clicking those from a
   * content script is blocked by Chrome CSP — invoke postback in MAIN world.
   */
  async function openDayDetails(anchor) {
    const postback = parseDoPostBackArgs(anchor);
    if (postback) {
      const response = await new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage(
            {
              type: 'SPINE_INVOKE_POSTBACK',
              eventTarget: postback.eventTarget,
              eventArgument: postback.eventArgument,
            },
            (result) => {
              const err = chrome.runtime.lastError;
              if (err) {
                resolve({ ok: false, message: err.message });
                return;
              }
              resolve(result || { ok: false, message: 'No postback response.' });
            },
          );
        } catch (err) {
          resolve({ ok: false, message: err?.message || String(err) });
        }
      });

      if (!response?.ok) {
        return {
          ok: false,
          message: response?.message || 'Failed to open attendance day via postback.',
        };
      }
      return { ok: true, method: 'postback' };
    }

    const href = (anchor.getAttribute('href') || '').trim();
    if (href && !/^javascript:/i.test(href)) {
      try {
        anchor.click();
        return { ok: true, method: 'click' };
      } catch (err) {
        return { ok: false, message: err?.message || String(err) };
      }
    }

    // Last resort: dispatch a trusted-looking click without following javascript: href
    try {
      const onclick = anchor.onclick;
      if (typeof onclick === 'function') {
        onclick.call(anchor, new MouseEvent('click', { bubbles: true, cancelable: true }));
        return { ok: true, method: 'onclick' };
      }
    } catch {
      // ignore
    }

    return {
      ok: false,
      message: 'Date link uses a blocked javascript: URL and no __doPostBack args were found.',
    };
  }

  /**
   * Do not navigate immediately — that closes the message channel before
   * sendResponse can run. Return a navigateTo URL; the listener replies first.
   */
  function ensureOnReport() {
    const url = (location.href || '').toLowerCase();
    if (url.includes('myattendancereport')) return { stayed: true };
    return {
      stayed: false,
      navigateTo: REPORT_URL,
      message: 'Loading attendance report…',
    };
  }

  async function scrapeToday(options = {}) {
    const credentials = options.credentials || null;
    const dateLabel = options.dateLabel || formatSpineDate(new Date());

    try {
      if (isLoginPage()) {
        const loginResult = await attemptLogin(credentials);
        if (!loginResult.ok) return loginResult;
        return {
          ok: false,
          navigating: true,
          navigateTo: REPORT_URL,
          message: 'Logged in — loading attendance…',
        };
      }

      if (!isLoggedInSurface() && !isSpinePage()) {
        return { ok: false, message: 'Unexpected Spine page.' };
      }

      enableSilentUi();
      closeDayPopup();

      // Reuse open popup only when it already contains the requested date.
      let punchText = extractPunchTextFromDocument(document);
      if (punchText.trim() && punchText.includes(dateLabel)) {
        closeDayPopup();
        return { ok: true, punchText, dateLabel, reused: true };
      }

      if (!(location.href || '').toLowerCase().includes('myattendancereport')) {
        const report = ensureOnReport();
        if (!report.stayed) {
          return {
            ok: false,
            navigating: true,
            navigateTo: report.navigateTo,
            message: report.message,
          };
        }
      }

      await waitFor(
        () =>
          (document.body?.innerText || '').includes('Date') ||
          document.querySelectorAll('a').length > 5,
        { attempts: 40, delayMs: 250 },
      );

      const anchor = findTodayAnchor(dateLabel);
      if (!anchor) {
        return {
          ok: false,
          message: `Could not find attendance date "${dateLabel}" on the report.`,
        };
      }

      const opened = await openDayDetails(anchor);
      if (!opened.ok) {
        return opened;
      }

      await sleep(900);
      await waitFor(
        () => (document.body?.innerText || '').includes('Daily In Out Punch'),
        { attempts: 40, delayMs: 250 },
      );

      const modal =
        document.querySelector('.modal, .popup, .ui-dialog, .ui-dialog-content') || document;
      punchText = extractPunchTextFromDocument(modal);
      if (!punchText) {
        punchText = extractPunchTextFromDocument(document);
      }

      closeDayPopup();

      if (!punchText.trim()) {
        return {
          ok: false,
          message: `No Daily In Out Punch rows were found for ${dateLabel}.`,
        };
      }

      // Guard against wrong-day payload if Spine returned another date's modal.
      if (!punchText.includes(dateLabel)) {
        return {
          ok: false,
          message: `Spine returned punches that do not match ${dateLabel}. Try again.`,
        };
      }

      return {
        ok: true,
        punchText,
        dateLabel,
      };
    } finally {
      closeDayPopup();
      disableSilentUi();
    }
  }

  function safeSendResponse(sendResponse, payload) {
    try {
      sendResponse(payload);
      return true;
    } catch {
      // Channel already closed (navigation / bfcache / extension reload).
      return false;
    }
  }

  function replyThenNavigate(sendResponse, result) {
    const navigateTo = result?.navigateTo || null;
    const payload = { ...result };
    delete payload.navigateTo;

    safeSendResponse(sendResponse, payload);

    if (navigateTo) {
      // Defer so the response can leave before unload tears down the port.
      window.setTimeout(() => {
        try {
          location.href = navigateTo;
        } catch {
          // ignore
        }
      }, 60);
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return undefined;

    try {
      if (!chrome.runtime?.id) {
        safeSendResponse(sendResponse, {
          ok: false,
          message: 'Extension was reloaded. Refresh Spine/WorkShift tabs, then Sync again.',
        });
        return false;
      }
    } catch {
      safeSendResponse(sendResponse, {
        ok: false,
        message: 'Extension was reloaded. Refresh Spine/WorkShift tabs, then Sync again.',
      });
      return false;
    }

    if (message.type === 'SPINE_PING') {
      safeSendResponse(sendResponse, { ok: true, url: location.href });
      return false;
    }

    if (message.type === 'SPINE_SCRAPE_TODAY') {
      scrapeToday({
        credentials: message.credentials || null,
        dateLabel: message.dateLabel || null,
      })
        .then((result) => replyThenNavigate(sendResponse, result))
        .catch((err) =>
          safeSendResponse(sendResponse, {
            ok: false,
            message: err?.message || String(err),
          }),
        );
      return true;
    }

    return undefined;
  });
})();
