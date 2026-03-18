import { describe, it, expect } from 'bun:test';

// parser.js functions are globals in the browser; inject them here to mirror that.
const parser = require('../../spa/static/parser.js');
Object.assign(global, parser);

const {
  eventTitle,
  displayPerformers,
  filterEvents,
  computeVenueStats,
  computeYearStats,
  computePerformerStats,
} = require('../../spa/static/stats.js');

// ---- Helpers ----

// Build a minimal event object. type: 'C' | 'MC' | null.
function mkEvent({ date = '1.5.2022', year = 2022, venue = 'Tavastia', type = 'C',
                   performers = [], eventName = null } = {}) {
  return { date, year, venue, type, performers, eventName, comment: null, raw: '' };
}

// Build a performer object.
function mkPerf(name, type = 'C', { detail = null, jointGroup = null } = {}) {
  return { name, type, detail, jointGroup };
}

// ---- eventTitle ----

describe('eventTitle', () => {
  it('returns performer names joined by comma', () => {
    const e = mkEvent({ performers: [mkPerf('Opeth'), mkPerf('Enslaved')] });
    expect(eventTitle(e)).toBe('Opeth, Enslaved');
  });

  it('prepends event name when present', () => {
    const e = mkEvent({ eventName: 'Ruisrock', performers: [mkPerf('Blur')] });
    expect(eventTitle(e)).toBe('Ruisrock: Blur');
  });

  it('returns eventName when no performers', () => {
    const e = mkEvent({ type: null, performers: [], eventName: 'Trip to London' });
    expect(eventTitle(e)).toBe('Trip to London');
  });

  it('returns empty string when no performers and no eventName', () => {
    const e = mkEvent({ type: null, performers: [], eventName: null });
    expect(eventTitle(e)).toBe('');
  });
});

// ---- displayPerformers ----

describe('displayPerformers', () => {
  it('returns solo performers unchanged', () => {
    const e = mkEvent({ performers: [mkPerf('Opeth'), mkPerf('Enslaved')] });
    const result = displayPerformers(e);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Opeth');
    expect(result[1].name).toBe('Enslaved');
  });

  it('merges joint-billed performers into one entry', () => {
    const e = mkEvent({ performers: [
      mkPerf('Fish', 'C', { jointGroup: 0 }),
      mkPerf('Marillion', 'C', { jointGroup: 0 }),
    ]});
    const result = displayPerformers(e);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Fish + Marillion');
  });

  it('handles mix of joint and solo performers', () => {
    const e = mkEvent({ performers: [
      mkPerf('Fish', 'C', { jointGroup: 0 }),
      mkPerf('Marillion', 'C', { jointGroup: 0 }),
      mkPerf('Opeth'),
    ]});
    const result = displayPerformers(e);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Fish + Marillion');
    expect(result[1].name).toBe('Opeth');
  });

  it('joins details with " / " for joint performers', () => {
    const e = mkEvent({ performers: [
      mkPerf('Fish', 'C', { jointGroup: 0, detail: 'acoustic' }),
      mkPerf('Marillion', 'C', { jointGroup: 0, detail: 'full band' }),
    ]});
    const result = displayPerformers(e);
    expect(result[0].detail).toBe('acoustic / full band');
  });

  it('detail is null when no members have detail', () => {
    const e = mkEvent({ performers: [
      mkPerf('Fish', 'C', { jointGroup: 0 }),
      mkPerf('Marillion', 'C', { jointGroup: 0 }),
    ]});
    expect(displayPerformers(e)[0].detail).toBeNull();
  });

  it('handles two separate joint pairs', () => {
    const e = mkEvent({ performers: [
      mkPerf('A', 'C', { jointGroup: 0 }),
      mkPerf('B', 'C', { jointGroup: 0 }),
      mkPerf('C', 'C', { jointGroup: 1 }),
      mkPerf('D', 'C', { jointGroup: 1 }),
    ]});
    const result = displayPerformers(e);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('A + B');
    expect(result[1].name).toBe('C + D');
  });
});

// ---- filterEvents ----

describe('filterEvents', () => {
  const events = [
    mkEvent({ date: '3.5.2022', year: 2022, venue: 'Tavastia',  type: 'C',  performers: [mkPerf('Opeth')] }),
    mkEvent({ date: '2.5.2022', year: 2022, venue: 'Gloria',    type: 'C',  performers: [mkPerf('Enslaved')] }),
    mkEvent({ date: '1.5.2022', year: 2022, venue: 'Club 007',  type: 'MC', performers: [mkPerf('Opener', 'MC')] }),
  ];

  it('empty query returns all non-MC events when showMinis=false', () => {
    const result = filterEvents(events, '', false, false);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.type !== 'MC')).toBe(true);
  });

  it('empty query includes MC events when showMinis=true', () => {
    const result = filterEvents(events, '', true, false);
    expect(result).toHaveLength(3);
  });

  it('preserves input order (newest-first) by default', () => {
    const result = filterEvents(events, '', false, false);
    expect(result[0].venue).toBe('Tavastia');
    expect(result[1].venue).toBe('Gloria');
  });

  it('sortAsc=true reverses to oldest-first', () => {
    const result = filterEvents(events, '', false, true);
    expect(result[0].venue).toBe('Gloria');
    expect(result[1].venue).toBe('Tavastia');
  });

  it('filters by performer name', () => {
    const result = filterEvents(events, 'opeth', false, false);
    expect(result).toHaveLength(1);
    expect(result[0].performers[0].name).toBe('Opeth');
  });

  it('filters by venue', () => {
    const result = filterEvents(events, 'gloria', false, false);
    expect(result).toHaveLength(1);
    expect(result[0].venue).toBe('Gloria');
  });

  it('filters by date', () => {
    const result = filterEvents(events, '3.5.2022', false, false);
    expect(result).toHaveLength(1);
    expect(result[0].venue).toBe('Tavastia');
  });

  it('multiple terms must all match (AND semantics)', () => {
    const result = filterEvents(events, 'opeth tavastia', false, false);
    expect(result).toHaveLength(1);
    const noMatch = filterEvents(events, 'opeth gloria', false, false);
    expect(noMatch).toHaveLength(0);
  });

  it('search is case-insensitive', () => {
    const result = filterEvents(events, 'OPETH', false, false);
    expect(result).toHaveLength(1);
  });

  it('includes MC events in results when showMinis=true and query matches', () => {
    const result = filterEvents(events, 'opener', true, false);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('MC');
  });

  it('filters by event name', () => {
    const withEventName = [
      mkEvent({ eventName: 'Ruisrock', performers: [mkPerf('Blur')], venue: 'Ruissalo' }),
      mkEvent({ performers: [mkPerf('Opeth')], venue: 'Tavastia' }),
    ];
    const result = filterEvents(withEventName, 'ruisrock', false, false);
    expect(result).toHaveLength(1);
    expect(result[0].eventName).toBe('Ruisrock');
  });
});

// ---- computeVenueStats ----

describe('computeVenueStats', () => {
  const events = [
    mkEvent({ venue: 'Tavastia', type: 'C' }),
    mkEvent({ venue: 'Tavastia', type: 'C' }),
    mkEvent({ venue: 'Tavastia', type: 'MC' }),
    mkEvent({ venue: 'Gloria',   type: 'C' }),
  ];

  it('groups and counts by venue', () => {
    const result = computeVenueStats(events, { col: 'c' });
    const t = result.find(r => r.venue === 'Tavastia');
    const g = result.find(r => r.venue === 'Gloria');
    expect(t).toBeDefined();
    expect(t.c).toBe(2);
    expect(t.mc).toBe(1);
    expect(g.c).toBe(1);
    expect(g.mc).toBe(0);
  });

  it('default sort (col=c): higher count first', () => {
    const result = computeVenueStats(events, { col: 'c' });
    expect(result[0].venue).toBe('Tavastia'); // 2 concerts
    expect(result[1].venue).toBe('Gloria');   // 1 concert
  });

  it('col=venue: alphabetical ascending', () => {
    const result = computeVenueStats(events, { col: 'venue' });
    expect(result[0].venue).toBe('Gloria');
    expect(result[1].venue).toBe('Tavastia');
  });

  it('count tiebreak is alphabetical', () => {
    const tied = [
      mkEvent({ venue: 'Zebra', type: 'C' }),
      mkEvent({ venue: 'Apple', type: 'C' }),
    ];
    const result = computeVenueStats(tied, { col: 'c' });
    expect(result[0].venue).toBe('Apple');
    expect(result[1].venue).toBe('Zebra');
  });
});

// ---- computeYearStats ----

describe('computeYearStats', () => {
  const events = [
    mkEvent({ year: 2022, type: 'C' }),
    mkEvent({ year: 2022, type: 'C' }),
    mkEvent({ year: 2021, type: 'C' }),
    mkEvent({ year: 2021, type: 'MC' }),
    mkEvent({ year: 2020, type: 'C' }),
    mkEvent({ year: 2020, type: 'C' }),
  ];

  it('groups and counts by year', () => {
    const result = computeYearStats(events, { col: 'year', dir: 'desc', yearDir: 'desc' });
    expect(result.find(r => r.year === 2022).c).toBe(2);
    expect(result.find(r => r.year === 2021).c).toBe(1);
    expect(result.find(r => r.year === 2021).mc).toBe(1);
  });

  it('col=year, dir=desc: newest year first', () => {
    const result = computeYearStats(events, { col: 'year', dir: 'desc', yearDir: 'desc' });
    expect(result[0].year).toBe(2022);
    expect(result[2].year).toBe(2020);
  });

  it('col=year, dir=asc: oldest year first', () => {
    const result = computeYearStats(events, { col: 'year', dir: 'asc', yearDir: 'asc' });
    expect(result[0].year).toBe(2020);
    expect(result[2].year).toBe(2022);
  });

  it('col=c: higher count first, yearDir used as tiebreaker', () => {
    // 2022 and 2020 both have 2 C-type events; 2021 has 1
    const descResult = computeYearStats(events, { col: 'c', dir: 'desc', yearDir: 'desc' });
    expect(descResult[0].year).toBe(2022); // tied 2 concerts, newer first
    expect(descResult[1].year).toBe(2020);
    expect(descResult[2].year).toBe(2021);

    const ascResult = computeYearStats(events, { col: 'c', dir: 'desc', yearDir: 'asc' });
    expect(ascResult[0].year).toBe(2020); // tied 2 concerts, older first
    expect(ascResult[1].year).toBe(2022);
  });
});

// ---- computePerformerStats ----

describe('computePerformerStats', () => {
  const defaultSort = { col: 'c' };

  it('counts all performers when no query', () => {
    const events = [
      mkEvent({ performers: [mkPerf('Opeth'), mkPerf('Enslaved')] }),
      mkEvent({ performers: [mkPerf('Opeth')] }),
    ];
    const result = computePerformerStats(events, '', false, defaultSort);
    expect(result.find(p => p.name === 'Opeth').c).toBe(2);
    expect(result.find(p => p.name === 'Enslaved').c).toBe(1);
  });

  it('when query matches a performer, only that performer counted for matching events', () => {
    const events = [
      mkEvent({ performers: [mkPerf('Opeth'), mkPerf('Enslaved')] }),
      mkEvent({ performers: [mkPerf('Enslaved')] }),
    ];
    // "opeth" matches Opeth in event 1; event 2 has no match so all its performers counted
    const result = computePerformerStats(events, 'opeth', false, defaultSort);
    const opeth = result.find(p => p.name === 'Opeth');
    const enslaved = result.find(p => p.name === 'Enslaved');
    expect(opeth.c).toBe(1);    // matched performer in event 1
    expect(enslaved.c).toBe(1); // all-count from event 2 (no name match there)
  });

  it('when query matches no performer in an event, all performers of that event are counted', () => {
    const events = [
      mkEvent({ performers: [mkPerf('Opeth'), mkPerf('Enslaved')], venue: 'Tavastia' }),
    ];
    // Query matches venue but no performer
    const result = computePerformerStats(events, 'tavastia', false, defaultSort);
    expect(result).toHaveLength(2);
  });

  it('showMinis=false excludes MC performers', () => {
    const events = [
      mkEvent({ performers: [mkPerf('Main', 'C'), mkPerf('Opener', 'MC')] }),
    ];
    const result = computePerformerStats(events, '', false, defaultSort);
    expect(result.find(p => p.name === 'Main')).toBeDefined();
    expect(result.find(p => p.name === 'Opener')).toBeUndefined();
  });

  it('showMinis=true includes MC performers', () => {
    const events = [
      mkEvent({ performers: [mkPerf('Main', 'C'), mkPerf('Opener', 'MC')] }),
    ];
    const result = computePerformerStats(events, '', true, defaultSort);
    const opener = result.find(p => p.name === 'Opener');
    expect(opener).toBeDefined();
    expect(opener.mc).toBe(1);
    expect(opener.c).toBe(0);
  });

  it('default sort (col=c): higher count first, name tiebreak', () => {
    const events = [
      mkEvent({ performers: [mkPerf('Opeth'), mkPerf('Enslaved')] }),
      mkEvent({ performers: [mkPerf('Opeth')] }),
      mkEvent({ performers: [mkPerf('Amon Amarth')] }),
    ];
    const result = computePerformerStats(events, '', false, defaultSort);
    expect(result[0].name).toBe('Opeth'); // 2 concerts
    // Amon Amarth and Enslaved both have 1 — alphabetical tiebreak
    expect(result[1].name).toBe('Amon Amarth');
    expect(result[2].name).toBe('Enslaved');
  });

  it('col=name: alphabetical ascending', () => {
    const events = [
      mkEvent({ performers: [mkPerf('Opeth'), mkPerf('Enslaved'), mkPerf('Amon Amarth')] }),
    ];
    const result = computePerformerStats(events, '', false, { col: 'name' });
    expect(result[0].name).toBe('Amon Amarth');
    expect(result[1].name).toBe('Enslaved');
    expect(result[2].name).toBe('Opeth');
  });

  it('counts C and MC separately per performer', () => {
    const events = [
      mkEvent({ performers: [mkPerf('Fish', 'C')] }),
      mkEvent({ type: 'MC', performers: [mkPerf('Fish', 'MC')] }),
    ];
    const result = computePerformerStats(events, '', true, defaultSort);
    const fish = result.find(p => p.name === 'Fish');
    expect(fish.c).toBe(1);
    expect(fish.mc).toBe(1);
  });
});
