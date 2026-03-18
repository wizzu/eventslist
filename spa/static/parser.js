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
    const regex = exact ? (() => {
      const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const alpha = '[a-zA-Z0-9\u00C0-\u024F]';
      // Only assert a boundary on sides where the term itself starts/ends with
      // an alphanumeric character. A leading/trailing dot (e.g. "1.8.") is already
      // a natural separator, so no lookahead/lookbehind is needed on that side.
      const pre  = /^[a-zA-Z0-9\u00C0-\u024F]/.test(text) ? `(?<!${alpha})` : ''; // lookbehind only if term starts with alphanum
      const post = /[a-zA-Z0-9\u00C0-\u024F]$/.test(text) ? `(?!${alpha})`  : ''; // lookahead only if term ends with alphanum
      return new RegExp(pre + escaped + post, 'i');
    })() : null;
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

  const eventType = type;

  return { date, year, eventName, performers, venue, comment, type: eventType, raw };
}

if (typeof module !== 'undefined') module.exports = {
  parseLine, parseEvents, dateSortKey,
  parseQuery, termMatches,
  LINE_RE, COMMA_SPLIT_RE, JOINT_SPLIT_RE,
};
