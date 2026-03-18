"""Unit tests for gigcount.py"""

import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from gigcount import parse_line, parse_events, compute_stats, format_output


class TestParseLine(unittest.TestCase):

    def test_basic_concert(self):
        e = parse_line("1.1.2010 Artist Name; Venue Name [C]")
        self.assertIsNotNone(e)
        self.assertEqual(e['year'], 2010)
        self.assertIsNone(e['event_name'])
        self.assertEqual(e['venue'], 'Venue Name')
        self.assertEqual(e['type'], 'C')
        self.assertEqual(e['performers'], [{'name': 'Artist Name', 'type': 'C'}])

    def test_mini_concert(self):
        e = parse_line("15.6.2015 Some Artist; Club XYZ [MC]")
        self.assertIsNotNone(e)
        self.assertEqual(e['type'], 'MC')
        self.assertEqual(e['performers'], [{'name': 'Some Artist', 'type': 'MC'}])

    def test_non_concert_no_type_tag(self):
        e = parse_line("3.3.2012 Some Trip; Helsinki")
        self.assertIsNotNone(e)
        self.assertEqual(e['type'], None)
        self.assertEqual(e['performers'], [])

    def test_event_name_prefix(self):
        e = parse_line("1.7.2018 Ruisrock: The Beautiful South; Turku [C]")
        self.assertIsNotNone(e)
        self.assertEqual(e['event_name'], 'Ruisrock')
        self.assertEqual(e['performers'], [{'name': 'The Beautiful South', 'type': 'C'}])

    def test_multiple_performers_comma(self):
        e = parse_line("10.10.2010 Artist A, Artist B; Some Venue [C]")
        self.assertIsNotNone(e)
        self.assertEqual(len(e['performers']), 2)
        self.assertEqual(e['performers'][0]['name'], 'Artist A')
        self.assertEqual(e['performers'][1]['name'], 'Artist B')

    def test_multiple_performers_plus(self):
        e = parse_line("10.10.2010 Artist A + Artist B; Some Venue [C]")
        self.assertIsNotNone(e)
        self.assertEqual(len(e['performers']), 2)
        self.assertEqual(e['performers'][0]['name'], 'Artist A')
        self.assertEqual(e['performers'][1]['name'], 'Artist B')

    def test_performer_with_detail(self):
        e = parse_line("5.5.2005 Fish (acoustic); Small Club [C]")
        self.assertIsNotNone(e)
        self.assertEqual(e['performers'][0]['name'], 'Fish')

    def test_performer_with_paren_not_split(self):
        # Comma inside parens should not split performers.
        e = parse_line("5.5.2005 Fish (with band), Opeth; Big Hall [C]")
        self.assertIsNotNone(e)
        self.assertEqual(len(e['performers']), 2)
        self.assertEqual(e['performers'][0]['name'], 'Fish')

    def test_per_performer_type_override(self):
        e = parse_line("1.1.2020 Headliner, Opener [MC]; Arena [C]")
        self.assertIsNotNone(e)
        self.assertEqual(e['type'], 'C')
        self.assertEqual(e['performers'][0], {'name': 'Headliner', 'type': 'C'})
        self.assertEqual(e['performers'][1], {'name': 'Opener', 'type': 'MC'})

    def test_comment_field(self):
        e = parse_line("1.1.2010 Artist; Venue (1) [C]")
        self.assertIsNotNone(e)
        self.assertEqual(e['comment'], '1')

    def test_comment_field_absent(self):
        e = parse_line("1.1.2010 Artist; Venue [C]")
        self.assertIsNone(e['comment'])

    def test_date_with_question_marks(self):
        e = parse_line("?.?.2003 Artist; Venue [C]")
        self.assertIsNotNone(e)
        self.assertEqual(e['year'], 2003)

    def test_no_match_returns_none(self):
        self.assertIsNone(parse_line("not a valid line"))
        self.assertIsNone(parse_line(""))
        self.assertIsNone(parse_line("# comment"))

    def test_raw_preserved(self):
        raw = "1.1.2010 Artist; Venue [C]"
        e = parse_line(raw)
        self.assertEqual(e['raw'], raw)


class TestParseEvents(unittest.TestCase):

    def test_empty_text(self):
        self.assertEqual(parse_events(""), [])

    def test_blank_lines_skipped(self):
        text = "\n\n1.1.2010 Artist; Venue [C]\n\n"
        events = parse_events(text)
        self.assertEqual(len(events), 1)

    def test_multiple_events(self):
        text = (
            "1.1.2010 Artist A; Venue X [C]\n"
            "2.2.2011 Artist B; Venue Y [MC]\n"
        )
        events = parse_events(text)
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]['year'], 2010)
        self.assertEqual(events[1]['year'], 2011)

    def test_non_matched_lines_skipped(self):
        text = (
            "1.1.2010 Artist; Venue [C]\n"
            "this line won't match\n"
        )
        events = parse_events(text)
        self.assertEqual(len(events), 1)


class TestComputeStats(unittest.TestCase):

    def _make_event(self, year, type_, performers):
        return {
            'year': year,
            'type': type_,
            'performers': performers,
            'event_name': None,
            'venue': 'Venue',
            'comment': None,
            'raw': '',
        }

    def test_empty(self):
        year_stats, total_stats, perf_stats = compute_stats([])
        self.assertEqual(year_stats, {})
        self.assertEqual(total_stats, {"gigs": 0, "minigigs": 0, "other": 0})
        self.assertEqual(perf_stats, {})

    def test_single_concert(self):
        events = [self._make_event(2010, 'C', [{'name': 'Artist', 'type': 'C'}])]
        year_stats, total_stats, perf_stats = compute_stats(events)
        self.assertEqual(total_stats['gigs'], 1)
        self.assertEqual(total_stats['minigigs'], 0)
        self.assertEqual(year_stats['2010']['gigs'], 1)
        self.assertEqual(perf_stats['Artist']['gigs'], 1)

    def test_single_mini(self):
        events = [self._make_event(2010, 'MC', [{'name': 'Artist', 'type': 'MC'}])]
        year_stats, total_stats, perf_stats = compute_stats(events)
        self.assertEqual(total_stats['gigs'], 0)
        self.assertEqual(total_stats['minigigs'], 1)
        self.assertEqual(year_stats['2010']['minigigs'], 1)
        self.assertEqual(perf_stats['Artist']['minigigs'], 1)

    def test_other_event(self):
        events = [self._make_event(2010, None, [])]
        year_stats, total_stats, perf_stats = compute_stats(events)
        self.assertEqual(total_stats['other'], 1)
        self.assertEqual(total_stats['gigs'], 0)

    def test_multiple_years(self):
        events = [
            self._make_event(2010, 'C', [{'name': 'A', 'type': 'C'}]),
            self._make_event(2011, 'C', [{'name': 'B', 'type': 'C'}]),
            self._make_event(2010, 'MC', [{'name': 'C', 'type': 'MC'}]),
        ]
        year_stats, total_stats, perf_stats = compute_stats(events)
        self.assertEqual(total_stats['gigs'], 2)
        self.assertEqual(total_stats['minigigs'], 1)
        self.assertEqual(year_stats['2010']['gigs'], 1)
        self.assertEqual(year_stats['2010']['minigigs'], 1)
        self.assertEqual(year_stats['2011']['gigs'], 1)

    def test_performer_counts_accumulate(self):
        events = [
            self._make_event(2010, 'C', [{'name': 'Artist', 'type': 'C'}]),
            self._make_event(2011, 'C', [{'name': 'Artist', 'type': 'C'}]),
            self._make_event(2012, 'MC', [{'name': 'Artist', 'type': 'MC'}]),
        ]
        _, _, perf_stats = compute_stats(events)
        self.assertEqual(perf_stats['Artist']['gigs'], 2)
        self.assertEqual(perf_stats['Artist']['minigigs'], 1)

    def test_per_performer_type_override_counted_separately(self):
        # Event is [C] but one performer has [MC] override.
        events = [self._make_event(2010, 'C', [
            {'name': 'Headliner', 'type': 'C'},
            {'name': 'Opener', 'type': 'MC'},
        ])]
        _, total_stats, perf_stats = compute_stats(events)
        self.assertEqual(total_stats['gigs'], 1)       # event counts as C
        self.assertEqual(perf_stats['Headliner']['gigs'], 1)
        self.assertEqual(perf_stats['Opener']['minigigs'], 1)
        self.assertEqual(perf_stats['Opener']['gigs'], 0)


class TestFormatOutput(unittest.TestCase):

    def test_basic_output(self):
        year_stats = {'2010': {'gigs': 2, 'minigigs': 0, 'other': 0}}
        total_stats = {'gigs': 2, 'minigigs': 1, 'other': 0}
        perf_stats = {
            'Artist A': {'gigs': 2, 'minigigs': 0},
            'Artist B': {'gigs': 1, 'minigigs': 1},
        }
        output = format_output(year_stats, total_stats, perf_stats)
        lines = output.splitlines()
        # Performer section: sorted by gigs desc, then name asc
        self.assertIn('Artist A', lines[0])
        self.assertIn('Artist B', lines[1])
        # Year section
        self.assertIn('2010: 2', output)
        # Total line
        self.assertIn('Total: 2 (1)', output)

    def test_mini_count_shown_in_parens(self):
        year_stats = {'2010': {'gigs': 1, 'minigigs': 2, 'other': 0}}
        total_stats = {'gigs': 1, 'minigigs': 2, 'other': 0}
        perf_stats = {'Artist': {'gigs': 1, 'minigigs': 2}}
        output = format_output(year_stats, total_stats, perf_stats)
        self.assertIn('(2)', output)

    def test_zero_minis_omitted_in_year_line(self):
        year_stats = {'2010': {'gigs': 3, 'minigigs': 0, 'other': 0}}
        total_stats = {'gigs': 3, 'minigigs': 0, 'other': 0}
        perf_stats = {}
        output = format_output(year_stats, total_stats, perf_stats)
        self.assertIn('2010: 3', output)
        # No trailing parens when minigigs is 0
        self.assertNotIn('2010: 3 (', output)

    def test_performer_sort_order(self):
        perf_stats = {
            'Zebra': {'gigs': 5, 'minigigs': 0},
            'Alpha': {'gigs': 5, 'minigigs': 0},
            'Most':  {'gigs': 10, 'minigigs': 0},
        }
        output = format_output({}, {'gigs': 0, 'minigigs': 0, 'other': 0}, perf_stats)
        lines = output.splitlines()
        names = [l.split()[-1] for l in lines if l.strip()]
        self.assertEqual(names[0], 'Most')
        # Alpha before Zebra (alphabetical tiebreak)
        self.assertLess(names.index('Alpha'), names.index('Zebra'))

    def test_no_generated_timestamp(self):
        output = format_output({}, {'gigs': 0, 'minigigs': 0, 'other': 0}, {})
        self.assertNotIn('Generated:', output)


if __name__ == '__main__':
    unittest.main()
