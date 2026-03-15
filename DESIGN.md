# Design

This document captures the current design approach. It is not set in stone — it can change based on features, UI needs, or other concerns from implementation work or otherwise.

## Purpose

A personal events listing — concerts, festivals, and other attended events. The primary function is browsing and statistics: search by performer, venue, or year; see counts and breakdowns. Data is a plain text file maintained by the owner. The web app is static and requires no backend.

## Audience

Two user classes, with explicit priority ordering:

**Primary — the owner.** It's their data and they built the site. They know the event history, the [C]/[MC] definitions, and the UI conventions. Rich detail is welcome; they'll learn the interface.

**Secondary — a curious visitor.** No prior knowledge of the data, the owner's concert history, or the [C]/[MC] distinction. Works from general language and whatever the UI communicates. Should have a reasonably good experience, but this is explicitly secondary.

Design implication: optimise for the owner first; ensure the UI is not *actively confusing* to a visitor even if it isn't perfectly self-explanatory.

## Design Goals

- **UI clarity as a first-class concern.** Complexity under the hood is fine; the UI should not be confusing regardless of what's happening behind it.
- **Rich data over simplification.** Don't collapse multiple meaningful numbers into one. The owner cares about the breakdown.
- **Full concerts are primary; minis are supplementary.** Full [C] concerts are the headline metric. Mini-concerts are worth tracking and remembering, but they are secondary in presentation — visible, but clearly subordinate to the full count.
- **Consistent labeling.** Each number that appears should be unambiguously labeled. The same number should not appear in two places without a clear reason.

## Counting Model

Events in `events.txt` carry a type tag per performer: `[C]` (full concert) or `[MC]` (mini-concert). The definitions are:
- **[C]** — full concert: at least 6 songs *or* at least 30 minutes
- **[MC]** — mini-concert: 5 or fewer songs *and* under 30 minutes
- The two are mutually exclusive and exhaustive — every tagged performance is one or the other. Tagged per performer, so one event can have a mix.

**Open question — event vs performance:** Is one event with two performers one concert or two? "Concert/keikka" is ambiguous in both English and Finnish — it can mean the event as a whole or an individual performer's set. "Event/tapahtuma" is more clearly event-level but feels clinical for a gig list. The app currently mixes both framings in different places. This is a known unresolved tension; see TODO for the related UI work.

## Architecture

- Fully static SPA — no backend required
- Everything under `spa/`: `index.html`, JS/CSS assets, and event data
- Alpine.js (vendored locally) for UI reactivity
- Event parsing and stats computation in vanilla JS

## File Structure

```
spa/
  index.html              # The SPA
  events.txt              # Real event data (gitignored — deployed separately)
  events-sample.txt       # Sample data for testing / fallback when events.txt absent
  static/
    app.js                # Event parsing, stats computation, Alpine app component
    strings.js            # Localised UI strings (English + Finnish)
    style.css             # Styling
    favicon.ico           # Favicon
    favicon.svg           # Favicon source (SVG)
    vendor/
      alpine-3.15.8.min.js  # Vendored Alpine.js
```

## UI Layout

Single page. Header at top, then a two-column layout on desktop (left: listing, right: stats); single-column stacked layout on mobile.

**Header** — title, total event counts, mini-concert definition legend, language toggle, "Generated with" link (hidden on mobile, moved to footer).

**Left column (desktop) / top section (mobile):**
- Search box (always visible; sticky at top when scrolling)
- Stats summary block (mobile only — duplicate of the desktop right-column summary, positioned above the toolbar so key numbers are immediately visible without scrolling)
- Listing toolbar — event count (with mini badge), mini-concert toggle, sort order toggle
- Collapsible event list — events newest first by default; collapse toggle is mobile-only (chevron on the toolbar count)

**Right column (desktop) / bottom section (mobile):**
- Stats summary block — events (full/mini), performances (full/mini), unique performers, years active
- Stats sections (each collapsible): by year, by venue, by performer — each table has sortable columns

Both listing and stats react live to the current search filter.

## Responsive Design

- **Breakpoint:** `max-width: 768px`
- **Desktop:** two-column layout; columns scroll independently; page itself does not scroll
- **Mobile:** single-column; page scrolls naturally; stats summary is duplicated above the listing toolbar for immediate visibility; stats sections stack below the event listing
- **Collapsible listing (mobile only):** the event count in the toolbar acts as a collapse toggle (chevron indicator); allows reaching the stats sections without scrolling past hundreds of events
- **Scroll-to-top button:** on desktop, scrolls the left column; on mobile, scrolls the page (`window`)

## Data Flow

1. On load, fetch `events.txt` via HTTP; fall back to `events-sample.txt` if not found (404)
2. Parse into structured event objects
3. Alpine.js reactive state holds: all events, current filter query, UI toggles
4. Listing and all stats are computed reactively from the filtered event list

## Event Object Structure

```js
{
  date: "24.5.1992",
  year: 1992,
  eventName: "Festival Name" | null,
  performers: [
    { name: "Performer A", type: "C", detail: "acoustic" | null },
    { name: "Performer B", type: "MC", detail: null }
  ],
  venue: "Venue, City, Country",
  comment: "2 days" | "(1)" | null,  // trailing parenthesized note after venue
  type: "C" | "MC" | null,
  raw: "original line text"
}
```

## Filtering

Single search box with broad matching across performer/event names, venue, and year. All words must match (AND logic). Debounced (~200ms) to avoid recomputing stats on every keystroke.

- **Substring match** by default; case-insensitive
- **Quoted phrases** (`"maija vilkkumaa"`) match the exact phrase
- **Search mode classification:** each search word is independently classified as performer, venue, year, or event match; the classification is shown as a label in the toolbar (e.g. "esiintyjä · paikka") and used to highlight matched performer names in the listing and emphasise the relevant summary row

## Statistics

Computed reactively from the filtered event list:

- **Summary block** — events (full/mini), performances (sum of all individual performer C/MC counts — can exceed event count for multi-performer events), unique performers, years active
- **By year** — event counts per year (full/mini), sortable
- **By venue** — event counts per venue (full/mini), sortable
- **By performer** — concert counts per performer (full/mini), sortable
- Each stats section is individually collapsible

The underlying data should match `gigcount.py` output. The web presentation is not bound by gigcount's text format and should take advantage of the web medium (tables, sorting, future charts).

## Localisation

English and Finnish are supported. All UI strings are in `spa/static/strings.js`.

- Language defaults to Finnish if `navigator.language` starts with `'fi'`, otherwise English
- The user can toggle between languages via a button in the header
- The choice is persisted in `localStorage`
- The `t` computed property on the Alpine component returns the current language's strings object, so templates and JS code always use `t.key` without branching on language
- Dynamic strings (those containing counts) are functions; static strings are plain values

## Deployment

Fully static — can be served from any static file host with no server-side logic.

- `events.txt` is gitignored; real data is deployed separately from code. The repo is public, so real event data must never be committed.
- The app fetches `events.txt` on load; if not found (404), falls back to `events-sample.txt`. This fallback is useful for local development and testing; it is an acceptable convenience at this project's scope, not a production-grade feature.
- The `events.txt` path is currently hardcoded to the same directory as `index.html`. Making it configurable (e.g. via query parameter) is a future option tracked in TODO.

## CLI Tool (gigcount.py)

Standalone Python script for generating concert statistics from `events.txt`. Predates the web app and serves as the reference implementation for parsing and stats logic.

- Parses `events.txt` using the same format spec (FORMAT.md)
- Outputs per-performer and per-year concert counts
- Format: `N (M)` where N = full concerts, M = mini-concerts
- No planned major changes — the web app is the focus
- The JS parser is a separate implementation of the same format; some divergence is an accepted tradeoff. The web app's stats output should match gigcount.py's for validation.

## Development

Local testing:
```bash
cd spa && python3 -m http.server
# then open http://localhost:8000
```
