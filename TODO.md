# TODO

## Setup
- [x] Project scaffolding (CLAUDE.md, README, .gitignore, TODO)
- [x] Define and document the event line format (FORMAT.md)
- [x] Design document (DESIGN.md)
- [x] Get gigcount.py into the repo
- [ ] Flesh out CLAUDE.md: project structure, conventions, verification steps (interview user and/or propose defaults once web app work begins)

## Web App — Implementation
- [x] Vendor Alpine.js locally (spa/vendor/alpine-3.15.8.min.js)
- [ ] Add a command/script to update vendored Alpine.js to the latest release
- [ ] SPA skeleton (index.html, app.js, style.css)
- [ ] Event parser in JS (based on FORMAT.md spec)
- [ ] Event listing view (newest first)
- [ ] Search/filter box (matches name, location, year)
- [ ] Statistics view (performer counts, yearly counts, totals)
- [ ] Filtered statistics (stats update based on current filter)

## Future / Nice-to-have
- [ ] Sort order toggle (newest/oldest first)
- [ ] Evaluate listing + stats as dual/split view vs toggle
- [ ] Rich statistics visualizations (bar charts, graphs, etc.)
- [ ] Responsive design
- [ ] Configurable events.txt path

## CLI
- [x] gigcount.py in the repo
- [ ] Ensure gigcount.py works standalone with current events.txt
