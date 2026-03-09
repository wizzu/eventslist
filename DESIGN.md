# Design

This document captures the current design approach. It is not set in stone — it can change based on features, UI needs, or other concerns from implementation work or otherwise.

## Architecture

- Fully static SPA — no backend required
- Everything under `spa/`: `index.html`, JS/CSS assets, and `events.txt`
- Alpine.js (vendored locally) for UI reactivity
- Event parsing and stats computation in vanilla JS

## File Structure

```
spa/
  index.html            # The SPA
  events.txt            # Event data
  static/
    app.js              # Event parsing, stats computation, app logic
    style.css           # Styling
    vendor/
      alpine-3.15.8.min.js  # Vendored Alpine.js
```

## UI Layout

Single page with:
- **Header** — title, summary counts
- **Search box** — single input, filters as you type (matches performer/event names, location, year)
- **Listing view** — events displayed newest first by default (note: events.txt itself is ordered oldest-first)
- **Statistics view** — performer counts and yearly counts (mirrors gigcount.py output)
- Both views respect the current filter
- Listing and statistics could be shown as a toggle (switch between views) or as a dual/split view — to be evaluated during implementation

## Data Flow

1. On load, fetch `events.txt` via HTTP
2. Parse into structured event objects
3. Alpine.js reactive state holds: all events, current filter, derived filtered list
4. Listing and stats views are computed from the filtered list

## Event Object Structure

```js
{
  date: "24.5.1992",
  year: 1992,
  eventName: "Festival Name" | null,
  performers: [
    { name: "Performer A", type: "C" },
    { name: "Performer B", type: "MC" }
  ],
  location: "Venue, City, Country",
  comment: "2 days" | "(1)" | null,  // trailing parenthesized note after location (not yet parsed)
  type: "C" | "MC" | null,
  raw: "original line text"
}
```

## Filtering

Single search box with broad matching across:
- Performer/event names
- Location/venue
- Year (e.g. typing "2005" matches events from 2005)

Case-insensitive substring match. More structured filtering can be added later.

## Statistics

Computed from the (filtered) event list:
- **Per-performer counts** — full concerts and mini-concerts, sorted by count descending
- **Per-year counts** — gigs, mini-gigs, other events
- **Totals**

The underlying data should match gigcount.py, but the presentation should take advantage of the web UI — initially as formatted text/tables, with richer visualizations (charts, graphs, etc.) as a future direction.

## CLI Tool (gigcount.py)

Standalone Python script for generating concert statistics from events.txt. Predates the web app and serves as the reference implementation for parsing and stats logic.

- Parses events.txt using the same format spec (FORMAT.md)
- Outputs per-performer concert counts (sorted by count descending)
- Outputs per-year concert counts and totals
- Format: `N (M)` where N = full concerts, M = mini-concerts
- No planned major changes initially — the web app is the focus
- The JS parser should produce equivalent statistical data to gigcount.py for validation
- The web app's presentation of stats is not bound by gigcount.py's text output format — it should take advantage of the web medium

## Development

Local testing:
```bash
cd spa && python3 -m http.server
# then open http://localhost:8000
```

The `events.txt` path defaults to the same directory as `index.html`. This can be made configurable for deployment flexibility.
