"""Pins the measurable claims of docs/superpowers/specs/2026-09-02-chaos-of-zen-logo-redesign-design.md.

Standard library only. Run from the repo root:
    python3 -m unittest discover -s design -p 'test_*.py' -v
"""
import math
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mark  # noqa: E402

HEX = re.compile(r"^#[0-9a-f]{6}$")


class Spectrum(unittest.TestCase):
    def test_hex_format(self):
        for u in (0, .25, .5, .75, 1):
            self.assertRegex(mark.spectrum(u), HEX)

    def test_wraps_at_one(self):
        # hue 20 and hue 380 are the same colour
        self.assertEqual(mark.spectrum(0.0), mark.spectrum(1.0))

    def test_roundtrip_in_gamut(self):
        for h in (20, 120, 200, 300):
            L, C, H = mark.hex_to_oklch(mark.oklch_to_hex(0.70, 0.15, h))
            self.assertAlmostEqual(L, 0.70, delta=0.02)
            self.assertAlmostEqual(C, 0.15, delta=0.03)
            self.assertAlmostEqual(((H - h + 180) % 360) - 180, 0, delta=4)

    def test_stops_span_zero_to_one(self):
        stops = mark.spectrum_stops()
        self.assertEqual(len(stops), 24)
        self.assertEqual(stops[0][0], 0.0)
        self.assertEqual(stops[-1][0], 1.0)
        self.assertTrue(all(HEX.match(c) for _, c in stops))


if __name__ == "__main__":
    unittest.main()
