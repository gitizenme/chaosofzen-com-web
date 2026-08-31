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
# The brush
# --------------------------------------------------------------------------
BREATH = lambda t: 2.4 + 8.8 * math.sin(math.pow(min(t * 1.06, 1), .8) * math.pi)
BREATH_SMALL = lambda t: 4.0 + 9.5 * math.sin(math.pow(t, .8) * math.pi)


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
    """public/favicon.svg -- baked at reduced fidelity; never renders above 64px.

    The ramp is quantised to five flat colours and the ink emitted as
    currentColor, so one copy serves both themes and the file is 4.7 KB rather
    than 33 KB.
    """
    palette = [INK_ON_LIGHT] + VOICE

    def snap(hexcol: str) -> str:
        target = _rgb(hexcol)
        best = min(palette, key=lambda c: sum((a - b) ** 2 for a, b in zip(_rgb(c), target)))
        return "currentColor" if best == INK_ON_LIGHT else best

    stops = [(0, INK_ON_LIGHT), (.30, INK_ON_LIGHT), (.40, TEAL), (.52, TEAL),
             (.62, SAGE), (.68, SAGE), (.78, AMBER), (.84, AMBER),
             (.94, VERMILION), (1, VERMILION)]
    orbit = fit_one(rossler(t_end=13.2, step=24))
    body = brush(orbit, BREATH_SMALL, stops, bristles=3, dry=.45, wobble=.4, chunk=24)
    body = re.sub(r'fill="(#[0-9a-f]{6})"', lambda m: f'fill="{snap(m.group(1))}"', body)
    body = re.sub(r'(\d+)\.\d', r'\1', body)          # integer coordinates
    body = body.replace('/><path', '/>\n  <path')

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-labelledby="t">
  <title id="t">Chaos of Zen</title>
  <!-- A Rossler attractor orbit, drawn as a sumi-e stroke that feathers through
       the four voice colours of seriatim/plugin/Source/ScoreView.cpp:7.
       Baked at reduced fidelity: this never renders above 64 px. The ink takes
       currentColor so one copy serves both themes. -->
  {body}
  <style>
    svg {{ color: {INK_ON_LIGHT}; }}
    @media (prefers-color-scheme: dark) {{ svg {{ color: {INK_ON_DARK}; }} }}
  </style>
</svg>
'''


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
    orbit = fit_one(rossler())
    return brush(orbit, IMAGE_W, single_stops(ink, TEAL),
                 bristles=6, dry=.28, wobble=.45)


def seriatim_mark(ink: str = INK_ON_DARK, voices: int = 4, gap: float = 0.12) -> str:
    """Four voices dividing one orbit, with a rest between each.

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
    orbit = fit_one(rossler(t_end=26.0, step=5))
    to_param = arc_param(orbit)
    span = 1.0 / voices
    out = []
    for k in range(voices):
        lo = to_param(k * span + gap * span)
        hi = to_param((k + 1) * span - gap * span)
        colour = VOICE[k % len(VOICE)]
        a = lo + (hi - lo) * .08
        b = a + max(0.26, .04) * (hi - lo) * 1.2
        stops = [(0, ink), (a, ink), (min(b, hi), colour), (1, colour)]
        # each voice gets its own breath across its own window
        width = (lambda l, h: lambda t: VOICE_W(min(max((t - l) / (h - l), 0), 1)))(lo, hi)
        out.append(brush(orbit, width, stops, bristles=4, dry=.28,
                         wobble=.26, seed0=SEEDS[k], lo=lo, hi=hi))
    return ''.join(out)


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
ICON_W = lambda t: 14.0 + 8.0 * math.sin(math.pow(t, .7) * math.pi)

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


def seriatim_icon(voices: int = 4, gap: float = 0.14) -> str:
    """Seriatim's mark reduced for bundle icons -- see BUG-4 and BUG-5 above."""
    orbit = fit_one(rossler(t_end=11.0, step=5), margin=30.0)
    to_param = arc_param(orbit)
    span = 1.0 / voices
    out = [ICON_GROUND]
    for k in range(voices):
        lo = to_param(k * span + gap * span)
        hi = to_param((k + 1) * span - gap * span)
        colour = VOICE[k % len(VOICE)]
        stops = [(0, colour), (1, colour)]      # solid: no ink handover
        width = (lambda l, h: lambda t:
                 ICON_W(min(max((t - l) / (h - l), 0), 1)))(lo, hi)
        out.append(brush(orbit, width, stops, bristles=2, dry=0.0,
                         wobble=0.0, seed0=SEEDS[k], lo=lo, hi=hi))
    return ''.join(out)


def _svg(body: str, label: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" '
            f'role="img" aria-label="{label}">\n  {body}\n</svg>\n')


def house_mark_svg() -> str:
    orbit = fit_one(rossler())
    return _svg(brush(orbit, BREATH, house_stops(INK_ON_DARK, .10), bristles=6, dry=.8),
                "Chaos of Zen")


def ekphrasis_mark_svg() -> str:
    return _svg(ekphrasis_mark(), "Ekphrasis")


def seriatim_mark_svg() -> str:
    return _svg(seriatim_mark(), "Seriatim")


def seriatim_icon_svg() -> str:
    return _svg(seriatim_icon(), "Seriatim")


ASSETS = {
    "public/favicon.svg": favicon_svg,
    "public/marks/chaos-of-zen.svg": house_mark_svg,
    "public/marks/ekphrasis.svg": ekphrasis_mark_svg,
    "public/marks/seriatim.svg": seriatim_mark_svg,
    "public/marks/seriatim-icon.svg": seriatim_icon_svg,
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
