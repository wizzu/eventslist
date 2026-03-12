# Development Notes

Practical reference for working on this project.

## File Structure

```
spa/
  index.html              # SPA entry point; x-data="app" on <body>
  events.txt              # Event data (master copy lives outside repo)
  static/
    app.js                # Alpine component + JS parser
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

## Browser Caching

`python3 -m http.server` does not disable caching. After JS or CSS changes, **hard refresh** (Cmd+Shift+R) to avoid serving stale files. Check the browser console for Alpine expression errors after HTML/JS changes.

A proper dev server (e.g. `npx serve`) sends `Cache-Control: no-store` by default and avoids this entirely.

## Alpine and Tables

`<template x-for>` must be placed directly inside `<table>`, not inside `<tbody>` — the HTML parser may relocate or drop `<template>` tags inside `<tbody>` before Alpine can process them.
