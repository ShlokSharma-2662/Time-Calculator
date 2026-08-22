# WorkShift Spine Sync (extension-src)

Manifest V3 extension that logs into / scrapes **rysun.spinehri.in** and writes punch data into the WorkShift Calc PWA via the existing `logInput` + `hrms*` localStorage contract.

This is **not** Playwright. The SPA cannot scrape Spine itself (CORS / cookies); the extension supplies a real browser session.

## Load unpacked

**Important:** select the `extension-src` folder itself (the one that contains `manifest.json`). Do **not** select the repo root or the old `extension/` UI bundle.

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Choose: `Time-Calculator/extension-src`
5. Pin the extension (puzzle icon → pin **WorkShift Spine Sync**)
6. Click the toolbar icon — the Spine Sync popup should open

If Chrome shows an error under the extension card, open **Errors** and reload after fixing. After updating files, click **Reload** on the extension card.

If load still fails, copy `extension-src` to a path **without spaces** (e.g. `C:\WorkShift\extension-src`) and load that folder — Chrome can mis-handle paths like `Azure DevOps`.

## Use with WorkShift

Keep WorkShift Calc open on an allowed origin:

- `http://localhost:5173`
- `http://localhost:4173` (preview)
- `https://time-calculator-2v4o.onrender.com` (production)
- `https://*.onrender.com` / `https://*.firebaseapp.com` / `https://*.web.app`

Click **Sync from Spine** in WorkShift (Log Analyzer) — that alone should sync. You do not need the extension popup for day-to-day use.

Spine runs in a **pinned background tab** (not focused). The day detail dialog is loaded hidden and closed automatically — you should not see a Spine popup. Focus stays on WorkShift unless login credentials are missing.

## Auth

- **Default:** use your existing Spine browser session.
- If the report redirects to login, sign in in the Spine tab and sync again.
- Optional fallback: save username/password in the popup (stored in `chrome.storage.local` — weaker than desktop DPAPI).

## Manual checklist

- [ ] Logged into Spine → Sync → Log Analyzer HRMS panel shows today’s punches
- [ ] Logged out → Sync → needs-login message; after manual login, sync succeeds
- [ ] Portal DOM change / missing date link → clear error toast
- [ ] Paste/manual override still works when sync is unavailable

## Notes

- Fragile against Spine HTML changes (same risk as the WPF WebView2 scraper).
- The committed `extension/` folder remains the older full-app popup artifact; Spine sync source of truth is `extension-src/`.
