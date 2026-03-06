# Eventslist Project

## Overview
A personal events listing (concerts, festivals, trips, etc.) with two interfaces:
1. **Web SPA** — static single-page app for browsing and statistics (no backend)
2. **CLI tool** (`gigcount.py`) — Python script for generating statistics

## Data
- Source: plain text file (`events.txt`), one event per line
- Format: documented in `FORMAT.md`
- Sample data in `sample/events.txt` (not the master copy, may be outdated)

## Key Decisions
- Web app is fully static — loads and parses events.txt client-side
- No backend/server required for the web app
- Alpine.js (vendored locally) for UI reactivity
- Parsing logic exists separately in JS (web) and Python (CLI) — accepted tradeoff
- gigcount.py remains a standalone CLI tool
- See DESIGN.md for detailed design, FORMAT.md for data format spec
