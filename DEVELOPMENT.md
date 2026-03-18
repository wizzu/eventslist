# Development Notes

Practical reference for working on this project.

## File Structure

```
spa/
  index.html              # SPA entry point; x-data="app" on <body>
  events.txt              # Event data (master copy lives outside repo)
  data-source-url.txt     # Optional: external data URL (not committed; deploy-specific)
  static/
    parser.js             # Pure functions: parser, parseQuery, termMatches, dateSortKey
    stats.js              # Pure functions: filterEvents, computeVenueStats/YearStats/PerformerStats, eventTitle, displayPerformers
    app.js                # Alpine component (UI state, getters, event handlers)
    strings.js            # Localisation strings (English + Finnish)
    style.css             # All styles
    vendor/
      alpine-3.15.8.min.js  # versioned file
      alpine.min.js         # symlink -> alpine-x.y.z.min.js (stable name used in index.html)
scripts/
  update-alpine.sh          # check and update vendored Alpine.js
tests/
  spa/                    # JS unit tests — run with: bun test
    parser.test.js        # parseLine, parseEvents, dateSortKey
    query.test.js         # parseQuery, termMatches
    stats.test.js         # filterEvents, computeVenueStats/YearStats/PerformerStats, eventTitle, displayPerformers
sample/
  events.txt              # Sample data, may be outdated
gigcount.py               # CLI stats tool (standalone, predates the web app)
FORMAT.md                 # Event line format spec
DESIGN.md                 # Architecture and UI design decisions
TODO.md                   # Task list
```

## Conventions

**JavaScript:**
- Derived/computed state goes in Alpine `get` getters, not imperative code
- No direct DOM manipulation — let Alpine handle rendering
- Pure functions (parser, stats) live in `parser.js` and `stats.js`; the Alpine component in `app.js` calls them as globals

**CSS:**
- Comment non-obvious rules (e.g. `min-height: 0` for flex scrolling, `box-sizing`, vendor prefixes)
- Use `rem` for font sizes and spacing, `px` only for borders and fine details

**Commits:**
- Small and focused — one logical change per commit

**Version:**
- Stored as `window.__appVersion` in `spa/index.html` (near the top, in an inline `<script>` block)
- To bump: increment the string value, e.g. `'v19'` → `'v20'`
- Bump when changes are substantial enough to constitute a release
- At the end of a session with notable changes, ask the user whether to bump the version

## Running Tests

```bash
# All SPA tests
bun test

# Specific file or pattern
bun test tests/spa/parser.test.js
bun test tests/spa/stats
```

Tests live in `tests/spa/` and cover the pure JS functions in `parser.js` and `stats.js`. They have no browser dependency and run entirely in Bun.

## Browser Caching

`python3 -m http.server` does not disable caching. After JS or CSS changes, **hard refresh** (Cmd+Shift+R) to avoid serving stale files. Check the browser console for Alpine expression errors after HTML/JS changes.

A proper dev server (e.g. `npx serve`) sends `Cache-Control: no-store` by default and avoids this entirely.

## Localisation

UI strings live in `spa/static/strings.js` as a `STRINGS` object with `en` and `fi` keys.

**Adding a new string:**
1. Add the key to **both** `en` and `fi` blocks in `strings.js`.
2. Use a plain string for static text; a `function(n)` for text that includes counts or variables.
3. In `index.html`: `x-text="t.key"` or `:placeholder="t.key"`.
4. In `app.js`: `this.t.key` or `this.t.key(n)` for function strings.
5. Keep key names in English regardless of UI language.

**Finnish note:** Finnish uses the partitive case for quantities > 1 (e.g. `1 keikka`, `2 keikkaa`). Dynamic strings that include counts use functions to handle this.

The active language is stored in `this.lang` on the Alpine component and defaults to `'fi'` if `navigator.language` starts with `'fi'`, otherwise `'en'`. It is also persisted to `localStorage` so the user's toggle choice survives page reloads.

## Alpine and Tables

`<template x-for>` must be placed directly inside `<table>`, not inside `<tbody>` — the HTML parser may relocate or drop `<template>` tags inside `<tbody>` before Alpine can process them.

## Data Source

The app tries to load event data in this order:

1. `data-source-url.txt` — if present and non-empty, fetch data from the URL inside. On failure, show an error banner and stop.
2. `events.txt` — local data file (gitignored; deployed separately).
3. `events-sample.txt` — fallback sample data; triggers a "sample data" notice banner.
4. If none found, show a "no data" banner.

`data-source-url.txt` is not committed — it's deploy-specific configuration for pointing at an external data source.

## Behavior Notes

**Notice banners** — three mutually exclusive banners can appear below the header: sample data active (yellow), data load error (red), no data found (grey). Controlled by `usingSample`, `dataError`, and `noData` state flags.

**Single-performer search** — when a search matches exactly one performer, the listing headline switches from concerts to performances ("N performances" instead of "N concerts"), with a detail line showing "across N events · ...". The stats summary panel highlights the Performances row instead of Concerts. For 2+ matched performers the default concerts framing is kept.

**Joint performers** — `A + B` in the data format means two performers billed together. They are displayed as a single line ("A + B") in the event listing but counted individually in statistics. The `jointGroup` field on performer objects tracks which performers belong to the same joint group.
