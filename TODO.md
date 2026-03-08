# TODO

## Setup
- [x] Project scaffolding (CLAUDE.md, README, .gitignore, TODO)
- [x] Define and document the event line format (FORMAT.md)
- [x] Design document (DESIGN.md)
- [x] Get gigcount.py into the repo
- [ ] Flesh out CLAUDE.md: project structure, conventions, verification steps (interview user and/or propose defaults once web app work begins)

## Web App — Implementation
Steps are intentionally small to facilitate incremental learning alongside building.

- [x] Vendor Alpine.js locally (spa/vendor/alpine-3.15.8.min.js)
- [ ] Add a command/script to update vendored Alpine.js to the latest release
- [ ] Minimal `index.html` shell — boilerplate, load Alpine.js + CSS + JS, static placeholder content
- [ ] Base CSS — page layout structure (header, main area), basic visual skeleton
- [ ] Wire up Alpine.js — `x-data` on the app root, confirm reactivity works with a simple test
- [ ] Fetch `events.txt` on load — read the file via HTTP, log raw text to confirm it works
- [ ] JS parser — parse raw text into event objects (based on FORMAT.md)
- [ ] Event listing view — render parsed events with `x-for`, newest first
- [ ] Search/filter box — `x-model` input, filter the event list reactively
- [ ] Header summary counts — total events, filtered count
- [ ] Statistics view — performer counts table (derived from filtered list)
- [ ] Per-year counts table
- [ ] Confirm stats match gigcount.py output (validation step)

## Future / Nice-to-have
- [ ] Add a favicon (currently causes a 404 in the browser console)
- [ ] Sort order toggle (newest/oldest first)
- [ ] Evaluate listing + stats as dual/split view vs toggle
- [ ] Rich statistics visualizations (bar charts, graphs, etc.)
- [ ] Responsive design
- [ ] Configurable events.txt path

## CLI
- [x] gigcount.py in the repo
- [ ] Ensure gigcount.py works standalone with current events.txt
