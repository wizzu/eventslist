#!/usr/bin/env bun
// Produces the same output format as gigcount.py's format_output(),
// using the JS parser and stats functions from spa/static/.
// Usage: bun tests/cli/gigcount_js_driver.js <events_file>

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const { parseEvents, parseQuery, termMatches } = require(path.join(repoRoot, 'spa/static/parser.js'));

// stats.js reads parseQuery and termMatches as browser globals; inject them before requiring.
Object.assign(global, { parseQuery, termMatches });
const { computePerformerStats, computeYearStats } = require(path.join(repoRoot, 'spa/static/stats.js'));

const eventsFile = process.argv[2];
if (!eventsFile) {
  console.error('Usage: gigcount_js_driver.js <events_file>');
  process.exit(1);
}

const text = fs.readFileSync(eventsFile, 'utf8');
const events = parseEvents(text);

// Performer stats: no query filter, include minis, sort by count desc then name.
// Note: JS uses localeCompare for name tiebreak; Python uses Unicode code-point order.
// The comparison test compares counts by name (dict lookup), not line order.
const perfStats = computePerformerStats(events, '', true, { col: 'count' });

// Year stats: sort by year ascending.
const yearStats = computeYearStats(events, { col: 'year', dir: 'asc' });

// Totals: sum from year stats (same source as Python's total_stats).
let totalGigs = 0, totalMinis = 0;
for (const y of yearStats) {
  totalGigs += y.c;
  totalMinis += y.mc;
}

// Format output matching gigcount.py's format_output():
//   "{gigs} {(minigigs) if minigigs > 0 else ''}".padEnd(8) + " " + name
//   "{year}: {gigs}{' (minigigs)' if minigigs}"
//   "Total: {gigs} ({totalMinis})"
const lines = [];

for (const p of perfStats) {
  const counts = p.mc > 0 ? `${p.c} (${p.mc})` : `${p.c} `;
  lines.push(`${counts.padEnd(8)} ${p.name}`);
}

for (const y of yearStats) {
  const miniPart = y.mc ? ` (${y.mc})` : '';
  lines.push(`${y.year}: ${y.c}${miniPart}`);
}

lines.push(`Total: ${totalGigs} (${totalMinis})`);

console.log(lines.join('\n'));
