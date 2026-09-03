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


def _point_in_polygon(pt, poly):
    """Ray-casting point-in-polygon test. A point that lies exactly ON an
    edge or vertex -- as an abutting (non-overlapping) band boundary does --
    is not reliably reported as inside; only a point strictly inside the
    polygon's interior is."""
    x, y = pt
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y):
            x_at_y = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < x_at_y:
                inside = not inside
        j = i
    return inside


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
        """Summed polygon area is a stdlib proxy for spec 2.2's own metric
        (near-match PIXEL COUNT at 512 px) -- this file has no renderer.
        The proxy overcounts: brush() draws bristles as separate, mutually
        overlapping polygons, so overlapping bristles are double- (or
        n-times-) counted here in a way a rendered pixel count would not
        be. Both orbits share the same bristle count and layout, so the
        overcounting should bias both sides alike."""
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

    def test_spectrum_is_spread_by_arc_length(self):
        """spectrum_stops() positions are fractions of CURVE PARAMETER, but
        the spec (2.4) means them as fractions of ARC LENGTH. Feeding them
        to brush() unconverted keys colour on parameter fraction, and a
        spiral's outer quarter runs about eight times the length of its
        inner one (the same skew arc_param exists to correct for voice
        splits, BUG-3) -- so a hue meant to sit at arc-length fraction u
        actually renders at curve-parameter fraction u (identity), not at
        the curve-parameter fraction arc_param(colour) maps u to.

        Black-box, through mark.house_body() alone: for a handful of arc-
        length fractions, find the rendered path whose fill is nearest
        spectrum(u) (colour distance ~0-2/255, i.e. essentially exact),
        take its centroid, find the nearest point on the colour orbit, and
        read off that point's curve-parameter fraction ("actual"). Assert
        actual tracks to_param(u) (arc-length-correct) rather than sitting
        at identity (u itself, the unfixed behaviour) -- measured gaps:
        unfixed, actual sits within 0.06 of identity and 0.15-0.20 from
        to_param(u); fixed, actual sits within 0.06 of to_param(u).

        A polygon-area-per-hue-sextant version was tried first and
        abandoned: classifying each path's fill against the nearest of six
        spectrum(i/6+1/12) centres and summing area per bin measures ~0.22
        both before AND after this fix (RGB-nearest is itself non-uniform
        around the hue circle -- even a perfectly arc-length-uniform
        synthetic sweep only clears ~0.67 under it), and nearest-hue-ANGLE
        classification gives 0.36 before but only 0.19 AFTER -- worse,
        because HOUSE_W's taper is keyed to curve parameter, and stops
        that used to sample it evenly now concentrate whichever slice of
        parameter space their arc-length-uniform span happens to land on.
        Neither area measure discriminates the defect this fix actually
        corrects, so this test checks stop PLACEMENT instead."""
        colour, _ = mark.two_orbits()
        to_param = mark.arc_param(colour)
        colour_group = re.findall(r"<g[^>]*>(.*?)</g>", self.body, re.S)[1]
        paths = re.findall(r'<path d="([^"]+)" fill="(#[0-9a-f]{6})"/>', colour_group)
        self.assertGreater(len(paths), 0)

        def actual_param(u):
            target = mark._rgb(mark.spectrum(u))
            best_d, best_path = min(
                ((sum((mark._rgb(fill)[c] - target[c]) ** 2 for c in range(3)), d)
                 for d, fill in paths), key=lambda x: x[0])
            pts = coords(best_path)
            cx = sum(p[0] for p in pts) / len(pts)
            cy = sum(p[1] for p in pts) / len(pts)
            nearest_i = min(range(len(colour)), key=lambda i: math.dist(colour[i], (cx, cy)))
            return nearest_i / (len(colour) - 1)

        for u in (0.1, 0.3, 0.5):
            actual = actual_param(u)
            self.assertLessEqual(abs(actual - to_param(u)), 0.08,
                                  f"u={u}: actual param {actual:.3f} is not close to "
                                  f"the arc-length-correct {to_param(u):.3f}")


class Icon(unittest.TestCase):
    def setUp(self):
        self.body = mark.house_icon()

    def test_each_loop_is_one_path(self):
        groups = re.findall(r"<g[^>]*>(.*?)</g>", self.body, re.S)
        self.assertEqual(len(groups), 2)
        self.assertEqual(groups[0].count("<path"), 1)          # ink loop
        self.assertEqual(groups[1].count("<path"), 3)          # three flat bands

    def test_colour_over_ink_at_alpha(self):
        groups = re.findall(r"<g([^>]*)>", self.body)
        self.assertNotIn("opacity", groups[0])
        self.assertIn(f'opacity="{mark.HOUSE_ALPHA}"', groups[1])

    def test_three_bands_are_the_specified_hues(self):
        colour = re.findall(r"<g[^>]*>(.*?)</g>", self.body, re.S)[1]
        fills = re.findall(r'fill="(#[0-9a-f]{6})"', colour)
        self.assertEqual(fills, mark.ICON_BANDS)

    def test_no_feather_no_dry(self):
        # every band is one uninterrupted polygon: no lifts, no chunk seams
        colour = re.findall(r"<g[^>]*>(.*?)</g>", self.body, re.S)[1]
        for d in re.findall(r' d="([^"]+)"', colour):
            self.assertGreater(len(coords(d)), 20)

    def test_fits_the_macos_ground_rect(self):
        # ICON_GROUND covers 12.5..115.5; the stroke must stay on it
        x0, y0, x1, y1 = bbox(coords(self.body))
        self.assertGreaterEqual(min(x0, y0), 12.5)
        self.assertLessEqual(max(x1, y1), 115.5)

    def test_favicon_takes_current_color(self):
        svg = mark.favicon_svg()
        self.assertIn('fill="currentColor"', svg)
        self.assertNotIn(mark.INK_ON_LIGHT + '"', svg.split("<style>")[0])
        self.assertIn("prefers-color-scheme: dark", svg)

    def test_house_icon_svg_carries_the_ground(self):
        self.assertIn(mark.ICON_GROUND, mark.house_icon_svg())

    def test_bands_butt_with_no_gap(self):
        """_bands() gives band k the index range [int(N*to_param(k/n)),
        int(N*to_param((k+1)/n))) -- a half-open range whose end exactly
        equals the next band's start, so the two never overlap. Between the
        last centreline sample band k actually draws (index i1-1) and the
        first sample band k+1 draws (index i1), a real sliver of arc length
        is claimed by NEITHER polygon's cap: at 180 px and above it shows
        through to the ink loop or the ground. Fixed by extending every
        band but the last forward by two samples so the next band -- drawn
        after, and so painted on top where they now overlap -- covers the
        join. For each boundary between consecutive bands, the midpoint
        between the two adjacent centreline samples (the geometric location
        of the seam, not a vertex of either polygon) must lie inside at
        least one band's polygon."""
        colour, _ = mark.two_loops()
        to_param = mark.arc_param(colour)
        n = len(mark.ICON_BANDS)
        colour_group = re.findall(r"<g[^>]*>(.*?)</g>", self.body, re.S)[1]
        band_polys = [coords(d) for d in re.findall(r' d="([^"]+)"', colour_group)]
        for k in range(1, n):
            i1 = min(int(len(colour) * to_param(k / n)), len(colour) - 1)
            i0 = max(i1 - 1, 0)
            pt = ((colour[i0][0] + colour[i1][0]) / 2, (colour[i0][1] + colour[i1][1]) / 2)
            self.assertTrue(
                any(_point_in_polygon(pt, poly) for poly in band_polys),
                f"boundary {k} seam midpoint {pt} (between samples {i0} and {i1}) "
                f"is not covered by any band polygon")


class ProductMarks(unittest.TestCase):
    def colour_fills(self, body):
        colour = re.findall(r"<g[^>]*>(.*?)</g>", body, re.S)[1]
        return set(re.findall(r'fill="(#[0-9a-f]{6})"', colour))

    def test_seriatim_colour_orbit_is_the_four_voices(self):
        fills = self.colour_fills(mark.seriatim_mark())
        for v in mark.VOICE:
            self.assertIn(v, fills)
        # the handover feathers ink->voice, so ink and mixes are allowed;
        # nothing from the spectrum sweep is
        self.assertNotIn(mark.spectrum(0.5), fills)

    def test_ekphrasis_colour_orbit_is_ink_and_teal_only(self):
        fills = self.colour_fills(mark.ekphrasis_mark())
        self.assertIn(mark.TEAL, fills)
        ink, teal = mark._rgb(mark.INK_ON_DARK), mark._rgb(mark.TEAL)
        for f in fills:
            rgb = mark._rgb(f)
            # every fill lies on the straight ink->teal segment: the mix
            # parameter recovered from each channel agrees within 2/255
            ts = [(rgb[i] - ink[i]) / (teal[i] - ink[i]) for i in range(3) if teal[i] != ink[i]]
            self.assertLessEqual(max(ts) - min(ts), 2 / min(abs(teal[i] - ink[i]) for i in range(3) if teal[i] != ink[i]), f)
            self.assertTrue(-0.02 <= min(ts) and max(ts) <= 1.02, f)

    def test_all_three_marks_share_the_skeleton(self):
        # identical ink orbit in every mark: the first <g> is byte-identical
        ink = lambda b: re.findall(r"<g[^>]*>(.*?)</g>", b, re.S)[0]
        self.assertEqual(ink(mark.house_body()), ink(mark.seriatim_mark()))
        self.assertEqual(ink(mark.house_body()), ink(mark.ekphrasis_mark()))

    def test_seriatim_icon_has_four_flat_bands_on_the_ground(self):
        svg = mark.seriatim_icon_svg()
        self.assertIn(mark.ICON_GROUND, svg)
        colour = re.findall(r"<g[^>]*>(.*?)</g>", svg, re.S)[1]
        self.assertEqual(re.findall(r'fill="(#[0-9a-f]{6})"', colour), mark.VOICE)

    def test_ekphrasis_icon_is_ink_with_one_teal_band(self):
        svg = mark.ekphrasis_icon_svg()
        colour = re.findall(r"<g[^>]*>(.*?)</g>", svg, re.S)[1]
        fills = re.findall(r'fill="(#[0-9a-f]{6})"', colour)
        self.assertEqual(fills, [mark.INK_ON_DARK, mark.INK_ON_DARK, mark.TEAL])


class Field(unittest.TestCase):
    def test_string_positions_are_on_the_grid_and_unique(self):
        xs = mark.string_positions(400)
        self.assertEqual(xs, sorted(set(xs)))
        self.assertTrue(all(x % mark.STRING_GRID == 0 for x in xs))
        self.assertEqual(xs[0], 0)
        self.assertLess(xs[-1], 400)

    def test_string_gaps_do_not_repeat_as_a_period(self):
        xs = mark.string_positions(800)
        gaps = [b - a for a, b in zip(xs, xs[1:])]
        # no period shorter than the field: the gap sequence is not k-periodic
        for k in range(1, len(gaps) // 2):
            self.assertNotEqual(gaps[:-k], gaps[k:])

    def test_four_voice_strings(self):
        xs = mark.voice_string_xs()
        self.assertEqual(len(xs), 4)
        self.assertTrue(all(0 < x < mark.VIEWBOX for x in xs))

    def test_strings_fragment(self):
        frag = mark.strings_field_svg(1200, 630, mark_px=400)
        self.assertEqual(frag.count("<line"), len(mark.string_positions(1200)) + 4)
        for v in mark.VOICE:
            self.assertIn(f'stroke="{v}"', frag)
        self.assertIn('stroke-opacity="0.06"', frag)

    def test_cloud_is_ink_at_twelve_percent(self):
        cloud = mark.cloud_svg()
        self.assertTrue(cloud.startswith('<g opacity="0.12">'))
        self.assertNotIn(mark.spectrum(0.5), cloud)

    def test_hero_field_is_a_complete_svg(self):
        svg = mark.hero_field_svg()
        self.assertTrue(svg.startswith("<svg"))
        self.assertIn('viewBox="0 0 1200 630"', svg)
        self.assertIn(f'opacity="{mark.HOUSE_ALPHA}"', svg)     # the mark is in it


if __name__ == "__main__":
    unittest.main()
