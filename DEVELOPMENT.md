# Development Notes

Practical reference for working on this project.

## File Structure

```
spa/
  index.html              # SPA entry point; x-data="app" on <body>
  events.txt              # Event data (master copy lives outside repo)
  static/
    app.js                # Alpine component + JS parser
    strings.js            # Localisation strings (English + Finnish)
    style.css             # All styles
    vendor/
      alpine-3.15.8.min.js  # versioned file
      alpine.min.js         # symlink -> alpine-x.y.z.min.js (stable name used in index.html)
scripts/
  update-alpine.sh          # check and update vendored Alpine.js
sample/
  events.txt              # Sample data, may be outdated
gigcount.py               # CLI stats tool (standalone, predates the web app)
FORMAT.md                 # Event line format spec
DESIGN.md                 # Architecture and UI design decisions
TODO.md                   # Task list
```

## Conventions

**JavaScript:**
- Derived/computed state goes in Alpine `get` getters, not imperative code
- No direct DOM manipulation — let Alpine handle rendering
- Parser functions are plain JS outside the Alpine component

**CSS:**
- Comment non-obvious rules (e.g. `min-height: 0` for flex scrolling, `box-sizing`, vendor prefixes)
- Use `rem` for font sizes and spacing, `px` only for borders and fine details

**Commits:**
- Small and focused — one logical change per commit

**Version:**
- `window.__appVersion` in `spa/index.html` (e.g. `'v7'`)
- Bump when changes are substantial enough to constitute a release
- At the end of a session with notable changes, ask the user whether to bump the version

## Browser Caching

`python3 -m http.server` does not disable caching. After JS or CSS changes, **hard refresh** (Cmd+Shift+R) to avoid serving stale files. Check the browser console for Alpine expression errors after HTML/JS changes.

A proper dev server (e.g. `npx serve`) sends `Cache-Control: no-store` by default and avoids this entirely.

## Localisation

UI strings live in `spa/static/strings.js` as a `STRINGS` object with `en` and `fi` keys.

**Adding a new string:**
1. Add the key to **both** `en` and `fi` blocks in `strings.js`.
2. Use a plain string for static text; a `function(n)` for text that includes counts or variables.
3. In `index.html`: `x-text="t.key"` or `:placeholder="t.key"`.
4. In `app.js`: `this.t.key` or `this.t.key(n)` for function strings.
5. Keep key names in English regardless of UI language.

**Finnish note:** Finnish uses the partitive case for quantities > 1 (e.g. `1 keikka`, `2 keikkaa`). Dynamic strings that include counts use functions to handle this.

The active language is stored in `this.lang` on the Alpine component and defaults to `'fi'` if `navigator.language` starts with `'fi'`, otherwise `'en'`. It is also persisted to `localStorage` so the user's toggle choice survives page reloads.

## Alpine and Tables

`<template x-for>` must be placed directly inside `<table>`, not inside `<tbody>` — the HTML parser may relocate or drop `<template>` tags inside `<tbody>` before Alpine can process them.
