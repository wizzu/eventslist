// ---- Parser ----

// Matches a full event line. Permissive about text content to support Unicode.
// Groups: (1) full date, (2) year, (3) description (performers or event desc),
//         (4) location, (5) " [C]" or " [MC]" (optional).
// Location explicitly excludes "[" so it can't accidentally consume the type tag.
const LINE_RE = /^([\d?]{1,3}\.[\d?]{1,2}\.(\d{4}))\s+(.+); ([^\[]+)( \[M?C\])?$/;

// Split performers on comma or +, but NOT inside parentheses.
// e.g. "Fish (with band), Opeth" splits into ["Fish (with band)", "Opeth"]
const PERF_SPLIT_RE = /[,+]\s+(?![^()]*\))/;

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
  const location = m[4].trim();
  const typeStr = m[5] ? m[5].trim() : null;
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
    for (let p of descPart.split(PERF_SPLIT_RE)) {
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
      // "Fish (acoustic)" → "Fish"
      perfName = perfName.replace(/\s*\(.*\)$/, '').trim();

      performers.push({ name: perfName, type: perfType });
    }
  } else {
    // Non-concert event: the description is the event name, no performers.
    eventName = eventName || descPart.trim();
  }

  // A multi-performer [MC] event is a full [C] event — the event wasn't a
  // mini-concert, only the individual sets were. Single-performer [MC] stays MC.
  const eventType = (type === 'MC' && performers.length > 1) ? 'C' : type;

  return { date, year, eventName, performers, location, type: eventType, raw };
}


// ---- Alpine component ----

// The main Alpine.js component. Alpine looks for this when it sees x-data="app".
document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    status: 'Loading...',
    events: [],
    query: '',
    sortAsc: false,           // event listing: false = newest first (default), true = oldest first
    yearSort:      { col: 'year', dir: 'desc' },
    locationSort:  { col: 'c',    dir: 'desc' },
    performerSort: { col: 'c',    dir: 'desc' },

    // Called automatically by Alpine when the component initializes.
    async init() {
      const response = await fetch('events.txt');
      const text = await response.text();
      const concerts = parseEvents(text).filter(e => e.type !== null);
      this.events = concerts.sort((a, b) => dateSortKey(b.date) - dateSortKey(a.date)); // newest first
      this.status = `Loaded ${this.events.length} events.`;
    },

    // Set the active sort column for a stats table.
    // Year column toggles asc/desc when clicked again; all other columns have
    // a fixed direction (counts always desc, name/location always asc).
    setSort(stateKey, col) {
      const s = this[stateKey];
      if (s.col === col && col === 'year') {
        s.dir = s.dir === 'asc' ? 'desc' : 'asc';
      } else {
        s.col = col;
        s.dir = (col === 'name' || col === 'location') ? 'asc' : 'desc';
      }
    },

    // Format a list of events as "C (MC)".
    fmtCounts(events) {
      const c = events.filter(e => e.type === 'C').length;
      const mc = events.filter(e => e.type === 'MC').length;
      return `${c} (${mc})`;
    },

    // Total event counts, always unfiltered — shown in the header.
    get counts() {
      return this.fmtCounts(this.events);
    },

    // 'performer' if every filtered event has at least one performer matching the query.
    // 'other' if events matched on event name, location, or date instead.
    get searchMode() {
      if (!this.query.trim() || !this.filteredEvents.length) return 'other';
      const words = this.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return this.filteredEvents.every(event =>
        event.performers.some(p => words.some(w => p.name.toLowerCase().includes(w)))
      ) ? 'performer' : 'other';
    },

    // Sum of all performer counts in the current filtered view — i.e. total performances.
    get performanceCounts() {
      return this.performerStats.reduce((s, p) => ({ c: s.c + p.c, mc: s.mc + p.mc }), { c: 0, mc: 0 });
    },

    // Formatted performance counts string for the summary block.
    get performanceCountsStr() {
      const { c, mc } = this.performanceCounts;
      return `${c} (${mc})`;
    },


    // Returns events matching the current search query, in the current sort order.
    get filteredEvents() {
      const words = this.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const matched = words.length
        ? this.events.filter(e => {
            const haystack = [e.date, this.eventTitle(e), e.location].join(' ').toLowerCase();
            return words.every(w => haystack.includes(w));
          })
        : this.events;
      // this.events is sorted newest-first; reverse a shallow copy for oldest-first.
      return this.sortAsc ? [...matched].reverse() : matched;
    },

    // Aggregate per-location counts from the filtered event list.
    get locationStats() {
      const map = new Map();
      for (const event of this.filteredEvents) {
        // Strip trailing (comment) from location for grouping purposes.
        const loc = event.location.replace(/\s*\([^)]*\)\s*$/, '').trim();
        if (!map.has(loc)) map.set(loc, { location: loc, c: 0, mc: 0 });
        const entry = map.get(loc);
        if (event.type === 'C') entry.c++;
        else if (event.type === 'MC') entry.mc++;
      }
      const { col, dir } = this.locationSort;
      return [...map.values()].sort((a, b) => {
        let cmp = col === 'location' ? a.location.localeCompare(b.location)
                : (a.c - b.c) || (a.mc - b.mc); // count sort: C first, MC as tiebreaker
        if (cmp === 0) cmp = a.location.localeCompare(b.location); // final tiebreak
        return dir === 'asc' ? cmp : -cmp;
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
      const { col, dir } = this.yearSort;
      return [...map.values()].sort((a, b) => {
        let cmp = col === 'year' ? a.year - b.year
                : (a.c - b.c) || (a.mc - b.mc); // count sort: C first, MC as tiebreaker
        if (cmp === 0 && col !== 'year') cmp = a.year - b.year; // final tiebreak
        return dir === 'asc' ? cmp : -cmp;
      });
    },

    // Aggregate per-performer counts from the filtered event list.
    // If a search word matches performer names, only those performers are counted.
    // If the event matched on location/date (no performers match), all are counted.
    get performerStats() {
      const words = this.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const map = new Map();

      for (const event of this.filteredEvents) {
        // Which performers in this event match at least one search word?
        const matched = words.length
          ? event.performers.filter(p => words.some(w => p.name.toLowerCase().includes(w)))
          : event.performers;
        // If none matched by name, the event matched on another field — include all.
        const toCount = matched.length ? matched : event.performers;

        for (const p of toCount) {
          if (!map.has(p.name)) map.set(p.name, { name: p.name, c: 0, mc: 0 });
          const entry = map.get(p.name);
          if (p.type === 'C') entry.c++;
          else if (p.type === 'MC') entry.mc++;
        }
      }

      const { col, dir } = this.performerSort;
      return [...map.values()].sort((a, b) => {
        let cmp = col === 'name' ? a.name.localeCompare(b.name)
                : (a.c - b.c) || (a.mc - b.mc); // count sort: C first, MC as tiebreaker
        if (cmp === 0) cmp = a.name.localeCompare(b.name); // final tiebreak
        return dir === 'asc' ? cmp : -cmp;
      });
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
