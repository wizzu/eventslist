// ---- Parser ----

// Matches a full event line. Permissive about text content to support Unicode.
// Groups: (1) full date, (2) year, (3) description (performers or event desc),
//         (4) location, (5) " [C]" or " [MC]" (optional).
// Location explicitly excludes "[" so it can't accidentally consume the type tag.
const LINE_RE = /^([\d?]{1,3}\.[\d?]{1,2}\.(\d{4}))\s+(.+); ([^\[]+)( \[M?C\])?$/;

// Split performers on comma or +, but NOT inside parentheses.
// e.g. "Fish (with band), Opeth" splits into ["Fish (with band)", "Opeth"]
const PERF_SPLIT_RE = /[,+]\s+(?![^()]*\))/;

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

  return { date, year, eventName, performers, location, type, raw };
}


// ---- Alpine component ----

// The main Alpine.js component. Alpine looks for this when it sees x-data="app".
document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    status: 'Loading...',
    events: [],
    query: '',

    // Called automatically by Alpine when the component initializes.
    async init() {
      const response = await fetch('events.txt');
      const text = await response.text();
      const concerts = parseEvents(text).filter(e => e.type !== null);
      this.events = concerts.reverse(); // newest first
      this.status = `Loaded ${this.events.length} events.`;
    },

    // Returns events matching the current search query.
    get filteredEvents() {
      const q = this.query.trim().toLowerCase();
      if (!q) return this.events;
      return this.events.filter(e => {
        const haystack = [e.date, this.eventTitle(e), e.location].join(' ').toLowerCase();
        return haystack.includes(q);
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
