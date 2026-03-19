// ---- Stats helpers ----
// Pure functions for filtering and aggregating event data.
// Depends on parseQuery and termMatches from parser.js (browser globals, or injected in tests).

// Build a display title from the parsed event object.
function eventTitle(event) {
  if (event.performers.length > 0) {
    const names = event.performers.map(p => p.name).join(', ');
    return event.eventName ? `${event.eventName}: ${names}` : names;
  }
  return event.eventName || '';
}

// Merge jointly-billed performers (jointGroup !== null) into single display entries.
// "A + B, C" (joint A&B, solo C) → [{ name: "A + B", ... }, { name: "C", ... }]
// Stats still use event.performers (the flat list) so counting is unchanged.
function displayPerformers(event) {
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
}

// Returns events matching query, filtered by showMinis, in the requested sort order.
// events is assumed pre-sorted newest-first; sortAsc=true reverses a shallow copy.
// Special case: when showMinis is true, the bare word "mini" (non-exact) filters to
// events that have at least one MC-typed performer or are MC-typed at event level,
// and is stripped from the regular text search so it doesn't match venue/name text.
function filterEvents(events, query, showMinis, sortAsc) {
  const terms = parseQuery(query);
  const miniTerm = showMinis ? terms.find(t => !t.exact && t.text === 'mini') : null;
  const regularTerms = miniTerm ? terms.filter(t => t !== miniTerm) : terms;

  let matched = miniTerm
    ? events.filter(e => e.type === 'MC' || e.performers.some(p => p.type === 'MC'))
    : events;
  if (regularTerms.length) {
    matched = matched.filter(e => {
      const haystack = [e.date, eventTitle(e), e.venue].join(' ').toLowerCase();
      return regularTerms.every(t => termMatches(haystack, t));
    });
  }
  const visible = showMinis
    ? matched
    : matched.filter(e => e.type !== 'MC');
  return sortAsc ? [...visible].reverse() : visible;
}

// Aggregate per-venue counts from events.
// sort: { col } — 'venue' sorts alphabetically asc; anything else sorts count desc, venue asc tiebreak.
function computeVenueStats(events, sort) {
  const map = new Map();
  for (const event of events) {
    const loc = event.venue;
    if (!map.has(loc)) map.set(loc, { venue: loc, c: 0, mc: 0 });
    const entry = map.get(loc);
    if (event.type === 'C') entry.c++;
    else if (event.type === 'MC') entry.mc++;
  }
  const { col } = sort;
  return [...map.values()].sort((a, b) => {
    if (col === 'venue') return a.venue.localeCompare(b.venue); // always asc
    const cmp = (a.c - b.c) || (a.mc - b.mc);
    return cmp !== 0 ? -cmp : a.venue.localeCompare(b.venue); // count desc, tiebreak asc
  });
}

// Aggregate per-year counts from events.
// sort: { col, dir, yearDir } — col='year' sorts by year using dir; otherwise sorts count desc,
// using yearDir as the year tiebreaker.
function computeYearStats(events, sort) {
  const map = new Map();
  for (const event of events) {
    if (!map.has(event.year)) map.set(event.year, { year: event.year, c: 0, mc: 0 });
    const entry = map.get(event.year);
    if (event.type === 'C') entry.c++;
    else if (event.type === 'MC') entry.mc++;
  }
  const { col, dir, yearDir } = sort;
  return [...map.values()].sort((a, b) => {
    if (col === 'year') return (a.year - b.year) * (dir === 'asc' ? 1 : -1);
    const cmp = (a.c - b.c) || (a.mc - b.mc);
    return cmp !== 0 ? -cmp : (a.year - b.year) * (yearDir === 'asc' ? 1 : -1); // count desc, tiebreak uses remembered year dir
  });
}

// Aggregate per-performer counts from events.
// If the query matches any performer names in an event, only those are counted for that event.
// If no performer matched (event hit on venue/date/etc.), all performers are counted.
// sort: { col } — 'name' sorts alphabetically asc; anything else sorts count desc, name asc tiebreak.
function computePerformerStats(events, query, showMinis, sort) {
  const terms = parseQuery(query);
  const map = new Map();

  for (const event of events) {
    // Which performers in this event match at least one search term?
    const matched = terms.length
      ? event.performers.filter(p => terms.some(t => termMatches(p.name.toLowerCase(), t)))
      : event.performers;
    // If none matched by name, the event matched on another field — include all.
    const toCount = matched.length ? matched : event.performers;

    for (const p of toCount) {
      if (!showMinis && p.type === 'MC') continue;
      if (!map.has(p.name)) map.set(p.name, { name: p.name, c: 0, mc: 0 });
      const entry = map.get(p.name);
      if (p.type === 'C') entry.c++;
      else if (p.type === 'MC') entry.mc++;
    }
  }

  const { col } = sort;
  return [...map.values()].sort((a, b) => {
    if (col === 'name') return a.name.localeCompare(b.name); // always asc
    const cmp = (a.c - b.c) || (a.mc - b.mc);
    return cmp !== 0 ? -cmp : a.name.localeCompare(b.name); // count desc, tiebreak asc
  });
}

if (typeof module !== 'undefined') module.exports = {
  eventTitle, displayPerformers,
  filterEvents, computeVenueStats, computeYearStats, computePerformerStats,
};
