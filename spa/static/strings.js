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
    pageTitle:       'Events',
    miniDef:         'mini-concert: 5 or fewer songs, under 30 min',

    // Search
    searchPlaceholder: 'Search events…',
    searchClearLabel:  'Clear search',      // aria-label on the ✕ button

    // Stats summary labels (both mobile and desktop panels)
    statEvents:       'Events',
    statPerformances: 'Performances',
    statPerformers:   'Performers',
    statYears:        'Years',

    // Listing toolbar
    miniToggle:      'mini-concerts',
    sortOldestTitle: 'Sort: oldest first',  // title attribute (tooltip)
    sortNewestTitle: 'Sort: newest first',
    sortOldestLabel: '↑ Oldest first',      // visible button text
    sortNewestLabel: '↓ Newest first',

    // Listing toolbar count line: "3 (1 mini) matching events"
    // Note: 'matching' is inserted between the count and 'event/events' only when a search is active.
    matchingLabel: ' matching',
    eventLabel: n => n === 1 ? ' event' : ' events',

    // Collapsed section hint
    hiddenHint: n => `· · · ${n} hidden · · ·`,

    // Scroll-to-top button
    scrollTopLabel: 'Scroll to top',        // aria-label
    scrollTopText:  '↑ Top',

    // Stats section headings
    sectionByYear:    'Events by year',
    sectionByVenue:   'Events by venue',
    sectionPerformers: 'Performers',

    // Stats table column headers
    colYear:  'Year',
    colCount: 'Count',
    colVenue: 'Venue',
    colName:  'Name',

    // Status line (shown while loading / after load)
    loading: 'Loading…',
    loaded:  n => `Loaded ${n} events.`,

    // Header bar summary: "42 concerts (+ 3 mini-concerts)"
    headerCounts: (c, mc) => `${c} concert${c !== 1 ? 's' : ''} (+ ${mc} mini-concert${mc !== 1 ? 's' : ''})`,

    // Prefix inside the search mode brackets: "" → "(performer)", "hits: " → "(hits: performer)".
    searchModePrefix: '',

    // Search mode labels shown in brackets after the event count, e.g. "(performer · venue)".
    // Multiple labels are joined with " · ".
    modePerformer: 'performer',
    modeYear:      'year',
    modeVenue:     'venue',
    modeEvent:     'event',

    // Mini-concert count badge tooltip (in fmtCountsHtml)
    tooltipMiniEvents: n => `${n} mini-concert event${n !== 1 ? 's' : ''}`,
    tooltipMiniOnlyC:  n => `${n} full event${n !== 1 ? 's' : ''} where every performance was a mini-concert`,
    tooltipHidden1:    'hidden',
    tooltipHidden2:    'both are hidden',
    tooltipHiddenN:    n => `all ${n} are hidden`,
    tooltipWhenOff:    'when mini-concerts are turned off',
  },

  fi: {
    // Header
    pageTitle: 'Tapahtumat',
    miniDef:   'minikeikka: enintään 5 biisiä, alle 30 min',

    // Search
    searchPlaceholder: 'Hae tapahtumia…',
    searchClearLabel:  'Tyhjennä haku',

    // Stats summary labels
    statEvents:       'Tapahtumat',
    statPerformances: 'Esiintymiset',
    statPerformers:   'Esiintyjät',
    statYears:        'Vuodet',

    // Listing toolbar
    miniToggle:      'minikeikat',
    sortOldestTitle: 'Järjestys: vanhin ensin',
    sortNewestTitle: 'Järjestys: uusin ensin',
    sortOldestLabel: '↑ Vanhin ensin',
    sortNewestLabel: '↓ Uusin ensin',

    // Listing toolbar count line: "3 tapahtumaa (hakuosumat: artisti)"
    // matchingLabel is empty — the search context is conveyed by searchModePrefix instead.
    matchingLabel: '',
    eventLabel: n => n === 1 ? ' tapahtuma' : ' tapahtumaa',

    // Collapsed section hint
    hiddenHint: n => `· · · ${n} piilotettu · · ·`,

    // Scroll-to-top button
    scrollTopLabel: 'Takaisin ylös',
    scrollTopText:  '↑ Ylös',

    // Stats section headings
    sectionByYear:     'Tapahtumat vuosittain',
    sectionByVenue:    'Tapahtumat paikoittain',
    sectionPerformers: 'Esiintyjät',

    // Stats table column headers
    colYear:  'Vuosi',
    colCount: 'Määrä',
    colVenue: 'Paikka',
    colName:  'Nimi',

    // Status line
    loading: 'Ladataan…',
    loaded:  n => `Ladattu ${n} tapahtumaa.`,

    // Header bar summary: "42 keikkaa (+ 3 minikeikkaa)"
    headerCounts: (c, mc) => `${c} keikka${c !== 1 ? 'a' : ''} (+ ${mc} minikeikka${mc !== 1 ? 'a' : ''})`,

    // Prefix inside the search mode brackets: "3 tapahtumaa (hakuosumat: artisti)"
    searchModePrefix: 'hakuosumat: ',

    // Search mode labels
    modePerformer: 'esiintyjä',
    modeYear:      'vuosi',
    modeVenue:     'paikka',
    modeEvent:     'tapahtuma',

    // Mini-concert count badge tooltip
    tooltipMiniEvents: n => `${n} minikeikka${n !== 1 ? 'a' : ''}`,
    tooltipMiniOnlyC:  n => `${n} tapahtuma${n !== 1 ? 'a' : ''}, jossa kaikki esiintymiset olivat minikeikkoja`,
    tooltipHidden1:    'piilotettu',
    tooltipHidden2:    'molemmat piilotettu',
    tooltipHiddenN:    n => `kaikki ${n} piilotettu`,
    tooltipWhenOff:    'kun minikeikat on piilotettu',
  },
};
