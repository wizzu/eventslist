# Eventslist Project

## Overview
A personal events listing (concerts, festivals, trips, etc.) with two interfaces:
1. **Web SPA** — static single-page app for browsing and statistics (no backend)
2. **CLI tool** (`gigcount.py`) — Python script for generating statistics

**Project goals:** Build the app AND learn web technologies along the way. Implementation is intentionally incremental to support this — see "Teaching & Learning Goal" below.

## Data
- Source: plain text file (`events.txt`), one event per line
- Format: documented in `FORMAT.md`
- Master copy lives outside the repo; `spa/events.txt` is a copy
- **The repo is public** — do not commit secrets, credentials, or other sensitive data

## Architecture
- Web app is fully static — loads and parses `events.txt` client-side, no backend
- Alpine.js (vendored locally) for UI reactivity
- Parsing logic exists in both JS (web) and Python (CLI) — accepted tradeoff
- See `DESIGN.md` for design decisions, `FORMAT.md` for the data format spec

## Development

```bash
# Web app
cd spa && python3 -m http.server
# open http://localhost:8000

# CLI tool
python3 gigcount.py events.txt
```

## Teaching & Learning Goal

**This is a dual-purpose project: build the app AND learn web technologies.**

Each change is followed by an explanation of what was added and why. This is a first-class goal, not a side note.

**User background:**
- 20+ years software development, fluent in Python
- Familiar with HTML basics, has worked with JS/TS, used Bootstrap ~15 years ago
- CSS is rusty but picks up quickly
- Not yet familiar with Alpine.js or modern web patterns

**How to pitch explanations:**
- Skip HTML basics and general programming concepts
- Focus on **modern web-specific concepts**: the DOM, how browsers load/execute code, modern CSS (flexbox/grid, CSS custom properties)
- Explain **Alpine.js** constructs as they're introduced (`x-data`, `x-bind`, `x-for`, etc.)
- Explain **why** things are done a certain way, not just what they do
- After each change, say what to look for in the browser to verify it works

## Reference

See `DEVELOPMENT.md` for file structure, code conventions, browser caching notes, and known gotchas.

## Workflow
- **Propose before implementing** for anything opinionated: layout, design, UX decisions, non-trivial architectural choices. Present the approach and wait for confirmation.
- **Just do it** for straightforward things: bug fixes, simple 1-liners, mechanical changes with an obvious correct answer.
- When in doubt, lean toward proposing first.

## TODO Hygiene
Mark completed tasks `[x]` in the same commit. Add new tasks to `TODO.md` immediately when they come up during a session.
