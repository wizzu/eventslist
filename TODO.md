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
- [x] Add a command/script to update vendored Alpine.js to the latest release
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
- [x] Confirm stats match gigcount.py output (validation step)

## Data / Format Issues
- [ ] "Britannia (Espoontori)" and "Britannia (Kannelmäki)" are the same pub chain in different districts — currently parsed as one venue due to comment-stripping. Need to decide how to represent chain venues with district in the data format without conflicting with the trailing (comment) syntax. Address together with the "Cafe Segeli (1), Kotka" case where a show-number comment appears mid-location rather than at the end — fix in the data file at the same time.

## Parser / Format
- [x] Extract trailing `(comment)` after location as a separate `comment` field — currently swallowed into the location string. Used for show number disambiguation e.g. `(1)`, `(2)`, and possibly other notes. Needs regex care (performer parens are in description, not location). Update FORMAT.md and gigcount.py too.

## Code Quality
- [x] Review JS and CSS for missing comments — add concise explanations for non-obvious patterns (Alpine directives, flex/layout tricks, regex, reactive getters). Skip obvious things. Aimed at someone learning the stack.

## Performance
- [x] Debounce search input (~200ms) to avoid recomputing all reactive getters on every keystroke; consider deferring only the stats panel (option 3) if the event list alone is fast enough. If the debounce delay is perceptible, add a visual in-progress indicator on the search box or stats panel (e.g. subtle animation or dimming) so the user knows results are updating.

## Future / Nice-to-have
- [x] Localisation support — English/Finnish UI strings
- [ ] Listing toolbar alignment: when the count line wraps to multiple lines (common in Finnish with search active), the sort button loses its bottom-alignment and a gap appears. Fix vertical alignment of toolbar items.
- [ ] Mixed-type search results: when a query matches across multiple categories (performer + venue, or performer + year, etc.), the current mode label just lists all types (e.g. "esiintyjä · paikka") but this isn't very prominent. Consider a clearer UI signal that results are mixed — the user may not have intended this.
- [ ] Dark mode — design and implement a dark theme (CSS custom properties are a natural fit), then add a manual toggle; optionally respect `prefers-color-scheme` as the default
- [x] Evaluate making the search box sticky at the top of the left column when scrolling the event list.
- [x] Add a "scroll to top" button on the left column — always visible, scrolls the event list back to the top; disabled (or hidden) when already at the top / list fits in view.
- [x] Show per-performer detail comment (e.g. "acoustic" from "Fish (acoustic)") in the event listing, one line per performer. Display it in muted colour similar to the event name prefix, before the mini badge if present.
- [x] Add a toggle to show/hide mini performances — hides MC-tagged performers/performances from the listing and excludes them from stats (not the whole event, just the MC performances within it). Consider a checkbox or small toggle button near the search box or stats panel.
- [x] Add a small, non-prominent "Generated with [eventslist](github repo url)" link, e.g. top-right corner, very small text
- [x] Column sorting for stats tables (By Year, By Location, Performers) — click column header to sort; counts always desc, location/name always asc, year toggles asc/desc
- [x] Revisit stats table sort UI — experiment with static column header text and separate sort controls (current button-in-header approach works but aesthetics are uncertain)
- [x] Search mode label (in toolbar, next to event count) — it's unclear to users that the label describes how the search words were classified. Consider a prefix like "match:" or a tooltip, or a different placement/presentation. Any solution must not cause the event list to jump when the label appears/disappears.
- [x] Leverage searchMode to enrich the UI:
  - [x] Highlight matched performers in the event list (bold/colour matching names within each event title row)
  - [x] Search mode indicator near the search box showing how the query was interpreted (performer / venue / year / mixed — e.g. "Maija 2006" matched both performer and year)
  - [x] Emphasise the relevant summary block row based on search mode (Performances row for performer searches, Events row for others)
- [x] Add a favicon (currently causes a 404 in the browser console)
- [x] Sort order toggle (newest/oldest first)
- [x] Event count in listing toolbar shows e.g. "1864 (41) events" — add the "mini" pill badge to the (41) part, consistent with how mini counts appear in the stats panel and summary block.
- [x] Mini-concert checkbox should appear visually greyed out (disabled-looking) when the current search results contain no mini-concerts, since the toggle has no effect in that case.
- [x] "mini" pill badge and sort buttons look too similar — both have a border and small text, making the badge look clickable. Differentiate them visually; one direction is giving the sort buttons a subtle tint/colour so buttons look interactive and the badge looks like a label.
- [x] Make stats sections (by year, by location, performers) individually collapsible — minimal UI clutter but clearly signalled. Relevant for mobile where vertical space is scarce.
- [ ] Consider moving event comments like "(1)", "(2)" to display after the performer name rather than after the venue/location (currently shown at end of location line, after any mini badge) — it may read more naturally as disambiguation of the performer context. Explored but unresolved: `event-title` uses `flex-direction: column` to stack performers vertically, so a comment span added as a sibling ends up on its own line. Could be placed inside the last performer's span (using `pi === event.performers.length - 1`) to appear inline — works cleanly for the common single-performer case, but feels semantically off for multi-performer events since the comment is event-level, not tied to a specific performer.
- [x] MC indicator in event listing — mini-concerts should be visually indicated (full concert is implied); avoid showing raw [C]/[MC] tags; consider inline badge/label rather than a separate column. Add a legend for the stats table headers too.
- [ ] Scroll-to-top on mobile — currently the button stays hidden on mobile because scroll is detected on `.left-col` (which doesn't scroll when the page scrolls). Fix: listen to `window` scroll instead of, or in addition to, the column. Deferred from responsive design work.
- [ ] Rich statistics visualizations (bar charts, graphs, etc.)
- [x] Configurable events.txt path — fetch `events.txt` first, fall back to `events-sample.txt` if not found (404); add `events.txt` to `.gitignore` so real data can be deployed separately from code; rename `spa/events.txt` → `spa/events-sample.txt` in the repo
- [ ] Mobile toolbar: retry right-aligning the mini-toggle checkbox so it shares the same right edge as the sort button. Multiple CSS approaches (flex column with align-items, grid with justify-self, display: block on label) all failed silently in Chrome narrow-window testing. Use devtools to inspect what display/justify-self values are actually computed on the label element before attempting another fix.
- [ ] Stats count column alignment — the summary block (dl) right-aligns its count column, but the stats tables (by year, by location, performers) have a fixed-width count column where numbers are left-aligned within it. These should match visually. Low priority, cosmetic only.
- [x] Investigate search clear button debounce — investigated: no debounce bug. The clear path bypasses debounce correctly. Any visible delay after clearing is Alpine re-rendering the full event list (~1800+ rows), not a debounce issue. No fix needed.
- [x] Quoted/exact search — e.g. `"maija vilkkumaa"` or `"awa"` should match the exact phrase/word rather than substrings. Semantics to be decided: quoted phrases for multi-word exact match, or whole-word-only toggle, or both.
- [x] Collapsed section visual hint — when a stats section (by year, by location, performers) or the event listing is collapsed, show a subtle indicator in place of the hidden content to signal there's more. Could be a faint text hint like "· · ·", a muted row count ("42 rows hidden"), a thin dotted/dashed line, or a low-contrast placeholder block. Goal: immediately obvious that content is hidden, without taking much space or drawing too much attention.
- [ ] Allow configuring the events data URL — e.g. via a query parameter or config file, so the data file can be loaded from an arbitrary URL rather than only the local directory
- [x] "A + B" performer display bug — fixed: comma separates independent performers, + means joint billing (one listing entry, counted separately in stats)
- [x] Decide on "venue" vs "location" terminology — standardized on "venue" everywhere.

## Responsive Design
See `PLAN-responsive.md` for detailed implementation plan and progress tracking.

- [ ] "Events" header vertical alignment — on mobile when the second half of the header wraps to 4 lines, the header sits flush at the bottom. Prefer vertically centered or top-aligned. On desktop it looks good but the same alignment tweak could be applied there too for a subtle improvement.
- [x] Single-column mobile layout — breakpoint at 768px; page scrolls naturally; stats panel stacks below listing. Collapsible event listing with chevron (mobile only); event count styled as section heading on mobile. Collapse only active on mobile (`isMobile` state); widens back to desktop uncolllapses automatically.

## CLI
- [x] gigcount.py in the repo
- [x] Ensure gigcount.py works standalone with current events.txt
- [ ] Add a test suite — at minimum, compare gigcount.py output against the JS parser/stats to catch divergence between the two implementations
