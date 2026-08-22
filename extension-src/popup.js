const statusEl = document.getElementById('status');
const btnSync = document.getElementById('btnSync');
const btnSyncWeek = document.getElementById('btnSyncWeek');
const btnOpen = document.getElementById('btnOpen');
const btnSaveCreds = document.getElementById('btnSaveCreds');
const originEl = document.getElementById('origin');
const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');
const saveCredsEl = document.getElementById('saveCreds');
const syncDateEl = document.getElementById('syncDate');

function setStatus(message, tone = 'info') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.remove('ok', 'error');
  if (tone === 'ok') statusEl.classList.add('ok');
  if (tone === 'error') statusEl.classList.add('error');
}

function toSpineLabel(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [year, month, day] = isoDate.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${months[Number(month) - 1]}-${year.slice(-2)}`;
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftIso(isoDate, delta) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const next = new Date(year, month - 1, day + delta);
  return localIsoDate(next);
}

if (syncDateEl && !syncDateEl.value) {
  syncDateEl.value = localIsoDate();
  syncDateEl.max = localIsoDate();
}

async function loadSettings() {
  try {
    const data = await chrome.storage.local.get([
      'spineOrigin',
      'spineUsername',
      'spinePassword',
      'spineSaveCredentials',
      'lastSyncAt',
      'lastHrmsPayload',
    ]);

    if (originEl) originEl.value = data.spineOrigin || 'https://rysun.spinehri.in';
    if (usernameEl) usernameEl.value = data.spineUsername || '';
    if (passwordEl) passwordEl.value = data.spinePassword || '';
    if (saveCredsEl) saveCredsEl.checked = Boolean(data.spineSaveCredentials);

    if (data.lastHrmsPayload?.hrmsSelectedDate) {
      const when = data.lastSyncAt ? new Date(data.lastSyncAt).toLocaleTimeString() : '';
      setStatus(
        `Last sync: ${data.lastHrmsPayload.hrmsSelectedDate} · ${data.lastHrmsPayload.hrmsPunchCount || 0} punches${when ? ` at ${when}` : ''}`,
        'ok',
      );
    }
  } catch (err) {
    setStatus(err?.message || 'Could not load settings.', 'error');
  }
}

if (btnSync) {
  btnSync.addEventListener('click', async () => {
    btnSync.disabled = true;
    setStatus('Syncing from Spine…');
    try {
      const dateLabel = toSpineLabel(syncDateEl?.value) || null;
      const result = await chrome.runtime.sendMessage({ type: 'SYNC_DATE', dateLabel });
      if (result?.ok) {
        setStatus(result.message || 'Synced.', 'ok');
      } else {
        setStatus(result?.message || 'Sync failed.', 'error');
      }
    } catch (err) {
      setStatus(err?.message || String(err), 'error');
    } finally {
      btnSync.disabled = false;
    }
  });
}

if (btnSyncWeek) {
  btnSyncWeek.addEventListener('click', async () => {
    btnSyncWeek.disabled = true;
    setStatus('Syncing last 7 days from Spine…');
    try {
      const end = syncDateEl?.value || localIsoDate();
      const labels = [];
      for (let i = 6; i >= 0; i -= 1) {
        labels.push(toSpineLabel(shiftIso(end, -i)));
      }
      const result = await chrome.runtime.sendMessage({
        type: 'SYNC_RANGE',
        dateLabels: labels.filter(Boolean),
        applyDateLabel: toSpineLabel(end),
      });
      if (result?.ok) {
        setStatus(result.message || 'Synced 7 days.', 'ok');
      } else {
        setStatus(result?.message || 'Range sync failed.', 'error');
      }
    } catch (err) {
      setStatus(err?.message || String(err), 'error');
    } finally {
      btnSyncWeek.disabled = false;
    }
  });
}

if (btnOpen) {
  btnOpen.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'OPEN_SPINE' });
    } catch (err) {
      setStatus(err?.message || String(err), 'error');
    }
  });
}

if (btnSaveCreds) {
  btnSaveCreds.addEventListener('click', async () => {
    try {
      const save = Boolean(saveCredsEl?.checked);
      await chrome.storage.local.set({
        spineOrigin: (originEl?.value || '').trim().replace(/\/$/, '') || 'https://rysun.spinehri.in',
        spineSaveCredentials: save,
        spineUsername: save ? (usernameEl?.value || '').trim() : '',
        spinePassword: save ? passwordEl?.value || '' : '',
      });
      if (!save && passwordEl) {
        passwordEl.value = '';
      }
      setStatus(save ? 'Portal and login fallback saved.' : 'Portal saved. Login fallback cleared.', 'ok');
    } catch (err) {
      setStatus(err?.message || String(err), 'error');
    }
  });
}

loadSettings();
