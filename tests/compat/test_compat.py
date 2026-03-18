"""Cross-compat test: verify gigcount.py and the JS parser/stats produce identical stats.

Runs both gigcount.py (Python) and gigcount_js_driver.js (Bun/JS) on the same
events file and compares performer counts, year counts, and totals.

Sort order is intentionally not compared: JS uses localeCompare() for name
tiebreaking while Python uses Unicode code-point order, so line ordering can
differ for names with identical counts. What matters is that the counts per
name/year and the totals match.

Requires: Bun installed; spa/events.txt present (the real events file).
"""

import subprocess
import sys
import os
import re
import unittest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GIGCOUNT_PY = os.path.join(REPO_ROOT, 'gigcount.py')
JS_DRIVER = os.path.join(REPO_ROOT, 'tests', 'compat', 'gigcount_js_driver.js')
EVENTS_FILE = os.path.join(REPO_ROOT, 'spa', 'events.txt')


def run_python(events_file):
    result = subprocess.run(
        [sys.executable, GIGCOUNT_PY, events_file],
        capture_output=True, text=True, cwd=REPO_ROOT,
    )
    if result.returncode != 0:
        raise RuntimeError(f"gigcount.py failed:\n{result.stderr}")
    return result.stdout


def run_js(events_file):
    result = subprocess.run(
        ['bun', JS_DRIVER, events_file],
        capture_output=True, text=True, cwd=REPO_ROOT,
    )
    if result.returncode != 0:
        raise RuntimeError(f"gigcount_js_driver.js failed:\n{result.stderr}")
    return result.stdout


def parse_output(output):
    """Parse gigcount output into structured data for comparison.

    Returns:
        performers: {name: (gigs, minigigs)}
        years:      {year_str: (gigs, minigigs)}
        total:      (gigs, minigigs)
    """
    performers = {}
    years = {}
    total = None

    for line in output.splitlines():
        line = line.rstrip()
        if not line:
            continue
        if line.startswith('Generated:'):
            continue

        # Total line: "Total: 1234 (56)"
        m = re.fullmatch(r'Total: (\d+) \((\d+)\)', line)
        if m:
            total = (int(m.group(1)), int(m.group(2)))
            continue

        # Year line: "2010: 3" or "2010: 3 (1)"
        m = re.fullmatch(r'(\d{4}): (\d+)(?: \((\d+)\))?', line)
        if m:
            years[m.group(1)] = (int(m.group(2)), int(m.group(3) or 0))
            continue

        # Performer line: "158 (9)  Maija Vilkkumaa" or "50       Jenni Vartiainen"
        m = re.fullmatch(r'(\d+)\s+(?:\((\d+)\)\s+)?\s*(.*)', line)
        if m:
            name = m.group(3).strip()
            gigs = int(m.group(1))
            minis = int(m.group(2)) if m.group(2) else 0
            performers[name] = (gigs, minis)
            continue

    return performers, years, total


@unittest.skipUnless(os.path.exists(EVENTS_FILE), f"spa/events.txt not found — skipping compat tests")
class TestCompatPythonVsJS(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.py_output = run_python(EVENTS_FILE)
        cls.js_output = run_js(EVENTS_FILE)
        cls.py_perfs, cls.py_years, cls.py_total = parse_output(cls.py_output)
        cls.js_perfs, cls.js_years, cls.js_total = parse_output(cls.js_output)

    def test_total_matches(self):
        self.assertEqual(self.py_total, self.js_total,
            f"Total mismatch: Python={self.py_total}, JS={self.js_total}")

    def test_year_set_matches(self):
        self.assertEqual(set(self.py_years.keys()), set(self.js_years.keys()),
            "Year sets differ between Python and JS")

    def test_year_counts_match(self):
        mismatches = {}
        for year in self.py_years:
            if self.py_years[year] != self.js_years.get(year):
                mismatches[year] = (self.py_years[year], self.js_years.get(year))
        self.assertFalse(mismatches,
            f"Year count mismatches: {mismatches}")

    def test_performer_set_matches(self):
        py_names = set(self.py_perfs.keys())
        js_names = set(self.js_perfs.keys())
        only_py = py_names - js_names
        only_js = js_names - py_names
        self.assertEqual(py_names, js_names,
            f"Performer sets differ. Only in Python: {only_py}. Only in JS: {only_js}")

    def test_performer_counts_match(self):
        mismatches = {}
        for name in self.py_perfs:
            if self.py_perfs[name] != self.js_perfs.get(name):
                mismatches[name] = (self.py_perfs[name], self.js_perfs.get(name))
        self.assertFalse(mismatches,
            f"Performer count mismatches ({len(mismatches)} total): "
            + str(dict(list(mismatches.items())[:10])))


if __name__ == '__main__':
    unittest.main()
