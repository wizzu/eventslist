#!/usr/bin/env python3

import argparse
import re
import csv
import datetime


parser = argparse.ArgumentParser(description="Gigcount")
parser.add_argument("events_file", type=str, help="path to event text file")

args = parser.parse_args()
events_file = args.events_file


LINE_PATTERN = r"^[\d?]{1,3}\.[\d?]{1,2}\.(?P<year>\d{4})\s+(?P<event>[\w '!?,:&+\-]+: )?(?P<performers>.+); (?P<location>[\w, '\.:()&-]+)(?P<count>\(\d+[ \w]*\))?(?P<type>( \[M?C\])?)$"
pat = re.compile(LINE_PATTERN)
PERFORMER_SPLIT_PATTERN = r'[,+]\s+(?![^()]*\))'
perf_split_pat = re.compile(PERFORMER_SPLIT_PATTERN)
PERFORMER_NAME_PATTERN = r"^(?P<name>[^()]+)( \(.+\))?$"
perf_name_pat = re.compile(PERFORMER_NAME_PATTERN)

year_stats = {}
total_stats = {"gigs": 0, "minigigs": 0, "other": 0}
perf_stats = {}

with open(events_file) as f:
  for line in f:
    line = line.strip()
    if line:
      m = pat.fullmatch(line)
      if m:
        year = m.group('year')
        event = m.group('event')
        performers = m.group('performers')
        location = m.group('location')
        type = m.group('type')
        # print(f"Year: {year}  Performers: {performers}  Location: {location}  Type: {type}")
        is_gig = type and "[C]" in type
        is_minigig = type and "[MC]" in type
        is_other = not (is_gig or is_minigig)
        perf_base_is_gig = is_gig
        perf_base_is_minigig = is_minigig
        perf_list = []

        if is_gig or is_minigig:
          perf_list = [p.strip() for p in perf_split_pat.split(performers)]
          # Reclassify event type for event counting: a multi-performer [MC] event
          # is a full [C] event — only the individual sets were mini-concerts.
          # Preserve original type so performers still inherit the correct base type.
          perf_base_is_gig = is_gig
          perf_base_is_minigig = is_minigig
          if is_minigig and len(perf_list) > 1:
            is_gig = True
            is_minigig = False

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

        if perf_base_is_gig or perf_base_is_minigig:
          for performer in perf_list:
            mp = perf_name_pat.fullmatch(performer)
            if not mp:
              print(f"Performer not matched: {performer}")
              import sys
              sys.exit(1)
            name = mp.group('name').strip()
            perf_is_gig = perf_base_is_gig
            perf_is_minigig = perf_base_is_minigig
            if name.endswith(' [C]'):
              perf_is_gig = True
              perf_is_minigig = False
              name = name.removesuffix(' [C]')
            elif name.endswith(' [MC]'):
              perf_is_gig = False
              perf_is_minigig = True
              name = name.removesuffix(' [MC]')
            if name not in perf_stats:
              perf_stats[name] = {"gigs": 0, "minigigs": 0}
            if perf_is_gig:
              perf_stats[name]["gigs"] += 1
            if perf_is_minigig:
              perf_stats[name]["minigigs"] += 1
      else:
        print(f"Non-matched line: {line}")



for key, value in sorted(perf_stats.items(), key=lambda x: (-1 * (x[1]["gigs"] * 100 + x[1]["minigigs"]), x[0])):
  perf_gigcount = perf_stats[key]["gigs"]
  perf_minigigcount = perf_stats[key]["minigigs"]
  counts = f"{perf_gigcount} {'('+str(perf_minigigcount)+')' if perf_minigigcount > 0 else ''}"
  print(f"{counts:8} {key}")

for year in sorted(year_stats):
  gigcount = year_stats[year]["gigs"]
  minigigcount = year_stats[year]["minigigs"]
  othercount = year_stats[year]["other"]
  print(f"{year}: {gigcount}{' ('+str(minigigcount)+')' if minigigcount else ''}")
totalgigs = total_stats["gigs"]
totalminigigs = total_stats["minigigs"]
print(f"Total: {totalgigs} ({totalminigigs})")

ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M %Z")
print(f"Generated: {ts}")
