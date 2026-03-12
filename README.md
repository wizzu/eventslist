# Eventslist

A personal events listing with a web interface for browsing/filtering and a CLI tool for statistics.

## Web App

A static single-page app — open `index.html` in a browser (or serve the directory with any static file server). No backend required.

## CLI

```bash
python gigcount.py events.txt
```

## Maintenance

To check for and apply Alpine.js updates:

```bash
scripts/update-alpine.sh
```

> **Note:** The vendored Alpine.js uses a symlink (`alpine.min.js` → `alpine-x.y.z.min.js`). This works on macOS and Linux. On Windows, symlink support requires Developer Mode or elevated privileges.
