# UniqueRecord UI Integration Quickstart

This project now supports using the Figma UI (`design/figma/fluent_v1`) as the software frontend.
For delivery, it can run as a Windows desktop executable (embedded WebView), not a browser-only tool.

## 1. Verify files

- Figma UI source should be under `design/figma/fluent_v1`.
- OBS runtime is no longer required.

## 2. Start backend API only

```powershell
python scripts/ui_backend_server.py --host 127.0.0.1 --port 8765 --autostart
```

Available API routes:

- `GET /api/status`
- `GET /api/history?limit=20`
- `GET /api/settings`
- `POST /api/service/start`
- `POST /api/service/stop`
- `POST /api/recording/start`
- `POST /api/recording/stop`

## 3. Frontend local dev mode (recommended during UI iteration)

Run in `design/figma/fluent_v1`:

```powershell
npm install
npm run dev
```

Vite proxy is configured so `/api/*` is forwarded to `http://127.0.0.1:8765`.

## 4. Single-port integrated mode (serve built UI from backend)

Build frontend once:

```powershell
cd design/figma/fluent_v1
npm install
npm run build
```

Start integrated server from project root:

```powershell
python scripts/ui_backend_server.py --host 127.0.0.1 --port 8765 --autostart --web-root design/figma/fluent_v1/dist
```

Then open:

- `http://127.0.0.1:8765/dashboard`

The backend serves static files and falls back to `index.html` for SPA routes.

## 5. Current connected pages

- `Dashboard`: live runtime status + manual start/stop controls.
- `History`: real session index list and statistics.
- `SettingsDetection`: reads status/settings and controls service start/stop.

## 6. Windows desktop mode (no manual browser open)

Build frontend first:

```powershell
cd design/figma/fluent_v1
npm install
npm run build
```

Run desktop shell from project root:

```powershell
python -m pip install -r requirements-desktop.txt
python scripts/run_desktop_app.py
```

The app opens a native desktop window and loads `http://127.0.0.1:8765/dashboard` internally.

## 7. Known gaps

- `Settings` save-back to config is not connected yet.
- If `npm install` is blocked by network/cache policy, frontend build cannot be executed in this environment.
