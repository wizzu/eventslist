// ---- Parser ----
// Keep in sync with gigcount.py

// Matches a full event line. Permissive about text content to support Unicode.
// Groups: (1) full date, (2) year, (3) description (performers or event desc),
//         (4) venue, (5) " [C]" or " [MC]" (optional).
// Venue explicitly excludes "[" so it can't accidentally consume the type tag.
const LINE_RE = /^([\d?]{1,3}\.[\d?]{1,2}\.(\d{4}))\s+(.+); ([^\[]+)( \[M?C\])?$/;

// Split performers on comma, but NOT inside parentheses.
// e.g. "Fish (with band), Opeth" → ["Fish (with band)", "Opeth"]
// The negative lookahead (?![^()]*\)) means: don't split if inside parentheses.
const COMMA_SPLIT_RE = /,\s+(?![^()]*\))/;

// Split joint-billed performers on +, but NOT inside parentheses.
// "A + B" means they performed together — shown as one listing entry, counted separately in stats.
const JOINT_SPLIT_RE = /\+\s+(?![^()]*\))/;

// Parse a search query into term tokens, respecting double-quoted phrases.
// Returns an array of { text, exact, re }:
//   exact: true  → quoted term, matched as a whole word/phrase (word-boundary regex)
//   exact: false → plain word, matched as a case-insensitive substring
// Regex uses lookbehind/lookahead instead of \b so non-ASCII letters (ä, ö, …) work.
function parseQuery(query) {
  const terms = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m;
  while ((m = re.exec(query)) !== null) {
    const exact = m[1] !== undefined;
    // Strip stray quotes from plain tokens (e.g. mid-typing "abc or abc") so they
    // fall back to plain substring matching rather than silently matching nothing.
    const text = (exact ? m[1] : m[2].replace(/^"|"$/g, '')).toLowerCase();
    if (!text) continue;
    const regex = exact
      ? new RegExp('(?<![a-zA-Z0-9\u00C0-\u024F])' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-zA-Z0-9\u00C0-\u024F])', 'i')
      : null;
    terms.push({ text, exact, regex });
  }
  return terms;
}

// Returns true if haystack (lowercase) contains the given parsed term.
function termMatches(haystack, term) {
  return term.exact ? term.regex.test(haystack) : haystack.includes(term.text);
}

// Convert "D.M.YYYY" to a numeric sort key (YYYYMMDD). '?' treated as 0.
function dateSortKey(dateStr) {
  const [d, m, y] = dateStr.split('.').map(p => parseInt(p) || 0);
  return y * 10000 + m * 100 + d;
}

function parseEvents(text) {
  const events = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const event = parseLine(line);
    if (event) {
      events.push(event);
    } else {
      console.warn('Non-matched line:', line);
    }
  }
  return events;
}

function parseLine(raw) {
  const m = raw.match(LINE_RE);
  if (!m) return null;

  const date = m[1];
  const year = parseInt(m[2]);
  const desc = m[3];
  const rawVenue = m[4].trim();
  const typeStr = m[5] ? m[5].trim() : null;

  // Extract trailing (comment) from venue, e.g. "Tavastia (2)" → venue="Tavastia", comment="2".
  // Greedy first group ensures we match the *last* parenthesized group.
  const locMatch = rawVenue.match(/^(.*\S)\s*\(([^)]+)\)$/);
  const venue = locMatch ? locMatch[1].trim() : rawVenue;
  const comment  = locMatch ? locMatch[2] : null;
  const type = typeStr ? (typeStr.includes('MC') ? 'MC' : 'C') : null;

  // Detect optional event name prefix: "Ruisrock-95: The Beautiful South, ..."
  // If ": " appears in the description, everything before it is the event name.
  let eventName = null;
  let descPart = desc;
  const colonIdx = desc.indexOf(': ');
  if (colonIdx !== -1) {
    eventName = desc.slice(0, colonIdx).trim();
    descPart = desc.slice(colonIdx + 2).trim();
  }

  const performers = [];
  if (type !== null) {
    // Concert or mini-concert: parse individual performers from descPart.
    // Comma separates independent performers; + separates jointly-billed performers
    // (displayed as one entry in the listing, counted individually in stats).
    let jointGroupId = 0;
    for (const group of descPart.split(COMMA_SPLIT_RE)) {
      const members = group.trim().split(JOINT_SPLIT_RE);
      const jointGroup = members.length > 1 ? jointGroupId++ : null;

      for (let p of members) {
        p = p.trim();
        if (!p) continue;

        let perfType = type;
        let perfName = p;

        // Per-performer type override, e.g. "Opening Act [MC]" in a [C] event.
        if (perfName.endsWith(' [C]')) {
          perfType = 'C';
          perfName = perfName.slice(0, -4).trim();
        } else if (perfName.endsWith(' [MC]')) {
          perfType = 'MC';
          perfName = perfName.slice(0, -5).trim();
        }

        // Strip trailing parenthesized detail for stats, matching gigcount.py.
        // "Fish (acoustic)" → name="Fish", detail="acoustic"
        const detailMatch = perfName.match(/^(.*\S)\s*\(([^)]+)\)$/);
        const detail = detailMatch ? detailMatch[2] : null;
        perfName = detailMatch ? detailMatch[1].trim() : perfName;

        performers.push({ name: perfName, type: perfType, detail, jointGroup });
      }
    }
  } else {
    // Non-concert event: the description is the event name, no performers.
    eventName = eventName || descPart.trim();
  }

  // A multi-performer [MC] event is a full [C] event — the event wasn't a
  // mini-concert, only the individual sets were. Single-performer [MC] stays MC.
  const eventType = (type === 'MC' && performers.length > 1) ? 'C' : type;

  return { date, year, eventName, performers, venue, comment, type: eventType, raw };
}


// ---- Alpine component ----

// Alpine fires 'alpine:init' before it processes the DOM, giving us a chance to
// register components. Alpine.data('app', factory) registers a component named 'app';
// when Alpine sees x-data="app" on an element, it calls the factory and uses the
// returned object as the reactive state + methods for that element and all its children.
document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    status: '',
    lang: localStorage.getItem('lang') || (navigator.language.startsWith('fi') ? 'fi' : 'en'),
    events: [],
    rawQuery: '',  // updates on every keystroke (bound to the input)
    query: '',     // debounced copy used for filtering
    searching: false,  // true while debounce is pending
    _debounceTimer: null,
    sortAsc: false,           // event listing: false = newest first (default), true = oldest first
    scrolled: false,          // true when left column has scrolled down enough to show scroll-to-top button
    showMinis: true,          // whether to include mini-concerts in the listing and stats
    listingOpen: true,        // whether the event list is expanded (collapsible on mobile)
    isMobile: false,          // true when viewport is at mobile breakpoint (≤768px)
    version: '',              // set from window.__appVersion (version.js); shown in header
    yearSort:      { col: 'year', dir: 'desc', yearDir: 'desc' }, // yearDir remembered independently
    venueSort:     { col: 'c',    dir: 'desc' },
    performerSort: { col: 'c',    dir: 'desc' },

    // t is the active language's string table. Use t.key in JS; x-text="t.key" in templates.
    get t() { return STRINGS[this.lang]; },

    // Called automatically by Alpine when the component initializes.
    async init() {
      // Pick up the version string set by version.js for display in the header.
      this.version = window.__appVersion || '';

      this.status = this.t.loading;

      // Try real data first; fall back to sample data if not found.
      let response = await fetch('events.txt');
      if (!response.ok) response = await fetch('events-sample.txt');
      const text = await response.text();
      const concerts = parseEvents(text).filter(e => e.type !== null);
      this.events = concerts.sort((a, b) => dateSortKey(b.date) - dateSortKey(a.date)) // newest first
        .map((e, i) => ({ ...e, id: i })); // stable integer ID for x-for keying
      this.status = this.t.loaded(this.events.length);

      // When the window grows past the mobile breakpoint, uncollapse the listing.
      // On desktop the chevron is hidden so the user has no way to reopen a collapsed list.
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile = mq.matches;
      mq.addEventListener('change', e => {
        this.isMobile = e.matches;
        if (!e.matches) this.listingOpen = true; // uncollapse when switching to desktop
      });

      // On mobile the whole page scrolls (not .left-col), so track window scroll for the
      // scroll-to-top button. The .left-col @scroll handler covers desktop.
      // On mobile the whole page scrolls (not .left-col), so track window scroll for the
      // scroll-to-top button. Safe on desktop too: body has overflow:hidden there so window
      // never scrolls and this listener never fires.
      window.addEventListener('scroll', () => { this.scrolled = window.scrollY > 50; });

      // $watch is an Alpine method that runs a callback whenever a reactive property changes.
      // Debounce rawQuery → query: wait 400ms after the last keystroke before updating query.
      // Clearing always fires instantly (no debounce) so the list resets without delay.
      this.$watch('lang', val => localStorage.setItem('lang', val));

      this.$watch('rawQuery', val => {
        clearTimeout(this._debounceTimer);
        if (!val) {
          this.query = '';
          this.searching = false;
          return;
        }
        this.searching = true;
        this._debounceTimer = setTimeout(() => {
          this.query = val;
          this.searching = false;
        }, 400);
      });
    },

    // Set the active sort column for a stats table.
    // Year column toggles asc/desc when clicked again; all other columns have
    // a fixed direction (counts always desc, name/venue always asc).
    // yearDir is maintained separately so the year direction is remembered even
    // when sorting by count — it's used as the tiebreaker in that case.
    setSort(stateKey, col) {
      const s = this[stateKey];
      if (s.col === col && col === 'year') {
        s.dir = s.dir === 'asc' ? 'desc' : 'asc'; // toggle
      } else {
        s.col = col;
        s.dir = col === 'year' ? s.yearDir  // restore remembered year direction
              : (col === 'name' || col === 'venue') ? 'asc' : 'desc';
      }
      if (col === 'year') s.yearDir = s.dir;
    },

    // Format C and MC counts as "N" (when MC=0) or "N (M)".
    fmtCount(c, mc) {
      return mc ? `${c} (${mc})` : `${c}`;
    },

    // Like fmtCount but renders the mini label as a badge (HTML string).
    // Must be used with x-html in the template (not x-text) so the <span> is parsed as markup.
    fmtCountHtml(c, mc) {
      if (!mc) return String(c);
      return `${c} (${mc} <span class="mini-badge">mini</span>)`;
    },

    // Format a list of events using fmtCount / fmtCountHtml.
    fmtCounts(events) {
      const c = events.filter(e => e.type === 'C').length;
      const mc = events.filter(e => e.type === 'MC').length;
      return this.fmtCount(c, mc);
    },
    // Like fmtCounts but returns HTML, and accounts for C-type events where every performer is MC.
    // Those events are subtracted from the main count and rolled into the mini badge as "+N",
    // because they disappear when mini-concerts are hidden — keeping the displayed count stable.
    // A tooltip is always shown on the badge to explain what the count means.
    fmtCountsHtml(events) {
      const cEvents = events.filter(e => e.type === 'C');
      const mc = events.filter(e => e.type === 'MC').length;
      const miniOnlyC = cEvents.filter(e =>
        e.performers.length > 0 && e.performers.every(p => p.type === 'MC')
      ).length;
      const c = cEvents.length - miniOnlyC;
      const total = mc + miniOnlyC;
      if (!total) return String(c);

      // Badge text: show N+M split only when both types are present.
      const badgeText = (mc > 0 && miniOnlyC > 0) ? `${mc}+${miniOnlyC}` : `${total}`;

      // Tooltip: describe each component, then note that all are hidden together.
      const parts = [];
      if (mc > 0) parts.push(this.t.tooltipMiniEvents(mc));
      if (miniOnlyC > 0) parts.push(this.t.tooltipMiniOnlyC(miniOnlyC));
      const hiddenNote = total === 1 ? this.t.tooltipHidden1 : total === 2 ? this.t.tooltipHidden2 : this.t.tooltipHiddenN(total);
      const tooltip = parts.join(', ') + ` — ${hiddenNote} ${this.t.tooltipWhenOff}`;

      return `${c} (${badgeText} <span class="mini-badge" data-tooltip="${tooltip}">mini</span>)`;
    },

    // Getters (get foo() {}) are Alpine's computed properties: Alpine tracks which reactive
    // data they read, and automatically re-evaluates and re-renders whenever that data changes.

    // Total event counts for the header — always labeled, always shows both.
    get counts() {
      const c = this.events.filter(e => e.type === 'C').length;
      const mc = this.events.filter(e => e.type === 'MC').length;
      return this.t.headerCounts(c, mc);
    },

    // 'performer' if every filtered event has at least one performer matching the query.
    // 'other' if events matched on event name, venue, or date instead.
    get searchMode() {
      if (!this.query.trim() || !this.filteredEvents.length) return 'other';
      const terms = parseQuery(this.query);
      return this.filteredEvents.every(event =>
        event.performers.some(p => terms.some(t => termMatches(p.name.toLowerCase(), t)))
      ) ? 'performer' : 'other';
    },

    // Human-readable label describing how the query was interpreted, e.g. "performer",
    // "year", "performer · year", "venue". Each word is classified independently:
    // 4-digit number → year; matches a performer name → performer;
    // matches a venue → venue; otherwise → event.
    get searchModeLabel() {
      if (!this.query.trim() || !this.filteredEvents.length) return null;
      const terms = parseQuery(this.query);
      const types = new Set();
      for (const term of terms) {
        if (!term.exact && /^\d{4}$/.test(term.text)) {
          types.add(this.t.modeYear);
          continue;
        }
        // A term can match multiple categories (e.g. "awa" matches performer AWA
        // and venue Awalon), so check all independently rather than else-if.
        const matchesPerformer = this.filteredEvents.some(e => e.performers.some(p => termMatches(p.name.toLowerCase(), term)));
        const matchesVenue     = this.filteredEvents.some(e => termMatches(e.venue.toLowerCase(), term));
        if (matchesPerformer) types.add(this.t.modePerformer);
        if (matchesVenue)     types.add(this.t.modeVenue);
        if (!matchesPerformer && !matchesVenue) types.add(this.t.modeEvent);
      }
      return types.size ? [...types].join(' · ') : null;
    },

    // True when searchModeLabel spans more than one category (e.g. "performer · venue").
    // Used to show an explanatory note below the toolbar.
    get searchModeMixed() {
      return !!(this.searchModeLabel && this.searchModeLabel.includes(' · '));
    },

    // True if the given performer name matches any word in the current query.
    // Used to highlight matched performers in the event listing.
    performerMatchesQuery(name) {
      if (!this.query.trim()) return false;
      const terms = parseQuery(this.query);
      return terms.some(t => termMatches(name.toLowerCase(), t));
    },

    // Split performers into full-concert and mini-only buckets.
    // c = performers with at least one full concert; mc = performers seen only in minis.
    get performerCounts() {
      const c  = this.performerStats.filter(p => p.c > 0).length;
      const mc = this.performerStats.filter(p => p.c === 0 && p.mc > 0).length;
      return { c, mc };
    },

    // Sum of all performer counts in the current filtered view — i.e. total performances.
    get performanceCounts() {
      return this.performerStats.reduce((s, p) => ({ c: s.c + p.c, mc: s.mc + p.mc }), { c: 0, mc: 0 });
    },

    // Formatted performance counts string for the summary block.
    get performanceCountsStr() {
      const { c, mc } = this.performanceCounts;
      return this.fmtCount(c, mc);
    },


    // True if any event in the full dataset has a mini-concert (MC) tag.
    // Used to conditionally show the showMinis toggle.
    get hasMinis() {
      return this.events.some(e => e.type === 'MC' || e.performers.some(p => p.type === 'MC'));
    },

    // Counts of mini-related events in the current query results, independent of showMinis.
    // mc: MC-type events; miniOnlyC: C-type events where every performer is MC.
    // Used to drive the mini-concerts toggle state, its count label, and fmtCountsHtml.
    get filteredMiniCounts() {
      const terms = parseQuery(this.query);
      const matched = terms.length
        ? this.events.filter(e => {
            const haystack = [e.date, this.eventTitle(e), e.venue].join(' ').toLowerCase();
            return terms.every(t => termMatches(haystack, t));
          })
        : this.events;
      const mc = matched.filter(e => e.type === 'MC').length;
      const miniOnlyC = matched.filter(e =>
        e.type === 'C' && e.performers.length > 0 && e.performers.every(p => p.type === 'MC')
      ).length;
      return { mc, miniOnlyC };
    },

    // True if the current query matches any mini-concerts (ignoring showMinis).
    // Used to grey out the toggle when toggling it would have no effect.
    get filteredHasMinis() {
      const { mc, miniOnlyC } = this.filteredMiniCounts;
      return mc > 0 || miniOnlyC > 0;
    },

    // Returns events matching the current search query, in the current sort order.
    // When showMinis is false, excludes MC events and C events where every performer is MC.
    // Search requires ALL words to match somewhere in the event (date + title + venue).
    get filteredEvents() {
      const terms = parseQuery(this.query);
      const matched = terms.length
        ? this.events.filter(e => {
            const haystack = [e.date, this.eventTitle(e), e.venue].join(' ').toLowerCase();
            return terms.every(t => termMatches(haystack, t));
          })
        : this.events;
      const visible = this.showMinis
        ? matched
        : matched.filter(e => e.type !== 'MC' && e.performers.some(p => p.type !== 'MC'));
      // this.events is sorted newest-first; reverse a shallow copy for oldest-first.
      return this.sortAsc ? [...visible].reverse() : visible;
    },

    // Aggregate per-venue counts from the filtered event list.
    get venueStats() {
      const map = new Map();
      for (const event of this.filteredEvents) {
        const loc = event.venue;
        if (!map.has(loc)) map.set(loc, { venue: loc, c: 0, mc: 0 });
        const entry = map.get(loc);
        if (event.type === 'C') entry.c++;
        else if (event.type === 'MC') entry.mc++;
      }
      const { col } = this.venueSort;
      return [...map.values()].sort((a, b) => {
        if (col === 'venue') return a.venue.localeCompare(b.venue); // always asc
        const cmp = (a.c - b.c) || (a.mc - b.mc);
        return cmp !== 0 ? -cmp : a.venue.localeCompare(b.venue); // count desc, tiebreak asc
      });
    },

    // Aggregate per-year counts from the filtered event list.
    get yearStats() {
      const map = new Map();
      for (const event of this.filteredEvents) {
        if (!map.has(event.year)) map.set(event.year, { year: event.year, c: 0, mc: 0 });
        const entry = map.get(event.year);
        if (event.type === 'C') entry.c++;
        else if (event.type === 'MC') entry.mc++;
      }
      const { col, dir, yearDir } = this.yearSort;
      return [...map.values()].sort((a, b) => {
        if (col === 'year') return (a.year - b.year) * (dir === 'asc' ? 1 : -1);
        const cmp = (a.c - b.c) || (a.mc - b.mc);
        return cmp !== 0 ? -cmp : (a.year - b.year) * (yearDir === 'asc' ? 1 : -1); // count desc, tiebreak uses remembered year dir
      });
    },

    // Aggregate per-performer counts from the filtered event list.
    // If a search word matches performer names, only those performers are counted.
    // If the event matched on venue/date (no performers match), all are counted.
    get performerStats() {
      const terms = parseQuery(this.query);
      const map = new Map();

      for (const event of this.filteredEvents) {
        // Which performers in this event match at least one search term?
        const matched = terms.length
          ? event.performers.filter(p => terms.some(t => termMatches(p.name.toLowerCase(), t)))
          : event.performers;
        // If none matched by name, the event matched on another field — include all.
        const toCount = matched.length ? matched : event.performers;

        for (const p of toCount) {
          if (!this.showMinis && p.type === 'MC') continue;
          if (!map.has(p.name)) map.set(p.name, { name: p.name, c: 0, mc: 0 });
          const entry = map.get(p.name);
          if (p.type === 'C') entry.c++;
          else if (p.type === 'MC') entry.mc++;
        }
      }

      const { col } = this.performerSort;
      return [...map.values()].sort((a, b) => {
        if (col === 'name') return a.name.localeCompare(b.name); // always asc
        const cmp = (a.c - b.c) || (a.mc - b.mc);
        return cmp !== 0 ? -cmp : a.name.localeCompare(b.name); // count desc, tiebreak asc
      });
    },

    // Merge jointly-billed performers (jointGroup !== null) into single display entries.
    // "A + B, C" (joint A&B, solo C) → [{ name: "A + B", ... }, { name: "C", ... }]
    // Stats still use event.performers (the flat list) so counting is unchanged.
    // Split venue at first comma: "013 Poppodium, Tilburg" → "013 Poppodium," and " Tilburg"
    venueMain(venue) {
      const i = venue.indexOf(',');
      return i === -1 ? venue : venue.slice(0, i + 1);
    },
    venueRest(venue) {
      const i = venue.indexOf(',');
      if (i === -1) return '';
      // Replace plain spaces with non-breaking spaces so wrapping only happens at ", "
      const rest = venue.slice(i + 1);
      return rest.replaceAll(' ', '\u00A0').replaceAll(',\u00A0', ', ');
    },

    displayPerformers(event) {
      const result = [];
      const seenGroups = new Set();
      for (const p of event.performers) {
        if (p.jointGroup !== null) {
          if (!seenGroups.has(p.jointGroup)) {
            seenGroups.add(p.jointGroup);
            const members = event.performers.filter(m => m.jointGroup === p.jointGroup);
            const details = members.map(m => m.detail).filter(Boolean);
            const detail = details.length > 0 ? details.join(' / ') : null;
            result.push({ name: members.map(m => m.name).join(' + '), type: p.type, detail });
          }
        } else {
          result.push(p);
        }
      }
      return result;
    },

    // Build a display title from the parsed event object.
    eventTitle(event) {
      if (event.performers.length > 0) {
        const names = event.performers.map(p => p.name).join(', ');
        return event.eventName ? `${event.eventName}: ${names}` : names;
      }
      return event.eventName || '';
    },
  }));
});
