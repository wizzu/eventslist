# Event Line Format

Each line in `events.txt` represents one event. Blank lines are ignored.

## Evolving the Format

The format can be changed if there's a good reason (e.g. to simplify parsing or remove ambiguity). Any proposed change must:
- Be small and targeted — nothing that requires touching every line in the file
- Come with a concrete proposal before any files are modified
- Be applied consistently to `events.txt`, `sample/events.txt`, `gigcount.py`, and this document

## Basic Structure

```
DATE  DESCRIPTION; LOCATION [TAG]
```

- **DATE** — `D.M.YYYY` format (day and month may be 1-2 digits, year is 4 digits). A `?` can appear in day/month to indicate uncertainty (e.g. `10?.7.1994`).
- One or more spaces separate the date from the description (columns are space-aligned).
- **DESCRIPTION** — the event content (see below).
- **LOCATION** — venue and optionally city/country, after the semicolon.
- **TAG** — optional, at the end of the line:
  - `[C]` — concert (gig)
  - `[MC]` — mini-concert: fewer than 6 songs and under 30 minutes. Applied per performer — a multi-act event can have individual performers tagged `[MC]` if their slot was short, even if the overall event was long.

## Description Variants

### Simple event (no tag)
```
6.8.1994   Ropecon 1994; Paasitorni (2 days)
```

### Concert with single performer
```
5.5.1994   Jethro Tull; Kulttuuritalo [C]
```

### Concert with multiple performers
Performers are separated by commas (or `+`):
```
24.5.1992  U2, Soundgarden; Donauinsel, Vienna, Austria [C]
```

### Named event (e.g. festival) with performers
The event name comes first, followed by a colon, then the performers:
```
9.7.1995   Ruisrock-95: The Beautiful South, Simple Minds; Ruissalo, Turku [C]
```

### Performer with extra detail
Parenthesized detail after the performer name (e.g. acoustic set, special guests):
```
12.3.2005  Fish (acoustic); Tavastia [C]
```

### Per-performer concert type override
Individual performers can have `[C]` or `[MC]` after their name to override the line-level tag. This handles cases where some performers at an event were full concerts and others were mini-concerts:
```
Performer A, Performer B, Performer C [MC]; Example Location [C]
```
Here A and B are full concerts, C is a mini-concert.

### Event comment
An optional parenthesized comment can appear after the location (and before the tag):
```
6.8.1994   Ropecon 1994; Paasitorni (2 days)
24.4.2004  Nerdee; Ylä-Pirkanmaan Messut, Mänttä (1) [C]
24.4.2004  Nerdee; Ylä-Pirkanmaan Messut, Mänttä (2) [C]
```
The comment applies to the whole event. Common uses: event duration (`2 days`), show number disambiguation when the same performer played multiple shows at the same venue on the same date (`(1)`, `(2)`).

Currently the comment is not parsed out as a separate field — it is included in the location string.

## Statistics

- **Concerts** are events tagged `[C]` or `[MC]` (at line level or per-performer).
- **Full concert (gig)**: `[C]`
- **Mini-concert**: `[MC]`
- Statistics are reported as `N (M)` where N = full concerts, M = mini-concerts.
- Per-performer stats count each performer separately at each event they appear in.
- Non-concert events (no tag) are counted separately as "other".
