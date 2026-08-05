const statusEl = document.getElementById('status');
const btnSync = document.getElementById('btnSync');
const btnOpen = document.getElementById('btnOpen');
const btnSaveCreds = document.getElementById('btnSaveCreds');
const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');
const saveCredsEl = document.getElementById('saveCreds');

function setStatus(message, tone = 'info') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.remove('ok', 'error');
  if (tone === 'ok') statusEl.classList.add('ok');
  if (tone === 'error') statusEl.classList.add('error');
}

async function loadSettings() {
  try {
    const data = await chrome.storage.local.get([
      'spineUsername',
      'spinePassword',
      'spineSaveCredentials',
      'lastSyncAt',
      'lastHrmsPayload',
    ]);

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
      const result = await chrome.runtime.sendMessage({ type: 'SYNC_TODAY' });
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
        spineSaveCredentials: save,
        spineUsername: save ? (usernameEl?.value || '').trim() : '',
        spinePassword: save ? passwordEl?.value || '' : '',
      });
      if (!save && passwordEl) {
        passwordEl.value = '';
      }
      setStatus(save ? 'Credentials saved for login fallback.' : 'Saved credentials cleared.', 'ok');
    } catch (err) {
      setStatus(err?.message || String(err), 'error');
    }
  });
}

loadSettings();
