# TabAla - Development Guide

This document describes the complete build and loading process for the TabAla extension in Chrome.

## Requirements

- Docker 20.10+
- Docker Compose v2+
- Make
- Google Chrome 88+

## Building the Extension

### Build Command

```bash
make build
```

This command runs the build via Docker, ensuring environment consistency. Vite processes the TypeScript/Svelte files and generates the extension in the `dist/` folder.

### Expected Output

```
>>> Building extension for production...
vite v5.x.x building for production...
✓ 31 modules transformed.
dist/icons/icon-16.png                     0.08 kB
dist/icons/icon-48.png                     0.11 kB
dist/icons/icon-128.png                    0.26 kB
dist/service-worker-loader.js              0.05 kB
dist/src/popup/index.html                  0.40 kB
dist/manifest.json                         0.60 kB
dist/assets/index-xxxxx.css                0.17 kB
dist/assets/service-worker.ts-xxxxx.js     0.15 kB
dist/assets/index.html-xxxxx.js            5.80 kB
✓ built in xxxms
>>> Build complete! Artifacts in dist/
```

### `dist/` Structure

After building, the `dist/` folder should contain:

```
dist/
├── manifest.json              # Extension Manifest V3
├── service-worker-loader.js   # Service worker loader
├── assets/
│   ├── index-xxxxx.css        # Compiled styles
│   ├── index.html-xxxxx.js    # Popup JavaScript
│   └── service-worker.ts-xxxxx.js
├── icons/
│   ├── icon-16.png            # 16x16 icon
│   ├── icon-48.png            # 48x48 icon
│   └── icon-128.png           # 128x128 icon
├── src/
│   └── popup/
│       └── index.html         # Popup HTML
└── .vite/
    └── manifest.json          # Vite manifest (internal)
```

## Loading the Extension in Chrome

### Step by Step

1. **Run the build**
   ```bash
   make build
   ```

2. **Open Chrome and go to the extensions page**
   - Type `chrome://extensions` in the address bar
   - Or go to Menu (⋮) → More tools → Extensions

3. **Enable Developer mode**
   - Toggle in the top right corner of the page

4. **Load the extension**
   - Click "Load unpacked"
   - Navigate to the project's `dist/` folder
   - Select the folder and confirm

5. **Verify it loaded**
   - The "TabAla" extension should appear in the list
   - Status should show "Enabled"
   - There should be no red errors or critical warnings

6. **Test the icon**
   - The TabAla icon should appear in the toolbar
   - Hover to see the tooltip "TabAla"

7. **Test the popup**
   - Click the extension icon
   - The popup should open showing "Hello TabAla"

### Updating the Extension

After modifying the code:

```bash
# Rebuild
make build

# In Chrome:
# 1. Go to chrome://extensions
# 2. Click the refresh button (↻) on the TabAla extension card
# 3. Or click "Update" at the top of the page
```

For development with hot-reload, use `make dev` instead of `make build`.

## Inspecting the Extension

### Popup DevTools

1. Right-click on the open popup
2. Select "Inspect"
3. DevTools will open for the popup context
4. Check the "Console" tab for errors

### Service Worker DevTools

1. In `chrome://extensions`, locate TabAla
2. Click "Service Worker" (blue link)
3. The background script DevTools will open

## Troubleshooting

### 1. Build fails with Docker error

**Symptom:** Error when running `make build`
```
Cannot connect to the Docker daemon
```

**Solution:**
- Check if Docker is running: `docker info`
- Start Docker Desktop (macOS/Windows)
- Linux: `sudo systemctl start docker`

### 2. Extension does not load — Manifest error

**Symptom:** Red error when loading: "Manifest file is invalid"

**Solutions:**
- Check if the build was run: `ls dist/manifest.json`
- Confirm that `manifest.json` is valid JSON
- Make sure to select the `dist/` folder, not the project root

### 3. Icons do not appear or show generic placeholder

**Symptom:** Default Chrome icon instead of the TabAla icon

**Solutions:**
- Check if the icons exist: `ls -la dist/icons/`
- Confirm the files are not empty (should be > 0 bytes)
- Reload the extension in chrome://extensions

### 4. Popup does not open or shows a blank page

**Symptom:** Clicking the icon does nothing or shows an empty popup

**Solutions:**
1. Open the popup DevTools (right-click → Inspect)
2. Check for errors in the Console
3. Common errors:
   - `net::ERR_FILE_NOT_FOUND` → Incorrect paths in HTML
   - `Refused to load script` → CSP issues (check manifest.json)
4. Confirm that `dist/src/popup/index.html` exists and correctly references the assets

### 5. Hot-reload does not work in dev mode

**Symptom:** Code changes are not reflected in the extension

**Solutions:**
- Check that `make dev` is running
- Confirm the container is active: `docker ps`
- macOS/Windows: Enable file sharing in Docker Desktop
- Manually reload the extension

### 6. Port 5173 is busy

**Symptom:** Error when starting the dev server
```
Port 5173 is already in use
```

**Solutions:**
- Identify the process: `lsof -i :5173`
- Kill the process: `kill -9 <PID>`
- Or stop the old container: `make stop`

### 7. Permission errors on Docker volume

**Symptom:** `EACCES: permission denied`

**Solutions:**
- Linux: Adjust permissions: `chmod -R 755 .`
- The container runs as user `node` (uid 1000)
- Check ownership: `ls -la package.json`

### 8. Service Worker does not register

**Symptom:** Background console shows registration error

**Solutions:**
- Check if `dist/service-worker-loader.js` exists
- Confirm the configuration in `manifest.json`:
  ```json
  "background": {
    "service_worker": "service-worker-loader.js",
    "type": "module"
  }
  ```
- Fully reload the extension (remove and add again)

## Useful Commands

```bash
# Production build
make build

# Development with hot-reload
make dev

# Run tests
make test

# Linting
make lint

# Clean dist/
make clean

# Shell in the container
make shell

# Stop containers
make stop
```

## References

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Overview](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Debugging Extensions](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [Vite Build](https://vitejs.dev/guide/build.html)
- [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin/)
