# TODO

## Setup
- [x] Project scaffolding (CLAUDE.md, README, .gitignore, TODO)
- [x] Define and document the event line format (FORMAT.md)
- [x] Design document (DESIGN.md)
- [x] Get gigcount.py into the repo
- [ ] Flesh out CLAUDE.md: project structure, conventions, verification steps (interview user and/or propose defaults once web app work begins)

## Web App — Implementation
Steps are intentionally small to facilitate incremental learning alongside building.

- [x] Vendor Alpine.js locally (spa/vendor/alpine-3.15.8.min.js)
- [ ] Add a command/script to update vendored Alpine.js to the latest release
- [x] Minimal `index.html` shell — boilerplate, load Alpine.js + CSS + JS, static placeholder content
- [x] Base CSS — page layout structure (header, main area), basic visual skeleton
- [x] Wire up Alpine.js — `x-data` on the app root, confirm reactivity works with a simple test
- [x] Fetch `events.txt` on load — read the file via HTTP, log raw text to confirm it works
- [x] JS parser — parse raw text into event objects (based on FORMAT.md)
- [x] Event listing view — render parsed events with `x-for`, newest first
- [x] Filter out non-concert events (type === null) — SPA is gigs-only, no UI toggle needed
- [x] Search/filter box — `x-model` input, filter the event list reactively
- [x] Header summary counts — total events, filtered count
- [x] Header counts should always show totals only; move filtered counts to the stats panel (above the performer table)
- [x] Two-column layout — left: search + scrollable listing (65%), right: sticky stats panel (35%)
- [x] Statistics view — performer counts table, by-year table, by-location table; all react to search filter
- [x] Per-year counts table
- [ ] Confirm stats match gigcount.py output (validation step)

## Data / Format Issues
- [ ] "Britannia (Espoontori)" and "Britannia (Kannelmäki)" are the same pub chain in different districts — currently parsed as one venue due to comment-stripping. Need to decide how to represent chain venues with district in the data format without conflicting with the trailing (comment) syntax.

## Parser / Format
- [ ] Extract trailing `(comment)` after location as a separate `comment` field — currently swallowed into the location string. Used for show number disambiguation e.g. `(1)`, `(2)`, and possibly other notes. Needs regex care (performer parens are in description, not location). Update FORMAT.md and gigcount.py too.

## Code Quality
- [ ] Review JS and CSS for missing comments — add concise explanations for non-obvious patterns (Alpine directives, flex/layout tricks, regex, reactive getters). Skip obvious things. Aimed at someone learning the stack.

## Performance
- [ ] Debounce search input (~200ms) to avoid recomputing all reactive getters on every keystroke; consider deferring only the stats panel (option 3) if the event list alone is fast enough. If the debounce delay is perceptible, add a visual in-progress indicator on the search box or stats panel (e.g. subtle animation or dimming) so the user knows results are updating.

## Future / Nice-to-have
- [ ] Add a small, non-prominent "Generated with [eventslist](github repo url)" link, e.g. top-right corner, very small text
- [ ] Column sorting for stats tables (By Year, By Location, Performers) — click column header to sort by name/count; count column sorts as a single value (C+MC combined or C-primary/MC-secondary as currently); ascending only is probably sufficient; event listing doesn't need alternate sort orders
- [ ] Leverage searchMode to enrich the UI:
  - [ ] Highlight matched performers in the event list (bold/colour matching names within each event title row)
  - [ ] Search mode indicator near the search box showing how the query was interpreted (performer / venue / year / mixed — e.g. "Maija 2006" matched both performer and year)
  - [ ] Emphasise the relevant summary block row based on search mode (Performances row for performer searches, Events row for others)
- [x] Add a favicon (currently causes a 404 in the browser console)
- [ ] Sort order toggle (newest/oldest first)
- [ ] Evaluate listing + stats as dual/split view vs toggle
- [ ] MC indicator in event listing — mini-concerts should be visually indicated (full concert is implied); avoid showing raw [C]/[MC] tags; consider inline badge/label rather than a separate column. Add a legend for the stats table headers too.
- [ ] Rich statistics visualizations (bar charts, graphs, etc.)
- [ ] Responsive design
- [ ] Configurable events.txt path

## CLI
- [x] gigcount.py in the repo
- [ ] Ensure gigcount.py works standalone with current events.txt
