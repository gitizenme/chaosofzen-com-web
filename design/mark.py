#!/usr/bin/env python3
"""The Chaos of Zen mark, generated from the equations that define it.

The mark is not a drawing anyone traced. It is a Rossler attractor orbit
rendered as a sumi-e brushstroke, and every asset in public/ is output from
this file. If you need a different size, colour or dryness, change a parameter
here and regenerate -- do not edit the SVG.

    python3 design/mark.py --verify     # check public/ matches this generator
    python3 design/mark.py --write      # regenerate public/favicon.svg

Requires nothing but the standard library. See design/README.md for the raster
pipeline, which does have external dependencies.

Constants and the reasoning behind them are in design/spec.md. Three of them
exist because of bugs that were invisible to visual review and only showed up
under measurement; each is marked BUG-N below and explained in the spec.
"""
from __future__ import annotations

import argparse
import math
import re
import sys
from pathlib import Path

# --------------------------------------------------------------------------
# Palette. Every value is lifted from the plugin source, not invented.
#   seriatim/plugin/Source/ScoreView.cpp:7-8   the four voice colours
#   seriatim/plugin/Source/ScoreView.cpp:299   #0e0e14 score ground
#   seriatim/plugin/Source/ControlPanel.h:76   #1a1a22 panel
#   ekphrasis/plugin/Source/PluginEditor.cpp:22   #121214 editor ground
# --------------------------------------------------------------------------
VERMILION, TEAL, AMBER, SAGE = "#e4572e", "#29b6a8", "#f3a712", "#a8c686"
VOICE = [VERMILION, TEAL, AMBER, SAGE]

GROUND_SCORE = "#0e0e14"
GROUND_EDITOR = "#121214"
PANEL = "#1a1a22"
INK_ON_DARK = "#eceaf2"
INK_ON_LIGHT = "#12121a"

# Teal is the accent on dark grounds at 7.65:1. On light it reads 2.24:1 and
# fails AA for text, so light grounds take a darkened teal. #1d8d82 is NOT
# sufficient -- it measures 3.60:1.
ACCENT_ON_DARK = TEAL
ACCENT_ON_LIGHT = "#17786e"   # 4.73:1

VIEWBOX = 128.0


# --------------------------------------------------------------------------
# Chaotic driver
# --------------------------------------------------------------------------
def logistic(n: int, r: float = 3.93, x: float = 0.31,
             warm: int = 300, smooth: int = 14) -> list[float]:
    """Logistic map, low-passed, normalised to [-1, 1] by RANGE.

    BUG-1: normalise by range, not amplitude. The smoothed series is strongly
    skewed -- max 1.00, min -0.06. Dividing by max(abs(v)) leaves the minimum
    near zero, nothing crosses the lift threshold, and every dryness setting
    renders identically to the wet one. The failure looks like a taste problem,
    which is why it survived two rounds of visual review.
    """
    s, out = x, []
    for _ in range(warm):
        s = r * s * (1 - s)
    for _ in range(n + smooth):
        s = r * s * (1 - s)
        out.append(s)
    v = [sum(out[i:i + smooth]) / smooth * 2 - 1 for i in range(n)]
    lo, hi = min(v), max(v)
    rng = (hi - lo) or 1.0
    return [2 * (q - lo) / rng - 1 for q in v]


# --------------------------------------------------------------------------
# The curve
# --------------------------------------------------------------------------
def rossler(t_end: float = 19.0, dt: float = 0.006,
            a: float = 0.2, b: float = 0.2, c: float = 5.7,
            x: float = 1.0, y: float = 1.0, z: float = 1.0,
            step: int = 8) -> list[tuple[float, float]]:
    """Rossler system by RK4, projected to x-y.

    That projection is a spiral that folds and never closes: an enso and a
    strange attractor at once, which is the whole thesis of the name. The first
    10% of samples are discarded as transient.
    """
    def d(s):
        X, Y, Z = s
        return (-Y - Z, X + a * Y, b + Z * (X - c))

    out, s, n = [], (x, y, z), int(t_end / dt)
    for i in range(n):
        k1 = d(s)
        k2 = d(tuple(s[j] + dt / 2 * k1[j] for j in range(3)))
        k3 = d(tuple(s[j] + dt / 2 * k2[j] for j in range(3)))
        k4 = d(tuple(s[j] + dt * k3[j] for j in range(3)))
        s = tuple(s[j] + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])
                  for j in range(3))
        if i > n * 0.10:
            out.append((s[0], s[1]))
    return out[::step]


def fit(groups, margin: float = 13.0):
    """Fit one or more curves to the viewBox under a SHARED transform.

    BUG-2: sibling curves must share a transform. Fitting each to the box
    independently rescales away the very divergence they exist to show.
    """
    allp = [p for g in groups for p in g]
    xs, ys = [p[0] for p in allp], [p[1] for p in allp]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    sc = (VIEWBOX - 2 * margin) / max(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return [[(VIEWBOX / 2 + (px - cx) * sc, VIEWBOX / 2 + (py - cy) * sc)
             for px, py in g] for g in groups]


def fit_one(pts, margin: float = 13.0):
    return fit([pts], margin)[0]


def arc_param(pts):
    """Map an arc-length fraction to a curve-parameter fraction.

    BUG-3: split voices by arc length, not by time. A spiral's outer quarter
    runs about eight times the length of its inner one, so equal time gives
    wildly unequal ink -- measured at 98 px against 769. Arc length brings four
    voices to 460-500 px each, a min/max balance of 0.92.
    """
    cum = [0.0]
    for i in range(1, len(pts)):
        cum.append(cum[-1] + math.dist(pts[i], pts[i - 1]))
    total = cum[-1] or 1.0

    def to_param(u: float) -> float:
        target = u * total
        lo, hi = 0, len(cum) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if cum[mid] < target:
                lo = mid + 1
            else:
                hi = mid
        return lo / (len(pts) - 1)
    return to_param


# --------------------------------------------------------------------------
# Colour
# --------------------------------------------------------------------------
def _rgb(h: str) -> tuple[int, int, int]:
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def mix(c0: str, c1: str, u: float) -> str:
    a, b = _rgb(c0), _rgb(c1)
    return "#%02x%02x%02x" % tuple(round(a[i] + (b[i] - a[i]) * u) for i in range(3))


def ramp(stops, t: float) -> str:
    """Interpolate a colour ramp on a smoothstep. `stops` is [(pos, colour)]."""
    if t <= stops[0][0]:
        return stops[0][1]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if t <= p1:
            if p1 <= p0:
                return c1
            u = (t - p0) / (p1 - p0)
            return mix(c0, c1, u * u * (3 - 2 * u))
    return stops[-1][1]


def house_stops(ink: str, feather: float = 0.10):
    """The house mark carries every voice, in the order the score lists them."""
    w = max(feather, 0.04)
    return [(0, ink), (.30, ink), (.30 + w, TEAL), (.52, TEAL),
            (.52 + w, SAGE), (.68, SAGE), (.68 + w, AMBER),
            (.84, AMBER), (.84 + w, VERMILION), (1, VERMILION)]


def single_stops(ink: str, colour: str, at: float = 0.84, feather: float = 0.26):
    """One handover: ink into a single accent, centred at `at`."""
    return [(0, ink), (at - feather / 2, ink), (at + feather / 2, colour), (1, colour)]


# --------------------------------------------------------------------------
# The spectrum
#
# The coloured half of the house mark carries the whole hue circle, as the
# original painting does. It is defined in oklch at CONSTANT lightness and
# chroma so no hue shouts: L and C sit close to the means of the four voice
# colours' own oklch values (0.73 / 0.14), so the sweep sits at the voices'
# lightness.
# --------------------------------------------------------------------------
SPECTRUM_L, SPECTRUM_C = 0.70, 0.15


def _srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _linear_to_srgb(c: float) -> float:
    c = min(max(c, 0.0), 1.0)
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def oklch_to_hex(L: float, C: float, H: float) -> str:
    """oklch -> sRGB hex, gamut-clipped per channel."""
    a = C * math.cos(math.radians(H))
    b = C * math.sin(math.radians(H))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return "#%02x%02x%02x" % tuple(round(_linear_to_srgb(c) * 255) for c in (r, g, bl))


def hex_to_oklch(h: str) -> tuple[float, float, float]:
    r, g, b = (_srgb_to_linear(v / 255) for v in _rgb(h))
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = l ** (1 / 3), m ** (1 / 3), s ** (1 / 3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360


def spectrum(u: float) -> str:
    """Hue 20 at u=0, once round the circle by u=1."""
    return oklch_to_hex(SPECTRUM_L, SPECTRUM_C, (20 + 360 * u) % 360)


def spectrum_stops(n: int = 24) -> list[tuple[float, str]]:
    return [(i / (n - 1), spectrum(i / (n - 1))) for i in range(n)]


# --------------------------------------------------------------------------
# Two orbits, mirrored through the centre.
#
# The redesigned marks are a yin-yang: two copies of one Rossler orbit, the
# second rotated by pi about the centre, one carrying colour and one ink.
# Each spiral's centre is an eye, so nothing else is drawn. Every product mark
# shares this skeleton and changes only the colour orbit's stops -- siblings by
# construction. See docs/superpowers/specs/2026-09-02-chaos-of-zen-logo-redesign-design.md.
# --------------------------------------------------------------------------
HOUSE_SCALE = 0.60
HOUSE_OFFSET = (9.0, 10.0)     # fixed by test_mark.HouseMark; see spec section 7.4
HOUSE_ALPHA = 0.76
HOUSE_W = lambda t: 1.8 + 6.0 * math.sin(math.pow(min(t * 1.06, 1), .8) * math.pi)
WET = dict(bristles=8, dry=.45, wobble=.5)


def place(pts, centre, scale: float, rot: float):
    """Scale a fitted curve about the viewBox centre, rotate it, move it."""
    out = []
    c, s = math.cos(rot), math.sin(rot)
    for x, y in pts:
        dx, dy = (x - VIEWBOX / 2) * scale, (y - VIEWBOX / 2) * scale
        out.append((centre[0] + dx * c - dy * s, centre[1] + dx * s + dy * c))
    return out


def two_orbits(t_end: float = 19.0, step: int = 8, scale: float = HOUSE_SCALE,
               offset=HOUSE_OFFSET, margin: float = 13.0):
    """(colour_orbit, ink_orbit): one fit, two placements, the second rotated pi."""
    orbit = fit_one(rossler(t_end=t_end, step=step), margin=margin)
    cx, cy = VIEWBOX / 2, VIEWBOX / 2
    colour = place(orbit, (cx - offset[0], cy - offset[1]), scale, 0.0)
    ink = place(orbit, (cx + offset[0], cy + offset[1]), scale, math.pi)
    return colour, ink


def layered(ink_body: str, colour_body: str, alpha: float = HOUSE_ALPHA) -> str:
    """Ink underneath at full strength, colour on top at partial alpha.

    Group opacity, not per-path: a stroke is many chunks and per-path alpha
    would show every chunk seam.
    """
    return f'<g>{ink_body}</g><g opacity="{alpha}">{colour_body}</g>'


def _ink_layer(inkorb, ink: str = INK_ON_DARK) -> str:
    """The ink orbit every mark shares -- one definition, so the marks are
    siblings by construction and test_mark.ProductMarks can assert byte identity."""
    return brush(inkorb, HOUSE_W, [(0, ink), (1, ink)], seed0=.58, chunk=8, **WET)


def house_body(ink: str = INK_ON_DARK, stops=None) -> str:
    colour, inkorb = two_orbits()
    stops = stops or spectrum_stops()
    return layered(_ink_layer(inkorb, ink),
                   brush(colour, HOUSE_W, stops, seed0=.31, chunk=8, **WET))


# --------------------------------------------------------------------------
# The icon: two outer loops, colour outside over ink inside.
#
# Not a taijitu. Shorter integration so only the outer loop survives, flat
# colour in three bands, no feather (BUG-4: the feather is what breaks a mark
# at 16 px), no dryness, and each loop emitted as ONE path so no chunk seam
# shows through the alpha. Fitted with the house margin; ICON_SCALE keeps the
# stroke on the macOS ground rect (BUG-5), which test_mark.Icon checks.
# --------------------------------------------------------------------------
ICON_SCALE = 0.78
ICON_OFFSET = (4.0, 3.0)
ICON_LOOP_W = lambda t: 7.0 + 5.0 * math.sin(math.pow(t, .6) * math.pi)
ICON_BANDS = [spectrum(0.125 * 0.75), spectrum(0.375 * 0.75), spectrum(0.625 * 0.75)]


def two_loops():
    """(colour_loop, ink_loop). The colour loop is the rotated copy, placed
    at +offset so it sits OUTSIDE the ink loop; the ink loop is unrotated at
    -offset, inside."""
    loop = fit_one(rossler(t_end=11.0, step=6), margin=13.0)
    cx, cy = VIEWBOX / 2, VIEWBOX / 2
    colour = place(loop, (cx + ICON_OFFSET[0], cy + ICON_OFFSET[1]), ICON_SCALE, math.pi)
    ink = place(loop, (cx - ICON_OFFSET[0], cy - ICON_OFFSET[1]), ICON_SCALE, 0.0)
    return colour, ink


def _solid(loop, stops) -> str:
    # bristles=1, dry=0, chunk beyond the point count: one run, one path
    return brush(loop, ICON_LOOP_W, stops, bristles=1, dry=0.0, wobble=0.0,
                 chunk=len(loop) + 1)


def _bands(loop, colours) -> str:
    """One path per band, so a band never straddles a colour boundary."""
    to_param = arc_param(loop)
    n = len(colours)
    return ''.join(brush(loop, ICON_LOOP_W, [(0, c), (1, c)], bristles=1, dry=0.0,
                         wobble=0.0, chunk=len(loop) + 1,
                         lo=to_param(k / n), hi=to_param((k + 1) / n))
                   for k, c in enumerate(colours))


def icon_body(colour_loop, ink_loop, colours, ink: str) -> str:
    return layered(_solid(ink_loop, [(0, ink), (1, ink)]), _bands(colour_loop, colours))


def house_icon(ink: str = INK_ON_DARK) -> str:
    colour, inkloop = two_loops()
    return icon_body(colour, inkloop, ICON_BANDS, ink)


# --------------------------------------------------------------------------
# The brush
# --------------------------------------------------------------------------
BREATH = lambda t: 2.4 + 8.8 * math.sin(math.pow(min(t * 1.06, 1), .8) * math.pi)


def brush(pts, width_of, stops, *, bristles: int = 6, dry: float = 0.8,
          wobble: float = 0.55, seed0: float = 0.31,
          lo: float = 0.0, hi: float = 1.0, chunk: int = 6) -> str:
    """Render a curve as parallel filaments, each lifting on its own series.

    The stroke is `bristles` filaments, not one outline. Filament k sits at
    cross-stroke offset u = (k+0.5)/n - 0.5 with half-width (width/n) * 0.60 --
    deliberately under the spacing, so a lifted filament leaves real white
    rather than being covered by its neighbours.

    A filament lays no ink where 1 + dry*s < 0.62. Because they lift
    independently the flying white runs ALONG the stroke; cutting across
    instead reads as a dashed line, not a brush.

    Each filament also takes up new pigment at its own moment, which is what
    makes the colour boundary look wet rather than machine-cut.
    """
    n = len(pts)
    normals = []
    for i in range(n):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        m = math.hypot(tx, ty) or 1.0
        normals.append((-ty / m, tx / m))
    widths = [width_of(i / (n - 1)) for i in range(n)]
    i0, i1 = int(n * lo), int(n * hi)

    paths = []
    for k in range(bristles):
        u = (k + .5) / bristles - .5
        s = logistic(n, 3.93, ((seed0 + .031 * k) % 1) or .31)
        jitter = .10 * (((k * 37) % 7) / 6 - .5)
        run: list[int] = []

        def flush():
            if len(run) > 2:
                left, right = [], []
                for i in run:
                    x, y = pts[i]
                    nx, ny = normals[i]
                    off = u * widths[i] + wobble * s[i]
                    hw = (widths[i] / bristles) * .60
                    left.append((x + nx * (off + hw), y + ny * (off + hw)))
                    right.append((x + nx * (off - hw), y + ny * (off - hw)))
                t = (run[0] + run[-1]) / 2 / (n - 1)
                col = ramp(stops, min(max(t + jitter, 0), 1))
                ring = left + right[::-1]
                d = "M " + " L ".join(f"{a:.1f},{b:.1f}" for a, b in ring)
                paths.append(f'<path d="{d}" fill="{col}"/>')
            run.clear()

        for i in range(i0, i1):
            if dry and (1 + dry * s[i]) < .62:
                flush()
                continue
            run.append(i)
            if len(run) >= chunk:
                last = run[-1]
                flush()
                run.append(last)
        flush()
    return ''.join(paths)


# --------------------------------------------------------------------------
# Assets
# --------------------------------------------------------------------------
def favicon_svg() -> str:
    """public/favicon.svg -- the icon construction; never renders above 64 px.

    Brushed with INK_ON_LIGHT as a sentinel and rewritten to currentColor, so
    one file serves both themes.
    """
    body = house_icon(INK_ON_LIGHT).replace(f'fill="{INK_ON_LIGHT}"', 'fill="currentColor"')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-labelledby="t">
  <title id="t">Chaos of Zen</title>
  <!-- Two outer loops of a Rossler orbit, mirrored: colour over ink. The ink
       takes currentColor so one copy serves both themes. -->
  {body}
  <style>
    svg {{ color: {INK_ON_LIGHT}; }}
    @media (prefers-color-scheme: dark) {{ svg {{ color: {INK_ON_DARK}; }} }}
  </style>
</svg>
'''


def house_icon_svg() -> str:
    """The macOS icon: the icon construction on the rounded-rect ground."""
    return _svg(ICON_GROUND + house_icon(INK_ON_DARK), "Chaos of Zen")


# --------------------------------------------------------------------------
# Product marks
#
# Every mark is the same Rossler orbit drawn by the same brush. What separates
# them is WHAT DRIVES THE CHAOS, so they are siblings by construction rather
# than by styling:
#
#   Chaos of Zen  breath -- the stroke tapers in and out, lift at r = 3.93,
#                 and it carries every voice because it is the studio
#   Ekphrasis     stroke width is image brightness; barely lifts, because an
#                 image has no gaps
#   Seriatim      four voices divide one orbit, each with its own colour
# --------------------------------------------------------------------------
SEEDS = [.31, .44, .58, .19]

# Stroke width as image brightness -- the picture written along the orbit.
IMAGE_W = lambda t: 2.0 + 8.2 * (.30 + .70 * math.pow(math.sin(t * math.pi), .5)) \
                          * (.45 + .55 * (.5 + .5 * math.sin(t * 23 + .4)))
VOICE_W = lambda t: 2.6 + 5.4 * math.sin(math.pow(t, .7) * math.pi)


def ekphrasis_mark(ink: str = INK_ON_DARK) -> str:
    """One voice reading one image: the colour orbit is ink with a single
    teal handover, stroke width as image brightness. Same skeleton as the
    house mark; only the colour orbit's stops and width change."""
    colour, inkorb = two_orbits()
    return layered(_ink_layer(inkorb, ink),
                   brush(colour, IMAGE_W, single_stops(ink, TEAL), bristles=6, dry=.28,
                         wobble=.45, chunk=8))


def seriatim_mark(ink: str = INK_ON_DARK, voices: int = 4, gap: float = 0.12) -> str:
    """Four voices dividing the colour orbit, with a rest between each -- the
    same arc-length split and per-voice breath as before (BUG-3), now on the
    shared two-orbit skeleton. The ink orbit is the house mark's.

    No two are ever in the same place -- which is Seriatim's real claim, and a
    truer one than chaotic divergence. Divergence was tried and abandoned: at
    t = 12.4 four orbits from initial conditions 0.09 apart separate by 2.9% of
    the attractor's extent, i.e. inside one another's stroke width.

    Two constraints here were found by measurement, not by looking:

      - The rest is a fraction of each voice's OWN window. As a fraction of the
        whole cycle a "12% gap" leaves each of four voices 1% of the orbit and
        draws slivers -- which made this approach look unusable for two rounds.
      - Voices split by arc length (BUG-3 above), and each takes its own breath
        taper. One taper across the whole orbit leaves the first and last
        voices in the thin part of the stroke, nearly invisible.
    """
    colour, inkorb = two_orbits()
    to_param = arc_param(colour)
    span = 1.0 / voices
    out = []
    for k in range(voices):
        lo = to_param(k * span + gap * span)
        hi = to_param((k + 1) * span - gap * span)
        c = VOICE[k % len(VOICE)]
        a = lo + (hi - lo) * .08
        b = a + max(0.26, .04) * (hi - lo) * 1.2
        stops = [(0, ink), (a, ink), (min(b, hi), c), (1, c)]
        width = (lambda l, h: lambda t: VOICE_W(min(max((t - l) / (h - l), 0), 1)))(lo, hi)
        out.append(brush(colour, width, stops, bristles=4, dry=.28, wobble=.26,
                         seed0=SEEDS[k], lo=lo, hi=hi, chunk=8))
    return layered(_ink_layer(inkorb, ink),
                   ''.join(out))


# Icon construction. The same orbit, the same brush, the same arc-length voice
# split and the same rests as seriatim_mark(). Five numbers change and the
# ink->colour feather is turned off.
#
# BUG-4: THE FEATHER IS WHAT BREAKS THE MARK AT ICON SIZE, NOT THE LOOP COUNT.
# This file used to propose a shorter integration (t_end 13.2, three filaments,
# reduced lift) for icon sizes. Measured at 16 px with design/measure_icon.py,
# that rescues ONE voice of four. The shipping mark rescues none. A heavier
# stroke with the feather intact rescues four but at a 0.25 min/max balance,
# because how much of a voice survives depends on where its handover happened
# to fall. Dropping the feather gives 4 of 4 at 0.91 -- the same balance the
# arc-length split achieves at full size.
#
# The cause: at 16 px a voice spans about ten pixels, so its ink half and its
# pigment half average into a single midtone that classifies as neither. The
# handover is what makes the mark look wet at 512 px and is exactly what
# destroys it at 16.

# macOS icon grid: the rounded rect occupies 824 of 1024, i.e. 103 of 128, with
# a corner radius of 185.4/1024 -> 23.2/128. Without a ground the icon is
# transparent, and sage (#a8c686) is the one voice colour section 5.1 records
# as not carrying onto light -- so a transparent icon loses a voice on a light
# Finder window, which is the exact failure this construction exists to prevent.
ICON_GROUND = ('<rect x="12.5" y="12.5" width="103" height="103" '
               'rx="23.2" ry="23.2" fill="#0e0e14"/>')

# BUG-5: THE ORBIT MUST BE FITTED TO THE GROUND RECT, NOT TO THE CANVAS.
# margin is 30, not the 6 the full mark uses, because fit_one fits to the
# 128-unit canvas while the ground covers only the middle 103 -- and the
# stroke then extends a further half-width beyond the fitted centreline. The
# first version of this function used margin=6 and scored 4 of 4 voices at a
# 0.91 balance with 42% of its ink OUTSIDE the rounded rect: three voices were
# drawn on the desktop rather than on the icon. It passed measure_icon.py,
# because a metric that counts coloured pixels cannot tell where they are.
# measure_icon.py now checks containment for exactly this reason.
#
# Refitting cost nothing: t_end 11.0 with a 14-22 stroke and a 0.14 gap
# measures 4 of 4 at a balance of 1.00, fully contained -- better than the
# escaped version on its own metric.
#
# The two-loop icon keeps the stroke on the ground through ICON_SCALE, checked
# by test_mark.Icon.


def seriatim_icon(ink: str = INK_ON_DARK) -> str:
    """Seriatim's icon: the two loops, the colour loop in four flat voice bands."""
    colour, inkloop = two_loops()
    return icon_body(colour, inkloop, VOICE, ink)


def ekphrasis_icon(ink: str = INK_ON_DARK) -> str:
    """Ekphrasis's icon: the colour loop is ink with one teal band at the end."""
    colour, inkloop = two_loops()
    return icon_body(colour, inkloop, [ink, ink, TEAL], ink)


# --------------------------------------------------------------------------
# The strings and cloud field.
#
# A background layer for the site hero, the store header and the social card;
# never part of an icon or a mark file. Vertical strings at positions from the
# coprime periods Seriatim uses, so the pattern of gaps does not repeat inside
# the field -- the same argument the instrument makes. Four strings take the
# voice colours where the colour orbit's arc-length quarters sit. The cloud is
# the mark's own stroke continued past its edge as dry brush.
# --------------------------------------------------------------------------
STRING_PERIODS = (5, 7, 11, 13)
STRING_GRID = 4
MUTED_ON_DARK = "#8b8b9e"


def string_positions(width: int) -> list[int]:
    xs = set()
    for p in STRING_PERIODS:
        for i in range(width // (STRING_GRID * p) + 1):
            xs.add((STRING_GRID * i * p) % width)
    return sorted(xs)


def voice_string_xs() -> list[float]:
    """x-centroids, in mark coordinates, of the colour orbit's four arc-length quarters."""
    colour, _ = two_orbits()
    to_param = arc_param(colour)
    n = len(colour)
    out = []
    for k in range(4):
        i0, i1 = int(to_param(k / 4) * (n - 1)), int(to_param((k + 1) / 4) * (n - 1))
        seg = colour[i0:i1] or colour[i0:i0 + 1]
        out.append(sum(p[0] for p in seg) / len(seg))
    return out


def strings_field_svg(width: int, height: int, mark_px: float,
                      ink: str = INK_ON_DARK, muted: str = MUTED_ON_DARK) -> str:
    """The strings only, as an SVG fragment in field coordinates. The mark is
    assumed centred with side mark_px, which is where the voice strings land."""
    lines = [f'<line x1="{x}" y1="0" x2="{x}" y2="{height}" stroke="{muted}" '
             f'stroke-opacity="0.06" stroke-width="1"/>' for x in string_positions(width)]
    s = mark_px / VIEWBOX
    x0 = (width - mark_px) / 2
    for vx, colour in zip(voice_string_xs(), VOICE):
        x = x0 + vx * s
        lines.append(f'<line x1="{x:.1f}" y1="0" x2="{x:.1f}" y2="{height}" '
                     f'stroke="{colour}" stroke-width="1"/>')
    return ''.join(lines)


def cloud_svg(ink: str = INK_ON_DARK) -> str:
    """The two orbits again, larger and drier, ink only, at 12 %."""
    colour, inkorb = two_orbits(scale=HOUSE_SCALE * 1.35)
    body = (brush(inkorb, HOUSE_W, [(0, ink), (1, ink)], bristles=8, dry=.9, wobble=.8,
                  seed0=.58, chunk=8)
            + brush(colour, HOUSE_W, [(0, ink), (1, ink)], bristles=8, dry=.9, wobble=.8,
                    seed0=.31, chunk=8))
    return f'<g opacity="0.12">{body}</g>'


def hero_field_svg(width: int = 1200, height: int = 630) -> str:
    mark_px = height * 0.8
    s = mark_px / VIEWBOX
    x0, y0 = (width - mark_px) / 2, (height - mark_px) / 2
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
            f'width="{width}" height="{height}" role="img" aria-label="Chaos of Zen">\n'
            f'  <rect width="{width}" height="{height}" fill="{GROUND_SCORE}"/>\n'
            f'  {strings_field_svg(width, height, mark_px)}\n'
            f'  <g transform="translate({x0:.2f} {y0:.2f}) scale({s:.6f})">{cloud_svg()}{house_body()}</g>\n'
            f'</svg>\n')


def _svg(body: str, label: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" '
            f'role="img" aria-label="{label}">\n  {body}\n</svg>\n')


def house_mark_svg() -> str:
    return _svg(house_body(), "Chaos of Zen")


def ekphrasis_mark_svg() -> str:
    return _svg(ekphrasis_mark(), "Ekphrasis")


def seriatim_mark_svg() -> str:
    return _svg(seriatim_mark(), "Seriatim")


def seriatim_icon_svg() -> str:
    return _svg(ICON_GROUND + seriatim_icon(), "Seriatim")


def ekphrasis_icon_svg() -> str:
    return _svg(ICON_GROUND + ekphrasis_icon(), "Ekphrasis")


# --------------------------------------------------------------------------
# Store assets
#
# The Lemon Squeezy storefront at store.chaosofzen.com uploads its own logo and
# favicon rather than reading the site's, and two things change relative to
# everything in public/:
#
#   1. THE GROUND IS BAKED IN. public/favicon.svg emits its ink as currentColor
#      and public/icon-*.png are transparent with #eceaf2 ink -- both are built
#      to inherit a ground the page supplies. The storefront's card is a light
#      one we do not control, so an inherited ground is an invisible mark. The
#      store assets carry #0e0e14 themselves.
#   2. CONTAINMENT IS A QUESTION ABOUT A CIRCLE. The storefront crops the logo
#      to a circle, not to the macOS rounded rect of BUG-5. Same defect, other
#      shape: measure it, do not assume it. measure_icon.py --circle.
#
# The mark is the house mark rather than a product's. The avatar identifies the
# MERCHANT -- on the store page, at checkout, and on every receipt -- and the
# store sells Seriatim now and Ekphrasis later. Section 4.3: the studio holds
# what the products divide.
#
# The ground is full-bleed. A circle crop then removes only ground, and if the
# storefront ever stops cropping, a dark square tile is still the right thing.
# --------------------------------------------------------------------------
STORE_GROUND = '<rect x="0" y="0" width="128" height="128" fill="#0e0e14"/>'


def store_logo_svg() -> str:
    """The merchant avatar. Rasterised to 320 px; see design/README.md.

    The full house mark, ink baked to #eceaf2, on the opaque store ground.
    """
    return _svg(STORE_GROUND + house_body(INK_ON_DARK), "Chaos of Zen")


def store_favicon_svg() -> str:
    """The storefront tab icon. Rasterised to 32 px. The icon construction,
    ink baked, on the opaque store ground."""
    return _svg(STORE_GROUND + house_icon(INK_ON_DARK), "Chaos of Zen")


def store_product_svg() -> str:
    """Seriatim's product thumbnail for the storefront.

    seriatim_mark() unmodified on the store ground. It is grounded for the same
    reason the logo is: section 5.1 records sage (#a8c686) as the one voice
    colour that does not carry onto light, so a transparent thumbnail loses a
    voice on the storefront's light card -- the exact failure the grounded
    constructions exist to prevent.

    This is the one store asset that takes a PRODUCT mark rather than the house
    mark. The avatar identifies the merchant; a thumbnail identifies the thing
    being bought.
    """
    return _svg(STORE_GROUND + seriatim_mark(), "Seriatim")


ASSETS = {
    "public/favicon.svg": favicon_svg,
    "public/marks/chaos-of-zen.svg": house_mark_svg,
    "public/marks/chaos-of-zen-icon.svg": house_icon_svg,
    "public/marks/ekphrasis.svg": ekphrasis_mark_svg,
    "public/marks/ekphrasis-icon.svg": ekphrasis_icon_svg,
    "public/marks/seriatim.svg": seriatim_mark_svg,
    "public/marks/seriatim-icon.svg": seriatim_icon_svg,
    "public/marks/field.svg": hero_field_svg,
    "design/store/logo.svg": store_logo_svg,
    "design/store/favicon.svg": store_favicon_svg,
    "design/store/product-seriatim.svg": store_product_svg,
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true", help="regenerate assets in place")
    ap.add_argument("--verify", action="store_true",
                    help="check committed assets match this generator (exit 1 if not)")
    args = ap.parse_args()
    if not (args.write or args.verify):
        ap.print_help()
        return 0

    root = Path(__file__).resolve().parent.parent
    failed = False
    for rel, fn in ASSETS.items():
        path, produced = root / rel, fn()
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(produced)
            print(f"wrote    {rel}  ({len(produced)} bytes)")
        else:
            current = path.read_text() if path.exists() else None
            if current == produced:
                print(f"match    {rel}  ({len(produced)} bytes)")
            else:
                have = len(current) if current is not None else "missing"
                print(f"MISMATCH {rel}  committed={have} generated={len(produced)}")
                failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
