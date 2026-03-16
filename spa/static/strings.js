// UI strings for localisation.
//
// Each key is used via the `t` computed property in the Alpine component (app.js).
// In templates: x-text="t.foo" or :placeholder="t.foo"
// For dynamic strings (functions): called as t.foo(n) in JS code.
//
// Finnish note: Finnish uses partitive case for quantities (2+ items):
//   e.g.  1 keikka,  2 keikkaa,  3 keikkaa
//         1 tapahtuma,  2 tapahtumaa
// Functions handle this where needed.
//
// Adding a new string:
// 1. Add the key to BOTH en and fi blocks (same key, appropriate translation).
// 2. Use a plain string value for static text; a function for text with counts or variables.
// 3. Reference it in index.html (x-text="t.key") or app.js (this.t.key / this.t.key(n)).
// 4. Keep the key names in English regardless of UI language.

const STRINGS = {
  en: {
    // Header
    pageTitle:       'Concerts',
    miniDef:         'mini-concert: 5 or fewer songs, under 30 min',

    // Search
    searchPlaceholder: 'Search concerts…',
    searchClearLabel:  'Clear search',      // aria-label on the ✕ button

    // Stats summary labels (both mobile and desktop panels)
    statConcerts:     'Concerts',
    statPerformances: 'Performances',
    statPerformers:   'Performers',
    statVenues:       'Venues',
    statYears:        'Years',

    // Listing toolbar
    miniToggle:       'include mini-concerts',
    miniToggleMobile: 'include minis',
    sortOldestTitle: 'Sort: oldest first',  // title attribute (tooltip)
    sortNewestTitle: 'Sort: newest first',
    sortOldestLabel: '↑ Oldest first',      // visible button text
    sortNewestLabel: '↓ Newest first',

    // Toolbar/collapse count line: "3 (1 mini) matching concerts"
    // Note: 'matching' is inserted between the count and the label only when a search is active.
    matchingLabel: ' matching',
    concertLabel: n => n === 1 ? ' concert' : ' concerts',

    // Collapsed section hint
    hiddenHint: n => `· · · ${n} hidden · · ·`,

    // Scroll-to-top button
    scrollTopLabel: 'Scroll to top',        // aria-label
    scrollTopText:  '↑ Top',

    // Stats section headings
    sectionByYear:    'Concerts by year',
    sectionByVenue:   'Concerts by venue',
    sectionPerformers: 'Performers',

    // Stats table column headers
    colYear:  'Year',
    colCount: 'Count',
    colVenue: 'Venue',
    colName:  'Name',

    // Status line (shown while loading / after load)
    loading: 'Loading…',
    loaded:  n => `Loaded ${n} events.`,

    // Header bar main line: "42 concerts, 73 performances"
    headerCounts: (c, perf) => `${c} concert${c !== 1 ? 's' : ''}, ${perf} performance${perf !== 1 ? 's' : ''}`,
    // Header bar mini line: "+5 mini-concerts, +7 mini-performances" (zeros omitted)
    headerMiniLine: (mc, mperf) => {
      const parts = [];
      if (mc > 0)    parts.push(`+${mc} mini-concert${mc !== 1 ? 's' : ''}`);
      if (mperf > 0) parts.push(`+${mperf} mini-performance${mperf !== 1 ? 's' : ''}`);
      return parts.join(', ');
    },

    // Always-visible note below the search area.
    // Idle (no search): allConcertsLabel. Active: searchMatches(mode). Zero results: non-breaking space.
    allConcertsLabel: 'Showing all concerts',
    searchMatches: mode => `Matched by ${mode}`,
    // Conjunction used to join multiple mode labels: "performer names and venues".
    modeJoin:      ' and ',
    // Shown when a search matches multiple categories.
    mixedSearchNote: 'Results span multiple categories — to narrow down, try a more specific search term.',
    // Shown on mobile when a search returns no results.
    noMatchLabel: 'No concerts matched.',

    // Search mode labels — describe what field a term matched.
    modePerformer: 'performer names',
    modeYear:      'year',
    modeVenue:     'venues',
    modeEvent:     'event names',

    // Mini-concert count badge tooltip (in fmtCountsHtml)
    tooltipMiniEvents: n => `${n} mini-concert${n !== 1 ? 's' : ''}`,
    tooltipHidden1:    'hidden',
    tooltipHiddenN:    n => `all ${n} are hidden`,
    tooltipWhenOff:    'when mini-concerts are turned off',

    // Mobile listing summary: second line of detail stats.
    // perf = full performances, perfMc = mini performances (omitted when 0),
    // performers = full-concert performers, years = years with concerts.
    listingSummaryDetail: (perf, perfMc, performers, venues, years) => {
      const perfStr = perfMc
        ? `${perf} performance${perf !== 1 ? 's' : ''} (+${perfMc} mini)`
        : `${perf} performance${perf !== 1 ? 's' : ''}`;
      const performersStr = `${performers} performer${performers !== 1 ? 's' : ''}`;
      const venuesStr = `${venues} venue${venues !== 1 ? 's' : ''}`;
      const yearsStr = years === 1 ? '1 year' : `across ${years} years`;
      const left  = `${perfStr} · ${performersStr}`;
      const right = ` · ${venuesStr} · ${yearsStr}`;
      return `<span style="white-space:nowrap">${left}</span><wbr><span style="white-space:nowrap">${right}</span>`;
    },
  },

  fi: {
    // Header
    pageTitle: 'Keikat',
    miniDef:   'minikeikka: enintään 5 biisiä, alle 30 min',

    // Search
    searchPlaceholder: 'Hae keikkoja…',
    searchClearLabel:  'Tyhjennä haku',

    // Stats summary labels
    statConcerts:     'Keikat',
    statPerformances: 'Keikka-esitykset',
    statPerformers:   'Esiintyjät',
    statVenues:       'Keikkapaikat',
    statYears:        'Vuodet',

    // Listing toolbar
    miniToggle:       'myös minikeikat',
    miniToggleMobile: 'myös minikeikat',
    sortOldestTitle: 'Järjestys: vanhin ensin',
    sortNewestTitle: 'Järjestys: uusin ensin',
    sortOldestLabel: '↑ Vanhin ensin',
    sortNewestLabel: '↓ Uusin ensin',

    matchingLabel: '',
    concertLabel: n => n === 1 ? ' keikka' : ' keikkaa',

    // Collapsed section hint
    hiddenHint: n => `· · · ${n} piilotettu · · ·`,

    // Scroll-to-top button
    scrollTopLabel: 'Takaisin ylös',
    scrollTopText:  '↑ Ylös',

    // Stats section headings
    sectionByYear:     'Keikat vuosittain',
    sectionByVenue:    'Keikat paikoittain',
    sectionPerformers: 'Esiintyjät',

    // Stats table column headers
    colYear:  'Vuosi',
    colCount: 'Määrä',
    colVenue: 'Paikka',
    colName:  'Nimi',

    // Status line
    loading: 'Ladataan…',
    loaded:  n => `Ladattu ${n} tapahtumaa.`,

    // Header bar main line: "42 keikkaa, 73 keikka-esitystä"
    headerCounts: (c, perf) => `${c} keikka${c !== 1 ? 'a' : ''}, ${perf} keikka-esitys${perf !== 1 ? 'tä' : ''}`,
    // Header bar mini line: "+5 minikeikkaa, +7 mini-esitystä" (zeros omitted)
    headerMiniLine: (mc, mperf) => {
      const parts = [];
      if (mc > 0)    parts.push(`+${mc} minikeikka${mc !== 1 ? 'a' : ''}`);
      if (mperf > 0) parts.push(`+${mperf} mini-esitys${mperf !== 1 ? 'tä' : ''}`);
      return parts.join(', ');
    },

    allConcertsLabel: 'Näytetään kaikki keikat',
    searchMatches: mode => `Hakuosumat ${mode}`,
    modeJoin:      ' ja ',
    mixedSearchNote: 'Hakutulokset kattavat useita kategorioita — jos etsit vain yhtä, tarkenna hakua.',
    noMatchLabel: 'Ei osumia hausta.',

    // Search mode labels — inessive/adessive phrases that complete "Hakuosumat ..."
    modePerformer: 'esiintyjien nimissä',
    modeYear:      'vuosiluvuissa',
    modeVenue:     'tapahtumapaikoissa',
    modeEvent:     'tapahtumien nimissä',

    // Mini-concert count badge tooltip
    tooltipMiniEvents: n => `${n} minikeikka${n !== 1 ? 'a' : ''}`,
    tooltipHidden1:    'piilotettu',
    tooltipHiddenN:    n => `kaikki ${n} piilotettu`,
    tooltipWhenOff:    'kun minikeikat on piilotettu',

    // Mobile listing summary: second line of detail stats.
    listingSummaryDetail: (perf, perfMc, performers, venues, years) => {
      const perfStr = perfMc
        ? `${perf} ${perf !== 1 ? 'keikka-esitystä' : 'keikka-esitys'} (+${perfMc} mini)`
        : `${perf} ${perf !== 1 ? 'keikka-esitystä' : 'keikka-esitys'}`;
      const performersStr = `${performers} ${performers !== 1 ? 'esiintyjää' : 'esiintyjä'}`;
      const venuesStr = `${venues} ${venues !== 1 ? 'paikkaa' : 'paikka'}`;
      const yearsStr = years === 1 ? '1 vuosi' : `${years} eri vuonna`;
      const left  = `${perfStr} · ${performersStr}`;
      const right = ` · ${venuesStr} · ${yearsStr}`;
      return `<span style="white-space:nowrap">${left}</span><wbr><span style="white-space:nowrap">${right}</span>`;
    },
  },
};
