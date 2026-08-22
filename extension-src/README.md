# WorkShift Spine Sync

Manifest V3 helper that reads **Daily In Out Punch** from your logged-in Spine tab (`*.spinehri.in` or `*.spinehrm.in`) and writes it into WorkShift Calc. The web app cannot call Spine itself (CORS + session cookies).

## Load unpacked

1. Chrome/Edge → `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `Time-Calculator/extension-src` (the folder with `manifest.json`)
4. Pin **WorkShift Spine Sync**, then **refresh the WorkShift tab**

## Use

1. Keep WorkShift open (`http://localhost:5173` or your hosted PWA).
2. Sign into Spine once in this browser (or set the portal URL under Optional saved credentials).
3. On Today, click **Fetch from Spine** (this day, last 7, or last 14).
4. If you synced from the popup while WorkShift was closed, reopen the PWA — the last payload is applied automatically.

Spine stays in a background tab. Paste still works as a fallback.

Default portal is `https://rysun.spinehri.in`. Change it in the extension popup if your company uses another host.
