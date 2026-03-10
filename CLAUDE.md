# Eventslist Project

## Overview
A personal events listing (concerts, festivals, trips, etc.) with two interfaces:
1. **Web SPA** — static single-page app for browsing and statistics (no backend)
2. **CLI tool** (`gigcount.py`) — Python script for generating statistics

**Project goals:** Build the app AND learn web technologies along the way. Implementation is intentionally incremental to support this — see "Teaching & Learning Goal" section below.

## Data
- Source: plain text file (`events.txt`), one event per line
- Format: documented in `FORMAT.md`
- Sample data in `sample/events.txt` (not the master copy, may be outdated)
- **The repo is public** — do not commit secrets, credentials, or other sensitive data

## Key Decisions
- Web app is fully static — loads and parses events.txt client-side
- No backend/server required for the web app
- Alpine.js (vendored locally) for UI reactivity
- Parsing logic exists separately in JS (web) and Python (CLI) — accepted tradeoff
- gigcount.py remains a standalone CLI tool
- See DESIGN.md for detailed design, FORMAT.md for data format spec

## Teaching & Learning Goal

**This is a dual-purpose project: build the app AND learn web technologies.**

Implementation is incremental — one small piece at a time, each followed by an explanation of what was added and how it works. This is a first-class goal, not a side note.

**User background:**
- 20+ years software development, fluent in Python
- Familiar with HTML basics, has worked with JS/TS, used Bootstrap ~15 years ago
- CSS is rusty but picks up quickly
- Not yet familiar with Alpine.js or modern web patterns

**How to pitch explanations:**
- Skip HTML basics and general programming concepts
- Focus on **modern web-specific concepts**: the DOM, how browsers load/execute code, modern CSS (flexbox/grid replacing float-based layouts, CSS custom properties)
- Explain **Alpine.js** constructs as they're introduced (`x-data`, `x-bind`, `x-for`, etc.)
- Explain **why** things are done a certain way, not just what they do
- After each step, say what to look for in the browser to verify it works

## Development

Local web development:
```bash
cd spa && python3 -m http.server
# open http://localhost:8000
```

CLI tool:
```bash
python3 gigcount.py events.txt
```

## TODO Hygiene

When completing a task from TODO.md, mark it `[x]` in the same commit. When adding new tasks mid-session, add them to TODO.md immediately so nothing gets lost.

## Project Structure, Conventions & Verification

**This section needs to be filled in as the project develops.**

Things to document here once decided:
- File/directory structure (currently only scaffolding exists — no web app files yet)
- Code style and conventions (JS, Python)
- How to verify changes work (what does "done" look like for web app changes, CLI changes)
- Commit conventions

See TODO.md for a task to flesh this out.
