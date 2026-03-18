#!/usr/bin/env python3

import argparse
import re
import sys
import datetime


# ---- Parser ----
# Keep in sync with spa/static/app.js

# Matches a full event line.
# Named groups: year, event (optional festival/event name prefix ending in ": "),
#               performers, venue, count (optional trailing comment e.g. "(1)"),
#               type (optional " [C]" or " [MC]").
LINE_PAT = re.compile(
    r"^[\d?]{1,3}\.[\d?]{1,2}\.(?P<year>\d{4})\s+"
    r"(?P<event>[\w '!?,:&+\-]+: )?"
    r"(?P<performers>.+); "
    r"(?P<venue>[\w, '\.:()&-]+)"
    r"(?P<count>\(\d+[ \w]*\))?"
    r"(?P<type>( \[M?C\])?)$"
)

# Split performers on comma or +, but NOT inside parentheses.
# e.g. "Fish (with band), Opeth" splits into ["Fish (with band)", "Opeth"]
PERF_SPLIT_PAT = re.compile(r'[,+]\s+(?![^()]*\))')

# Strip optional trailing parenthesized detail from performer name.
# "Fish (acoustic)" → name="Fish"
PERF_NAME_PAT = re.compile(r"^(?P<name>[^()]+)( \(.+\))?$")


def parse_line(raw):
    """Parse one event line. Returns an event dict or None if the line didn't match."""
    m = LINE_PAT.fullmatch(raw)
    if not m:
        return None

    year = int(m.group('year'))
    event_raw = m.group('event')
    event_name = event_raw.removesuffix(': ').strip() if event_raw else None
    performers_str = m.group('performers')
    # Extract trailing (comment) from venue, e.g. "Tavastia (2)" → venue="Tavastia", comment="2".
    # Post-processing mirrors the JS parser (parser.js), because the main regex's venue
    # character class includes parentheses, so the count group never captures.
    raw_venue = m.group('venue').strip()
    loc_match = re.fullmatch(r'(.*\S)\s*\(([^)]+)\)', raw_venue)
    venue = loc_match.group(1).strip() if loc_match else raw_venue
    comment = loc_match.group(2) if loc_match else None
    type_str = m.group('type').strip() if m.group('type') else None
    type_ = 'MC' if type_str == '[MC]' else ('C' if type_str == '[C]' else None)

    performers = []
    if type_ is not None:
        # Concert or mini-concert: parse individual performers from description.
        for p in PERF_SPLIT_PAT.split(performers_str):
            p = p.strip()
            if not p:
                continue
            mp = PERF_NAME_PAT.fullmatch(p)
            if not mp:
                print(f"Performer not matched: {p}")
                sys.exit(1)
            name = mp.group('name').strip()
            perf_type = type_

            # Per-performer type override, e.g. "Opening Act [MC]" in a [C] event.
            if name.endswith(' [C]'):
                perf_type = 'C'
                name = name.removesuffix(' [C]')
            elif name.endswith(' [MC]'):
                perf_type = 'MC'
                name = name.removesuffix(' [MC]')

            performers.append({'name': name, 'type': perf_type})

    # event_type is the line-level tag directly — no upgrade applied.
    # Previously, a multi-performer [MC] event was upgraded to [C] on the
    # theory that the event itself was long even if individual sets were short.
    # Removed: a concert requires at least one full-concert performance; an
    # event where every performer is [MC] is a mini-concert at event level too.
    event_type = type_

    return {
        'year': year,
        'event_name': event_name,
        'performers': performers,
        'venue': venue,
        'comment': comment,
        'type': event_type,
        'raw': raw,
    }


def parse_events(text):
    """Parse all lines. Returns list of event dicts. Warns on non-matched lines."""
    events = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        event = parse_line(line)
        if event:
            events.append(event)
        else:
            print(f"Non-matched line: {line}")
    return events


# ---- Stats ----

def compute_stats(events):
    """Compute year, total, and performer stats from a list of event dicts.

    Returns a tuple: (year_stats, total_stats, perf_stats)
      year_stats:  {year_str: {"gigs": int, "minigigs": int, "other": int}}
      total_stats: {"gigs": int, "minigigs": int, "other": int}
      perf_stats:  {name: {"gigs": int, "minigigs": int}}
    """
    year_stats = {}
    total_stats = {"gigs": 0, "minigigs": 0, "other": 0}
    perf_stats = {}

    for event in events:
        year = str(event['year'])
        is_gig = event['type'] == 'C'
        is_minigig = event['type'] == 'MC'
        is_other = event['type'] is None

        if year not in year_stats:
            year_stats[year] = {"gigs": 0, "minigigs": 0, "other": 0}
        if is_gig:
            year_stats[year]["gigs"] += 1
            total_stats["gigs"] += 1
        if is_minigig:
            year_stats[year]["minigigs"] += 1
            total_stats["minigigs"] += 1
        if is_other:
            year_stats[year]["other"] += 1
            total_stats["other"] += 1

        for p in event['performers']:
            name = p['name']
            if name not in perf_stats:
                perf_stats[name] = {"gigs": 0, "minigigs": 0}
            if p['type'] == 'C':
                perf_stats[name]["gigs"] += 1
            elif p['type'] == 'MC':
                perf_stats[name]["minigigs"] += 1

    return year_stats, total_stats, perf_stats


# ---- Output ----

def format_output(year_stats, total_stats, perf_stats):
    """Format stats as the CLI output string (without the Generated timestamp)."""
    lines = []

    for key, value in sorted(perf_stats.items(), key=lambda x: (-1 * (x[1]["gigs"] * 100 + x[1]["minigigs"]), x[0])):
        perf_gigcount = perf_stats[key]["gigs"]
        perf_minigigcount = perf_stats[key]["minigigs"]
        counts = f"{perf_gigcount} {'('+str(perf_minigigcount)+')' if perf_minigigcount > 0 else ''}"
        lines.append(f"{counts:8} {key}")

    for year in sorted(year_stats):
        gigcount = year_stats[year]["gigs"]
        minigigcount = year_stats[year]["minigigs"]
        lines.append(f"{year}: {gigcount}{' ('+str(minigigcount)+')' if minigigcount else ''}")

    totalgigs = total_stats["gigs"]
    totalminigigs = total_stats["minigigs"]
    lines.append(f"Total: {totalgigs} ({totalminigigs})")

    return "\n".join(lines)


def main():
    args_parser = argparse.ArgumentParser(description="Gigcount")
    args_parser.add_argument("events_file", type=str, help="path to event text file")
    args = args_parser.parse_args()

    with open(args.events_file) as f:
        events = parse_events(f.read())

    year_stats, total_stats, perf_stats = compute_stats(events)
    print(format_output(year_stats, total_stats, perf_stats))

    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M %Z")
    print(f"Generated: {ts}")


if __name__ == '__main__':
    main()
