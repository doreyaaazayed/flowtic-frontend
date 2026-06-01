# FlowTic — Capacitor (Android & iOS)

The mobile app is the **same web app** (`frontend/`) inside a native shell. Same UI, same `/api` backend, same MongoDB.

**Feature parity:** see [docs/MOBILE_FEATURE_PARITY.md](../docs/MOBILE_FEATURE_PARITY.md) for the full web ↔ mobile mapping.

## Prerequisites

| Tool | Android | iOS |
|------|---------|-----|
| Node.js | Yes | Yes |
| Backend running | `cd backend && npm start` | Same |
| Android Studio | Yes (emulator or USB device) | — |
| Xcode | — | Yes (Mac only, for simulator/device) |

On **Windows** you can build and run **Android**; **iOS** project is generated but building requires a Mac.

---

## Method A — Live reload on your phone (recommended for testing)

Full web app from your PC’s dev server — instant updates, same as browser.

### 1. Find your PC LAN IP

Backend console shows: `iPhone/LAN API: http://172.20.10.x:5000`  
Or run: `ipconfig` → IPv4 Address.

### 2. Start backend + frontend

```powershell
# Terminal 1
cd backend
npm start

# Terminal 2
cd frontend
npm run dev
```

### 3. Point Capacitor at the dev server

```powershell
cd frontend
$env:CAPACITOR_SERVER_URL="http://YOUR_LAN_IP:5174"
npm run cap:sync:dev
npx cap open android
```

Replace `YOUR_LAN_IP` (e.g. `172.20.10.4`). Phone and PC on **same Wi‑Fi**.

### 4. Run on device

**Android**

- Android Studio opens → wait for Gradle sync.
- Plug in phone (USB debugging on) or start an emulator.
- Click **Run** (green play).

The app loads `http://YOUR_LAN_IP:5174` — API calls go to `http://YOUR_LAN_IP:5000` automatically (same host as Vite).

**iOS (Mac only)**

```bash
export CAPACITOR_SERVER_URL=http://YOUR_LAN_IP:5174
npm run cap:sync:dev
npm run cap:open:ios
```

Run from Xcode on simulator or device (same Wi‑Fi).

---

## Method B — Bundled app (offline UI, needs API URL at build)

### 1. Set API URL for the phone

Create `frontend/.env.production.local`:

```env
VITE_API_URL=http://YOUR_LAN_IP:5000
```

### 2. Build and sync

```powershell
cd frontend
npm run cap:sync
npx cap open android
```

Install/run from Android Studio. For a physical Android device, allow **cleartext HTTP** (already enabled in config for dev).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run cap:sync` | `vite build` + copy to `android/` / `ios/` |
| `npm run cap:sync:dev` | Sync only (after setting `CAPACITOR_SERVER_URL`) |
| `npm run cap:open:android` | Open Android Studio |
| `npm run cap:open:ios` | Open Xcode |
| `npm run cap:run:android` | Build, sync, run on device/emulator |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank white screen | Use Method A with `CAPACITOR_SERVER_URL`; check firewall allows port 5174 |
| Network request failed | Backend running; same Wi‑Fi; use LAN IP not `localhost` in `VITE_API_URL` |
| Android cleartext blocked | Rebuild after `capacitor.config.ts` (`cleartext: true`) |
| `adb` not found | Install Android Studio SDK; set `ANDROID_HOME` |
| iOS on Windows | Generate project only; build on Mac or CI |

---

## Store release (later)

1. Set `VITE_API_URL=https://api.yourproductiondomain.com`
2. Remove `CAPACITOR_SERVER_URL` / `server.url` from config.
3. `npm run cap:sync`
4. Android: Build → Generate Signed Bundle in Android Studio.
5. iOS: Archive in Xcode → App Store Connect.
