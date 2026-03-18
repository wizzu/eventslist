// ---- Alpine component ----
// Parser (parseLine, parseEvents, etc.) and stats helpers (filterEvents, computeVenueStats, etc.)
// live in parser.js and stats.js, loaded as <script> tags before this file.

// Cache for highlight-suppression flags, keyed by query + showMinis.
// Lives outside Alpine's reactive proxy because Alpine getters re-run on every
// access — performerMatchesQuery/venueMatchesQuery are called per item in the
// x-for loop, so without caching the suppression check would be O(n²).
const _hlCache = { key: null, performer: false, venue: false, event: false };

// Alpine fires 'alpine:init' before it processes the DOM, giving us a chance to
// register components. Alpine.data('app', factory) registers a component named 'app';
// when Alpine sees x-data="app" on an element, it calls the factory and uses the
// returned object as the reactive state + methods for that element and all its children.
document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    status: '',
    lang: localStorage.getItem('lang')
        || (/^keikat\./.test(location.hostname) ? 'fi' : /^gigs\./.test(location.hostname) ? 'en' : null)
        || (navigator.language.startsWith('fi') ? 'fi' : 'en'),
    events: [],
    rawQuery: '',  // updates on every keystroke (bound to the input)
    query: '',     // debounced copy used for filtering
    searching: false,  // true while debounce is pending
    _debounceTimer: null,
    sortAsc: false,           // event listing: false = newest first (default), true = oldest first
    scrolled: false,          // true when left column has scrolled down enough to show scroll-to-top button
    showMinis: false,         // whether to include mini-concerts in the listing and stats
    listingOpen: true,        // whether the event list is expanded (collapsible on mobile)
    isMobile: false,          // true when viewport is at mobile breakpoint (≤768px)
    version: '',              // set from window.__appVersion (version.js); shown in header
    usingSample: false,       // true when events.txt was not found and sample data was loaded instead
    dataError: false,         // true when data-source-url.txt exists but loading from that URL failed
    noData: false,            // true when no data file was found at all
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

      // Determine data source:
      // 1. data-source-url.txt (if present, use the URL inside; error and stop on failure)
      // 2. events.txt (local)
      // 3. events-sample.txt (fallback; sets usingSample)
      // 4. nothing found → sets noData
      let response;
      const urlFile = await fetch('data-source-url.txt');
      if (urlFile.ok) {
        const dataUrl = (await urlFile.text()).trim();
        if (dataUrl) {
          try {
            response = await fetch(dataUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
          } catch (_) {
            this.dataError = true;
            this.status = '';
            return;
          }
        }
      }
      if (!response) {
        response = await fetch('events.txt');
        if (!response.ok) {
          response = await fetch('events-sample.txt');
          if (!response.ok) {
            this.noData = true;
            this.status = '';
            return;
          }
          this.usingSample = true;
        }
      }
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
      // scroll-to-top button. Safe on desktop too: body has overflow:hidden there so window
      // never scrolls and this listener never fires.
      window.addEventListener('scroll', () => { this.scrolled = window.scrollY > 50; });

      // $watch is an Alpine method that runs a callback whenever a reactive property changes.
      // Debounce rawQuery → query: wait 400ms after the last keystroke before updating query.
      // Clearing always fires instantly (no debounce) so the list resets without delay.
      this.$watch('lang', val => {
        localStorage.setItem('lang', val);
        document.title = this.t.pageTitle;
      });
      document.title = this.t.pageTitle;

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
        }, this.isMobile ? 700 : 400);
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

    // Format C and MC counts as "N" (when MC=0) or "N (+M)".
    fmtCount(c, mc) {
      return mc ? `${c} (+${mc})` : `${c}`;
    },

    // Like fmtCount but renders the mini label as a badge (HTML string).
    // Must be used with x-html in the template (not x-text) so the <span> is parsed as markup.
    fmtCountHtml(c, mc) {
      if (!mc) return String(c);
      return `${c} (+${mc} <span class="mini-badge">mini</span>)`;
    },

    // Format a list of events using fmtCount / fmtCountHtml.
    fmtCounts(events) {
      const c = events.filter(e => e.type === 'C').length;
      const mc = events.filter(e => e.type === 'MC').length;
      return this.fmtCount(c, mc);
    },
    // Like fmtCounts but returns HTML with a tooltip on the mini badge.
    fmtCountsHtml(events) {
      const c = events.filter(e => e.type === 'C').length;
      const mc = events.filter(e => e.type === 'MC').length;
      if (!mc) return String(c);
      const hiddenNote = mc === 1 ? this.t.tooltipHidden1 : this.t.tooltipHiddenN(mc);
      const tooltip = this.t.tooltipMiniEvents(mc) + ` — ${hiddenNote} ${this.t.tooltipWhenOff}`;
      return `${c} (+${mc} <span class="mini-badge" data-tooltip="${tooltip}">mini</span>)`;
    },

    // Getters (get foo() {}) are Alpine's computed properties: Alpine tracks which reactive
    // data they read, and automatically re-evaluates and re-renders whenever that data changes.

    // All-time header counts — concerts and performances (unfiltered, always stable).
    get counts() {
      const c = this.events.filter(e => e.type === 'C').length;
      const perf = this.events.reduce((s, e) => s + e.performers.filter(p => p.type === 'C').length, 0);
      return this.t.headerCounts(c, perf);
    },

    // Supplementary mini line for the header — empty string when there are no minis.
    get miniCountsStr() {
      const mc = this.events.filter(e => e.type === 'MC').length;
      const mperf = this.events.reduce((s, e) => s + e.performers.filter(p => p.type === 'MC').length, 0);
      if (!mc && !mperf) return '';
      return this.t.headerMiniLine(mc, mperf);
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
        const isYear = !term.exact && /^\d{4}$/.test(term.text);
        if (isYear) types.add(this.t.modeYear);
        // A term can match multiple categories (e.g. "awa" matches performer AWA
        // and venue Awalon), so check all independently rather than else-if.
        // Year terms still fall through to catch event names like "Ankkarock 2006".
        const matchesPerformer = this.filteredEvents.some(e => e.performers.some(p => termMatches(p.name.toLowerCase(), term)));
        const matchesVenue     = this.filteredEvents.some(e => termMatches(e.venue.toLowerCase(), term));
        const matchesEventName = this.filteredEvents.some(e => e.eventName && termMatches(e.eventName.toLowerCase(), term));
        const matchesDate      = this.filteredEvents.some(e => termMatches(e.date.toLowerCase(), term));
        if (matchesPerformer) types.add(this.t.modePerformer);
        if (matchesEventName) types.add(this.t.modeEvent);
        if (matchesVenue)     types.add(this.t.modeVenue);
        if (matchesDate && !isYear) types.add(this.t.modeDate);
        if (!isYear && !matchesPerformer && !matchesVenue && !matchesEventName && !matchesDate) types.add(this.t.modeEvent);
      }
      if (!types.size) return null;
      const arr = [...types];
      return arr.length === 1
        ? arr[0]
        : arr.slice(0, -1).join(', ') + this.t.modeJoin + arr[arr.length - 1];
    },

    // True when searchModeLabel spans more than one category AND those categories
    // yield genuinely different match sets. Suppressed when one category's matches
    // are a subset of another's (e.g. "2006" matching year + "Ankkarock 2006" event
    // name — same concerts either way, no real ambiguity).
    get searchModeMixed() {
      if (!this.searchModeLabel || !this.searchModeLabel.includes(this.t.modeJoin)) return false;
      const terms = parseQuery(this.query);
      const events = this.filteredEvents;
      // Build one Set<event> per category across all terms.
      const catSets = {};
      const add = (cat, e) => { (catSets[cat] ??= new Set()).add(e); };
      for (const term of terms) {
        const isYear = !term.exact && /^\d{4}$/.test(term.text);
        if (isYear)
          events.forEach(e => { if (e.date.includes(term.text)) add('year', e); });
        events.forEach(e => {
          if (e.performers.some(p => termMatches(p.name.toLowerCase(), term))) add('performer', e);
          if (termMatches(e.venue.toLowerCase(), term))                         add('venue', e);
          if (e.eventName && termMatches(e.eventName.toLowerCase(), term))      add('event', e);
          if (!isYear && termMatches(e.date.toLowerCase(), term))               add('date', e);
        });
      }
      const sets = Object.values(catSets);
      if (sets.length <= 1) return false;
      // If every pair is nested (one ⊆ other), all categories resolve the same events.
      const isSubset = (a, b) => [...a].every(e => b.has(e));
      for (let i = 0; i < sets.length; i++)
        for (let j = i + 1; j < sets.length; j++)
          if (!isSubset(sets[i], sets[j]) && !isSubset(sets[j], sets[i])) return true;
      return false;
    },

    // Compute highlight-suppression flags, cached outside Alpine's reactive system.
    // Highlight is suppressed when only one category matched AND highlighting every
    // item would add no information (nothing left un-highlighted).
    // - Performer: suppressed when every performer in every result matches the query.
    // - Venue: suppressed when all results share a single venue.
    // When multiple categories matched, highlighting is always shown.
    _highlightFlags() {
      const key = this.query + '|' + this.showMinis;
      if (_hlCache.key === key) return _hlCache;
      const trimmed = this.query.trim();
      const events = this.filteredEvents;
      if (!trimmed || !events.length) {
        _hlCache.key = key; _hlCache.performer = false; _hlCache.venue = false; _hlCache.event = false;
        return _hlCache;
      }
      const terms = parseQuery(this.query);
      // Inline category check (avoids reading the searchModeMixed getter repeatedly).
      const cats = new Set();
      for (const term of terms) {
        if (!term.exact && /^\d{4}$/.test(term.text)) { cats.add('year'); continue; }
        const mp  = events.some(e => e.performers.some(p => termMatches(p.name.toLowerCase(), term)));
        const mv  = events.some(e => termMatches(e.venue.toLowerCase(), term));
        const men = events.some(e => e.eventName && termMatches(e.eventName.toLowerCase(), term));
        if (mp)  cats.add('performer');
        if (mv)  cats.add('venue');
        if (men) cats.add('eventName');
        if (!mp && !mv && !men) cats.add('other');
      }
      const mixed = cats.size > 1;
      _hlCache.performer = mixed || events.some(e =>
        e.performers.some(p => !terms.some(t => termMatches(p.name.toLowerCase(), t)))
      );
      const venues = new Set(events.map(e => e.venue));
      _hlCache.venue = mixed || venues.size > 1;
      const eventNames = new Set(events.map(e => e.eventName || ''));
      _hlCache.event = cats.has('eventName') && (mixed || eventNames.size > 1);
      _hlCache.key = key;
      return _hlCache;
    },

    // True if the given performer name matches the query AND highlighting is active.
    performerMatchesQuery(name) {
      if (!this._highlightFlags().performer) return false;
      const terms = parseQuery(this.query);
      return terms.some(t => termMatches(name.toLowerCase(), t));
    },

    // True if the given venue matches the query AND highlighting is active.
    venueMatchesQuery(venue) {
      if (!this._highlightFlags().venue) return false;
      const terms = parseQuery(this.query);
      return terms.some(t => termMatches(venue.toLowerCase(), t));
    },

    // True if the given event name matches the query AND highlighting is active.
    eventNameMatchesQuery(name) {
      if (!name || !this._highlightFlags().event) return false;
      const terms = parseQuery(this.query);
      return terms.some(t => termMatches(name.toLowerCase(), t));
    },

    // Split a joint display name ("A + B") into parts, each with its own match flag.
    // Returns [{ text, sep, match }] where sep is the " + " before each part (empty for first).
    // For solo performers, returns a single-element array.
    performerNameParts(displayName) {
      const parts = displayName.split(' + ');
      const shouldHL = this._highlightFlags().performer;
      const terms = shouldHL ? parseQuery(this.query) : [];
      return parts.map((name, i) => ({
        text: name,
        sep: i > 0 ? ' + ' : '',
        match: shouldHL && terms.some(t => termMatches(name.toLowerCase(), t)),
      }));
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

    // True if any event in the full dataset has a mini-concert (MC) tag.
    // Used to conditionally show the showMinis toggle.
    get hasMinis() {
      return this.events.some(e => e.type === 'MC' || e.performers.some(p => p.type === 'MC'));
    },

    // Count of MC-type events in the current query results, independent of showMinis.
    // Used to drive the mini-concerts toggle state and its count label.
    get filteredMiniCounts() {
      const terms = parseQuery(this.query);
      const matched = terms.length
        ? this.events.filter(e => {
            const haystack = [e.date, eventTitle(e), e.venue].join(' ').toLowerCase();
            return terms.every(t => termMatches(haystack, t));
          })
        : this.events;
      const mc = matched.filter(e => e.type === 'MC').length;
      return { mc };
    },

    // True if the current query matches any mini-concerts (ignoring showMinis).
    // Used to grey out the toggle when toggling it would have no effect.
    get filteredHasMinis() {
      return this.filteredMiniCounts.mc > 0;
    },

    // Returns events matching the current search query, in the current sort order.
    // When showMinis is false, excludes MC-type events.
    // Search requires ALL words to match somewhere in the event (date + title + venue).
    get filteredEvents() {
      return filterEvents(this.events, this.query, this.showMinis, this.sortAsc);
    },

    // Aggregate per-venue counts from the filtered event list.
    get venueStats() {
      return computeVenueStats(this.filteredEvents, this.venueSort);
    },

    // Aggregate per-year counts from the filtered event list.
    get yearStats() {
      return computeYearStats(this.filteredEvents, this.yearSort);
    },

    // Aggregate per-performer counts from the filtered event list.
    // If a search word matches performer names, only those performers are counted.
    // If the event matched on venue/date (no performers match), all are counted.
    get performerStats() {
      return computePerformerStats(this.filteredEvents, this.query, this.showMinis, this.performerSort);
    },

    // Split venue at first comma: "013 Poppodium, Tilburg" → "013 Poppodium," and " Tilburg"
    venueMain(venue) {
      const i = venue.indexOf(',');
      return i === -1 ? venue : venue.slice(0, i + 1);
    },
    venueRest(venue) {
      const i = venue.indexOf(',');
      if (i === -1) return '';
      return venue.slice(i + 1);
    },

    // Mobile listing summary — line 1 (headline).
    // Single-performer search: shows performances count ("N performances").
    // All other cases: shows concerts count ("N concerts [+M mini]").
    get listingSummaryHeadlineHtml() {
      if (this.query && this.searchMode === 'performer' && this.performerStats.length === 1) {
        const { c: perf, mc: perfMc } = this.performanceCounts;
        return this.t.listingSummaryPerformerHeadline(perf, perfMc);
      }
      const c = this.filteredEvents.filter(e => e.type === 'C').length;
      const mc = this.filteredEvents.filter(e => e.type === 'MC').length;
      const label = this.t.concertLabel(c).trim();
      if (!mc) return `${c} ${label}`;
      const hiddenNote = mc === 1 ? this.t.tooltipHidden1 : this.t.tooltipHiddenN(mc);
      const tooltip = this.t.tooltipMiniEvents(mc) + ` — ${hiddenNote} ${this.t.tooltipWhenOff}`;
      return `${c} ${label} (+${mc} <span class="mini-badge" data-tooltip="${tooltip}">mini</span>)`;
    },

    // Mobile listing summary — line 2: compact detail stats.
    // Single-performer search: shows "across N events · performers · venues · years".
    // All other cases: shows "performances · performers · venues · years".
    get listingSummaryDetailText() {
      if (this.query && this.searchMode === 'performer' && this.performerStats.length === 1) {
        const events = this.filteredEvents.filter(e => e.type === 'C').length;
        const { c: performers } = this.performerCounts;
        const venues = this.venueStats.length;
        const years = this.yearStats.length;
        return this.t.listingSummaryDetailPerformer(events, performers, venues, years);
      }
      const { c: perf, mc: perfMc } = this.performanceCounts;
      const { c: performers } = this.performerCounts;
      const venues = this.venueStats.length;
      const years = this.yearStats.length;
      return this.t.listingSummaryDetail(perf, perfMc, performers, venues, years);
    },
  }));
});
