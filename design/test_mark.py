"""Pins the measurable claims of docs/superpowers/specs/2026-09-02-chaos-of-zen-logo-redesign-design.md.

Standard library only. Run from the repo root:
    python3 -m unittest discover -s design -p 'test_*.py' -v
"""
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


NUM = re.compile(r"(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)")


def coords(body: str) -> list[tuple[float, float]]:
    return [(float(x), float(y)) for x, y in NUM.findall(body)]


def _area(d: str) -> float:
    pts = coords(d)
    if len(pts) < 3:
        return 0.0
    s = 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        s += x0 * y1 - x1 * y0
    return abs(s) / 2


def group_areas(body: str) -> list[float]:
    groups = re.findall(r"<g[^>]*>(.*?)</g>", body, re.S)
    return [sum(_area(d) for d in re.findall(r' d="([^"]+)"', g)) for g in groups]


def bbox(pts):
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


class HouseMark(unittest.TestCase):
    def setUp(self):
        self.body = mark.house_body()

    def test_layering_ink_under_colour_over(self):
        groups = re.findall(r"<g([^>]*)>", self.body)
        self.assertEqual(len(groups), 2)
        self.assertNotIn("opacity", groups[0])          # ink, full strength
        self.assertIn(f'opacity="{mark.HOUSE_ALPHA}"', groups[1])

    def test_colour_group_carries_the_spectrum(self):
        colour = re.findall(r"<g[^>]*>(.*?)</g>", self.body, re.S)[1]
        fills = set(re.findall(r'fill="(#[0-9a-f]{6})"', colour))
        self.assertGreaterEqual(len(fills), 12)          # a sweep, not a few bands
        self.assertNotIn(mark.INK_ON_DARK, fills)

    def test_union_is_within_three_percent_of_square(self):
        x0, y0, x1, y1 = bbox(coords(self.body))
        w, h = x1 - x0, y1 - y0
        self.assertLessEqual(abs(w - h) / max(w, h), 0.03)

    def test_ink_balance_between_the_two_orbits(self):
        ink, colour = group_areas(self.body)
        self.assertGreaterEqual(min(ink, colour) / max(ink, colour), 0.9)

    def test_stays_inside_the_viewbox(self):
        x0, y0, x1, y1 = bbox(coords(self.body))
        self.assertGreaterEqual(min(x0, y0), 0.0)
        self.assertLessEqual(max(x1, y1), mark.VIEWBOX)

    def test_house_mark_svg_is_the_layered_body(self):
        svg = mark.house_mark_svg()
        self.assertIn('viewBox="0 0 128 128"', svg)
        self.assertIn(f'opacity="{mark.HOUSE_ALPHA}"', svg)


if __name__ == "__main__":
    unittest.main()
