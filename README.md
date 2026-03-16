# Eventslist

A personal events listing (concerts, festivals, trips, etc.) with a web interface for browsing/filtering and a CLI tool for statistics.

## Web App

A fully static single-page app — no backend, no build step. Serve the `spa/` directory with any static file server.

For local development and testing, you can use e.g.

```bash
cd spa && python3 -m http.server
# open http://localhost:8000
```

### Event Data

The app loads event data on startup using this lookup order:

1. **`spa/data-source-url.txt`** — if this file exists and contains a URL, the app fetches data from that URL. On failure, it shows an error banner and stops. If the file is absent or empty, it continues to the next step.
2. **`spa/events.txt`** — local data file. If not found, continues to next step.
3. **`spa/events-sample.txt`** — bundled sample data; shows a notice banner so it's clear real data is not loaded.
4. If nothing is found, a "no data" banner is shown.

`events.txt` and `data-source-url.txt` are gitignored — they are deployment-specific and not part of the repo.

### Deploying

Deploy the `spa/` directory to any static hosting (nginx, Apache, Caddy, GitHub Pages, etc.).

**Option A — local data file:** copy your `events.txt` into the deployed `spa/` directory.

**Option B — remote data URL:** create `data-source-url.txt` in the deployed `spa/` directory containing the URL to your events file, one URL on a single line:

```
https://example.com/events.txt
```

Requirements for Option B:
- The data server must serve the file over **HTTPS**. Browsers block cross-origin HTTP fetches from HTTPS pages (mixed content policy).
- The data server must send a **CORS header**: `Access-Control-Allow-Origin: *` (or the specific origin of your app). Without it, the browser blocks the fetch regardless of HTTPS.

The event data format is documented in `FORMAT.md`.

## CLI

```bash
python3 gigcount.py events.txt
```

Prints concert/performance statistics from a local events file.

## Maintenance

To check for and apply Alpine.js updates:

```bash
scripts/update-alpine.sh
```

> **Note:** The vendored Alpine.js uses a symlink (`alpine.min.js` → `alpine-x.y.z.min.js`). This works on macOS and Linux. On Windows, symlink support requires Developer Mode or elevated privileges.
