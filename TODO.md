# TODO

## Open — Priority

- [x] **Britannia data issue**: fixed in data — `Britannia (Kannelmäki)` → `Britannia Kannelmäki`, `Britannia (Espoontori)` → `Britannia Espoontori` (district as part of compound name, no parens); `Cafe Segeli (1), Kotka` → `Cafe Segeli, Kotka (1)` (comment moved to end per format spec).

- [x] **Try mini toggle off by default**: currently `showMinis` initialises to `true` in `app.js`; flip it to `false` so the first-load view shows full concerts only, with minis opt-in. The "missing data" concern is weak: a visitor wouldn't know about minis, wouldn't necessarily care, and the primary message is full concerts anyway — all three factors point the same way. Also update the toggle label from the current bare noun (`'mini-concerts'` / `'minikeikat'`) to something that reads naturally when the checkbox is unchecked: EN → `'include mini-concerts'`; FI → something like `'myös minikeikat'` ("mini-concerts too") — `'sisällytä minikeikat'` is semantically exact but awkward; needs native-feel phrasing. Try `'myös minikeikat'` and see how it reads in context.

- [x] **Mini-concert checkbox placement** (holistic rethink): on mobile, moved inline with the search input (same row, search box left, checkbox right); on desktop stays below the search input. Label "include mini-concerts" / "myös minikeikat" on desktop; "include minis" / "myös minikeikat" on mobile.

- [x] **Three-counts problem** (mobile, main open issue): When the app loads on mobile with no search active, the concert count appears in three places: (1) header "N concerts, M performances", (2) summary block "Concerts" row, (3) collapse button in toolbar "N concerts ▾". The original plan removed the toolbar count in favour of the summary block, but evaluation showed users need the count immediately above the listing — the summary block is too far from the list and right-aligns numbers. Toolbar count was restored, reintroducing the triplication. Needs a design solution that provides the count visually above the listing without repeating it three times. Desktop layout remapping should wait until this is resolved.

  **Old notes (count/numbers confusion):** When the app loads on mobile with no search active, a user can read three different numbers that each plausibly answer "how many concerts have you been to?" — and they give different answers. Concretely:
  - **Header** (`counts` getter): grand total, unfiltered, uses raw `event.type === 'C'` count. Always reflects all data, ignores current search.
  - **Summary block "Events" row + toolbar** (both use `fmtCountsHtml(filteredEvents)`): C-type events *minus* "miniOnlyC" events — i.e. C-typed events where every single performer is [MC]. Those are rolled into the mini badge count because they vanish when the mini toggle is off. So this number equals "events visible when mini is hidden."
  - **Summary block "Performances" row** (`performanceCounts`): sum of individual performer [C]/[MC] counts across all events. A 2-performer event contributes 2 to this total. Can substantially exceed event count.
  - Result: even with no search active, header and summary Events row can show different numbers for "full concerts" (miniOnlyC edge case), and the Performances row is a third answer entirely.

  **The root definitional problem:** the app has never resolved whether a "concert/keikka" is (a) an *event* — one row in events.txt regardless of how many performers, or (b) a *performance* — one performer's set, so a 2-act event yields 2 "concerts." This ambiguity exists in both languages: English "concert" and Finnish "keikka" are both fluid and can refer to either. The more event-centric words ("event" in English, "tapahtuma" in Finnish) are clearer but feel overly clinical for a gig list. There may also be language-specific nuances beyond the shared ambiguity. The stats and listing currently mix both framings silently.

  **The MC complication:** A [C]-typed event where every performer is [MC] sits in a grey zone — it's typed as a concert at event level, but the fmtCountsHtml logic treats it like a mini for display purposes. An event with one [C] and one [MC] performer is another grey case: event is [C], but performer counts would be "1 full + 1 mini".

  **What a confused user sees on mobile on first load:** the header says one number, the summary block says a smaller number (minus miniOnlyC) just below the search box, and the toolbar repeats that second number with the word "events/tapahtumaa." Someone not familiar with the data model would reasonably ask: "why are there two different totals before I've done anything?"

  **Audience context:** Primary user is the owner — knows the data, knows the definitions, will learn UI conventions. Secondary user is a curious visitor — no prior knowledge of the data or [C]/[MC] definitions, reads only from general language and what the UI says. Optimise for the owner; don't actively confuse the visitor. This means rich detail is fine, but labels and hierarchy must be legible enough that a visitor isn't left baffled.

  **User intent (important design constraint):** The owner is a "number nerd" — a single number won't do. The [C]/[MC] distinction is intentional and meaningful: full concerts are "real concerts" with a clear definition, minis are worth remembering and tracking but don't count the same way. So the goal is NOT to collapse everything into one number, but to present the breakdown in a way that is immediately readable and doesn't create confusion about what each number means. The primary headline number should be full [C] concerts; minis are secondary/supplementary. Note: the event-vs-performance question (is one event with 2 performers 1 concert or 2?) is still unresolved — that tension remains open alongside the display issue.

  Options to explore:
  - **Mini toggle off by default**: the app currently starts with minis shown; flipping the default would mean the first number a user sees is already the "full concerts only" count — simple, no UI changes needed, and aligns with the primary use case
  - **Clear visual hierarchy**: full concert count is the primary/prominent number; mini count is secondary (smaller, muted, labeled) — not hidden, but clearly subordinate
  - **Consistent labeling throughout**: every count display uses the same label conventions so the user learns them once and they apply everywhere
  - **Consolidate display roles** — header = grand totals (unfiltered, labeled); toolbar = current filter result count; summary block = the authoritative breakdown with clear labels; no location shows the same number unlabeled twice
  - **Progressive disclosure** — leads with the clear headline count, secondary breakdown available but not in the way on first glance
  - Whatever the solution: must stay compact on mobile, must not require inline explanations, and must not change the underlying data model (only presentation).

## Open — Nice to have

- [ ] **Mobile header: version tag at right edge of header bottom** — try moving the version tag (e.g. "v16") so it sits at the right edge of the header's bottom row (same row as the language toggle), instead of below the language toggle. On desktop: no change. This matches the desktop pattern (version at top-right edge) but with shorter text — just the version tag, no home link.

- [ ] **Hostname-based default locale** — derive the initial language from the hostname before falling back to `navigator.language`. Priority order: (1) `localStorage` (explicit user choice), (2) hostname: `keikat.*` → `fi`, `gigs.*` → `en`, (3) `navigator.language`, (4) `en`. One-liner change in `app.js:150` (`lang:` initialiser). Rationale: `keikat.wizzu.com` is naturally Finnish-first, `gigs.wizzu.com` English-first; anyone else deploying from the public repo gets the existing browser-locale fallback.

- [ ] **Search: match in event names (festival/event prefix)** — The search haystack currently covers date, performer names, and venue; it does not include the `eventName` prefix (e.g. "Ruisrock" in "Ruisrock: The Beautiful South"). Searching "Ruisrock" should find those events.

  **Corner case — year + festival name collision:** A year search like "2006" will match (a) the date field of every concert from 2006, and (b) any event whose name contains "2006" (e.g. "Ankkarock 2006"). The current multi-category logic would see both a *year* match and an *event name* match and flag it as a mixed result with a warning. But "Ankkarock 2006" was held in 2006, so the two categories are hitting the same set of concerts for the same underlying reason — this is not worth a warning.

  **Suppression logic:** only raise the mixed-category warning when different categories produce *different* sets of matching concerts. If all concerts matched by category A are also matched by category B (i.e. the sets are equal or one is a subset of the other), treat it as a single-category match. This is the general rule; the festival-year case is just one instance of it.

  Implementation note: the current `searchModeLabel` / `searchModeMixed` logic classifies each query *term* independently and OR-joins the categories. The suppression requires comparing matched-concert sets per category, which needs a different structure — compute per-category match sets first, then determine which categories contributed unique results.

- [ ] Flesh out CLAUDE.md: project structure, conventions, verification steps (interview user and/or propose defaults once web app work begins)
- [ ] Dark mode — design and implement a dark theme (CSS custom properties are a natural fit), then add a manual toggle; optionally respect `prefers-color-scheme` as the default
- [ ] Consider moving event comments like "(1)", "(2)" to display after the performer name rather than after the venue/location (currently shown at end of location line, after any mini badge) — it may read more naturally as disambiguation of the performer context. Explored but unresolved: `event-title` uses `flex-direction: column` to stack performers vertically, so a comment span added as a sibling ends up on its own line. Could be placed inside the last performer's span (using `pi === event.performers.length - 1`) to appear inline — works cleanly for the common single-performer case, but feels semantically off for multi-performer events since the comment is event-level, not tied to a specific performer.
- [ ] Rich statistics visualizations (bar charts, graphs, etc.)
- [ ] Mobile toolbar: retry right-aligning the mini-toggle checkbox so it shares the same right edge as the sort button. Multiple CSS approaches (flex column with align-items, grid with justify-self, display: block on label) all failed silently in Chrome narrow-window testing. Use devtools to inspect what display/justify-self values are actually computed on the label element before attempting another fix. *(superseded by the holistic rethink above — keep for reference)*
- [ ] Stats count column alignment — the summary block (dl) right-aligns its count column, but the stats tables (by year, by location, performers) have a fixed-width count column where numbers are left-aligned within it. These should match visually. Low priority, cosmetic only.
- [ ] Allow configuring the events data URL — e.g. via a query parameter or config file, so the data file can be loaded from an arbitrary URL rather than only the local directory
- [ ] Show notice when using sample data: when the app falls back to `events-sample.txt` (because `events.txt` was not found), show a prominent notice so it's clear the data shown is not real. The notice should be invisible in normal use — ideally a banner element that exists in the HTML but is hidden by default and only shown when sample data is active. Requires adding a boolean `usingSample` state variable in `app.js` (set to `true` on the fallback fetch path) and an `x-show="usingSample"` banner element near or below the header. Minimal extra logic and markup.
- [ ] Add a test suite for gigcount.py — at minimum, compare gigcount.py output against the JS parser/stats to catch divergence between the two implementations
- [ ] **Search keyword "mini"**: when mini-concerts are enabled (checkbox on), searching for "mini" should show only mini-concert events/performers rather than treating it as a regular text search. If mini-concerts are disabled, "mini" falls through to regular search. Special-case handling.
- [ ] **Mobile: "Top" button overlaps footer homelink** — when scrolled all the way to the bottom, the fixed-position "Top" scroll button partially covers the `eventslist` homelink in the footer. Low priority, cosmetic only.
- [x] **Venue text breaks mid-word on narrow screens** — e.g. "Tapiolasali, Espoon kulttuurike-" / "skus". Likely caused by `word-break: break-all` (or `overflow-wrap: anywhere`) on the venue element; fix by switching to `overflow-wrap: break-word`, which only breaks mid-word as a last resort when the whole word won't fit on any line.

## Completed

- [x] Project scaffolding (CLAUDE.md, README, .gitignore, TODO)
- [x] Define and document the event line format (FORMAT.md)
- [x] Design document (DESIGN.md)
- [x] Get gigcount.py into the repo
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
- [x] Extract trailing `(comment)` after location as a separate `comment` field — currently swallowed into the location string. Used for show number disambiguation e.g. `(1)`, `(2)`, and possibly other notes. Needs regex care (performer parens are in description, not location). Update FORMAT.md and gigcount.py too.
- [x] Review JS and CSS for missing comments — add concise explanations for non-obvious patterns (Alpine directives, flex/layout tricks, regex, reactive getters). Skip obvious things. Aimed at someone learning the stack.
- [x] Debounce search input (~200ms) to avoid recomputing all reactive getters on every keystroke; consider deferring only the stats panel (option 3) if the event list alone is fast enough. If the debounce delay is perceptible, add a visual in-progress indicator on the search box or stats panel (e.g. subtle animation or dimming) so the user knows results are updating.
- [x] Localisation support — English/Finnish UI strings
- [x] Listing toolbar alignment: when the count line wraps to multiple lines (common in Finnish with search active), the sort button loses its bottom-alignment and a gap appears. Fix vertical alignment of toolbar items (desktop + mobile).
- [x] Mixed-type search results: when a query matches across multiple categories (performer + venue, or performer + year, etc.), the current mode label just lists all types (e.g. "esiintyjä · paikka") but this isn't very prominent. Consider a clearer UI signal that results are mixed — the user may not have intended this.
- [x] Evaluate making the search box sticky at the top of the left column when scrolling the event list.
- [x] Add a "scroll to top" button on the left column — always visible, scrolls the event list back to the top; disabled (or hidden) when already at the top / list fits in view.
- [x] Show per-performer detail comment (e.g. "acoustic" from "Fish (acoustic)") in the event listing, one line per performer. Display it in muted colour similar to the event name prefix, before the mini badge if present.
- [x] Add a toggle to show/hide mini performances — hides MC-tagged performers/performances from the listing and excludes them from stats (not the whole event, just the MC performances within it). Consider a checkbox or small toggle button near the search box or stats panel.
- [x] Add a small, non-prominent "Generated with [eventslist](github repo url)" link, e.g. top-right corner, very small text
- [x] Column sorting for stats tables (By Year, By Location, Performers) — click column header to sort; counts always desc, location/name always asc, year toggles asc/desc
- [x] Revisit stats table sort UI — experiment with static column header text and separate sort controls (current button-in-header approach works but aesthetics are uncertain)
- [x] Search mode label (in toolbar, next to event count) — it's unclear to users that the label describes how the search words were classified. Consider a prefix like "match:" or a tooltip, or a different placement/presentation. Any solution must not cause the event list to jump when the label appears/disappears.
- [x] Leverage searchMode to enrich the UI: highlight matched performers, search mode indicator near the search box, emphasise the relevant summary block row based on search mode
- [x] Add a favicon (currently causes a 404 in the browser console)
- [x] Sort order toggle (newest/oldest first)
- [x] Event count in listing toolbar shows e.g. "1864 (41) events" — add the "mini" pill badge to the (41) part, consistent with how mini counts appear in the stats panel and summary block.
- [x] Mini-concert checkbox should appear visually greyed out (disabled-looking) when the current search results contain no mini-concerts, since the toggle has no effect in that case.
- [x] "mini" pill badge and sort buttons look too similar — both have a border and small text, making the badge look clickable. Differentiate them visually; one direction is giving the sort buttons a subtle tint/colour so buttons look interactive and the badge looks like a label.
- [x] Make stats sections (by year, by location, performers) individually collapsible — minimal UI clutter but clearly signalled. Relevant for mobile where vertical space is scarce.
- [x] MC indicator in event listing — mini-concerts should be visually indicated (full concert is implied); avoid showing raw [C]/[MC] tags; consider inline badge/label rather than a separate column. Add a legend for the stats table headers too.
- [x] Scroll-to-top on mobile — fixed: window scroll listener sets `scrolled`; button uses `position:fixed` on mobile so it stays visible across both columns; click scrolls `window` on mobile vs `.left-col` on desktop.
- [x] Configurable events.txt path — fetch `events.txt` first, fall back to `events-sample.txt` if not found (404); add `events.txt` to `.gitignore` so real data can be deployed separately from code; rename `spa/events.txt` → `spa/events-sample.txt` in the repo
- [x] Investigate search clear button debounce — no bug found; the clear path bypasses debounce correctly.
- [x] Quoted/exact search — e.g. `"maija vilkkumaa"` or `"awa"` should match the exact phrase/word rather than substrings.
- [x] Collapsed section visual hint — when a stats section or the event listing is collapsed, show a subtle indicator (e.g. "· · ·", muted row count, dotted line) to signal hidden content.
- [x] "A + B" performer display bug — fixed: comma separates independent performers, + means joint billing (one listing entry, counted separately in stats)
- [x] Decide on "venue" vs "location" terminology — standardized on "venue" everywhere.
- [x] "Events" header vertical alignment — on mobile when the second half of the header wraps to 4 lines, the header sits flush at the bottom. Prefer vertically centered or top-aligned.
- [x] Single-column mobile layout — breakpoint at 768px; page scrolls naturally; stats panel stacks below listing. Collapsible event listing with chevron (mobile only); event count styled as section heading on mobile.
- [x] gigcount.py in the repo
- [x] Ensure gigcount.py works standalone with current events.txt
