#!/usr/bin/env python3
"""Measure how a mark survives at icon size.

Two things, because measuring only the first one lets a real defect through.

1. LEGIBILITY. Render at 16 px and classify every non-ground pixel to its
   nearest palette entry in RGB Euclidean distance. Report how many of the
   four voices retain at least 3 px, and the min/max balance across them.

2. CONTAINMENT. If the mark carries a ground rect, render it again WITHOUT
   that rect and report how much of the ink falls outside where the ground
   would have been. The rect's geometry is read off the asset -- see GROUND_RE.
   Pass --circle for assets whose consumer crops them round.

BUG-5: the first icon that passed this tool scored 4 of 4 voices at a 0.91
balance with 43% of its ink OUTSIDE the rounded rect -- three of the four
voices were sitting on the desktop rather than on the icon. A metric that only
counts coloured pixels is perfectly happy with voices that have escaped. The
containment check exists because that defect passed a measurement and was
caught by looking, which is the reverse of every other finding in this system.

This is the measurement behind spec.md 4.1. It needs a renderer (Inkscape)
and Pillow, neither of which mark.py depends on -- run it by hand, not in CI.

    python3 design/measure_icon.py public/marks/seriatim.svg \
                                   public/marks/seriatim-icon.svg
    python3 design/measure_icon.py --size 32 design/store/favicon.svg
    python3 design/measure_icon.py --size 320 --circle design/store/logo.svg
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

GROUND = (0x0e, 0x0e, 0x14)
INK = (0xec, 0xea, 0xf2)
VOICES = {
    "vermilion": (0xe4, 0x57, 0x2e),
    "teal": (0x29, 0xb6, 0xa8),
    "amber": (0xf3, 0xa7, 0x12),
    "sage": (0xa8, 0xc6, 0x86),
}


# Fills that are ground or ink, not a colour band -- shared by bands_from_svg
# (which colours a mark carries) and layer_alpha (which group carries them).
NON_BAND_FILLS = ("#0e0e14", "#eceaf2", "#12121a")


def bands_from_svg(svg_text: str) -> dict[str, tuple[int, int, int]]:
    """The colours a mark actually carries: every fill that is neither the
    ground nor the ink, in order of first appearance, named band1, band2..."""
    seen, out = [], {}
    for h in re.findall(r'fill="(#[0-9a-f]{6})"', svg_text):
        if h in seen or h in NON_BAND_FILLS:
            continue
        seen.append(h)
        out[f"band{len(seen)}"] = tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
    return out


# A pixel counts as a voice only if it is within this RGB distance of it.
# 60 is wide enough to admit antialiased edges and narrow enough to reject
# the ink/pigment midtone the feather produces at small sizes.
THRESHOLD = 60
MIN_PIXELS = 3

# The ground rect is PARSED from the asset, not assumed. There are two ground
# geometries in this system now -- seriatim_icon()'s macOS grid rect (824/1024,
# i.e. 103 of 128, inset 12.5 either side) and the store assets' full-bleed
# 128x128 -- and measuring the second against the first reports a 3.1% escape
# for ink that is comfortably on its own ground. That is BUG-5's failure mode
# running backwards: a containment metric that is wrong about where the ground
# is will lie in whichever direction its constant happens to point.
GROUND_FILL = 'fill="#0e0e14"'
GROUND_RE = (r'<rect\b(?=[^>]*' + GROUND_FILL + r')[^>]*?'
             r'x="([\d.]+)"[^>]*?y="([\d.]+)"[^>]*?'
             r'width="([\d.]+)"[^>]*?height="([\d.]+)"[^>]*/>')


def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def layer_alpha(svg_text: str) -> float:
    """The opacity of the group that actually carries the colour bands --
    not just any group's opacity. An asset can carry more than one <g
    opacity="..."> block at different strengths (field.svg layers an
    ink-only cloud at 0.12 UNDER the 0.76 colour loop); taking the minimum
    across all of them would composite the bands at the cloud's alpha
    instead of their own. So: walk the top-level <g ...>...</g> blocks in
    order, and for each, read a plain `opacity` attribute (the lookbehind
    excludes `fill-opacity`/`stroke-opacity`, which also end in "opacity"
    but are a different thing) and check whether its body carries any fill
    that is not ground or ink (NON_BAND_FILLS, the same set bands_from_svg
    excludes) -- i.e. whether this is the group actually painting the
    bands. The first such group's opacity wins; if it has no opacity
    attribute at all, or no group carries a band fill, the asset is
    unlayered and this returns 1.0 (no compositing). Assumes the band-
    carrying group is not itself nested inside another group with its own
    opacity -- a doubly-nested opacity would need multiplying, which this
    walk (first match wins) does not do."""
    for m in re.finditer(r'<g\b([^>]*)>(.*?)</g>', svg_text, re.S):
        attrs, body = m.groups()
        fills = set(re.findall(r'fill="(#[0-9a-f]{6})"', body))
        if fills - set(NON_BAND_FILLS):
            op = re.search(r'(?<![\w-])opacity="([\d.]+)"', attrs)
            return float(op.group(1)) if op else 1.0
    return 1.0


def composite(colour, ground, alpha):
    return tuple(round(alpha * c + (1 - alpha) * g) for c, g in zip(colour, ground))


def render(svg_text: str, png: Path, size: int, background: str | None = None):
    src = png.with_suffix(".svg")
    src.write_text(svg_text)
    cmd = ["inkscape", str(src), "-w", str(size), "-h", str(size)]
    if background:
        cmd += ["--export-background", background]
    cmd += ["--export-filename", str(png)]
    subprocess.run(cmd, check=True, capture_output=True)


def escaped_fraction(svg_text: str, tmp: Path, size: int = 256,
                     circle: bool = False) -> float | None:
    """How much ink falls outside the ground. None if there is no ground.

    Renders with the ground rect stripped, so every non-transparent pixel is
    mark ink rather than backdrop.

    `circle` measures against the inscribed circle instead of GROUND_RECT, for
    assets whose consumer crops them round -- the Lemon Squeezy storefront
    avatar does. BUG-5 was ink sitting outside a rounded rect; the same class
    of defect against a circle would look identical from here, so it gets the
    same measurement rather than an assumption.
    """
    m = re.search(GROUND_RE, svg_text)
    if m is None:
        return None
    gx, gy, gw, gh = (float(v) for v in m.groups())
    stripped = svg_text[:m.start()] + svg_text[m.end():]
    png = tmp / "noground.png"
    render(stripped, png, size)
    im = Image.open(png).convert("RGBA")
    px = im.load()
    sc = size / 128.0
    x0, y0, x1, y1 = gx * sc, gy * sc, (gx + gw) * sc, (gy + gh) * sc
    c = size / 2.0
    total = outside = 0
    for y in range(size):
        for x in range(size):
            if px[x, y][3] > 40:
                total += 1
                if circle:
                    if (x + .5 - c) ** 2 + (y + .5 - c) ** 2 > c * c:
                        outside += 1
                elif x < x0 or x > x1 or y < y0 or y > y1:
                    outside += 1
    return (outside / total) if total else 0.0


def measure(svg: Path, size: int = 16, circle: bool = False, bands=None):
    svg_text = svg.read_text()
    palette = bands if bands is not None else VOICES
    # The colour layer is composited at the group's opacity over the ground,
    # so a pure voice value is never on screen: what renders is
    # alpha*colour + (1-alpha)*ground. Classify against that composited
    # colour, not the source value, or a band sitting close to THRESHOLD's
    # edge reads as unreadable when it is only unreadable to the wrong
    # reference colour. The ink loop sits outside the opacity group (it is
    # UNDER the colour layer, not inside it) so it stays at full strength.
    alpha = layer_alpha(svg_text)
    expected = {name: composite(colour, GROUND, alpha)
                for name, colour in palette.items()}
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        png = tmp / "out.png"
        render(svg_text, png, size, background="#0e0e14")
        escaped = escaped_fraction(svg_text, tmp, circle=circle)
        im = Image.open(png).convert("RGB")
        counts = {k: 0 for k in palette}
        lit = 0
        # Pillow 12 renamed getdata() to get_flattened_data(); accept either so
        # this keeps running on whichever the machine happens to have.
        pixels = (im.get_flattened_data() if hasattr(im, "get_flattened_data")
                  else im.getdata())
        for px in pixels:
            if dist(px, GROUND) < 30:
                continue
            lit += 1
            best, best_d = None, 1e9
            for name, colour in list(expected.items()) + [("ink", INK)]:
                d = dist(px, colour)
                if d < best_d:
                    best, best_d = name, d
            if best in counts and best_d < THRESHOLD:
                counts[best] += 1
    values = sorted(counts.values())
    return {
        "escaped": escaped,
        "counts": counts,
        "readable": sum(1 for v in counts.values() if v >= MIN_PIXELS),
        "balance": (values[0] / values[-1]) if values[-1] else 0.0,
        "coverage": lit / (size * size),
        "alpha": alpha,
    }


def main(argv):
    import argparse
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("assets", nargs="*", help="SVG files to measure")
    ap.add_argument("--size", type=int, default=16,
                    help="render size in px (default 16)")
    ap.add_argument("--circle", action="store_true",
                    help="measure containment against the inscribed circle "
                         "rather than the macOS rounded rect")
    ap.add_argument("--bands", action="store_true",
                    help="classify against the colours the asset carries, not the four "
                         "voices -- meant for icons; a full mark yields hundreds of "
                         "distinct fills, not a handful of bands")
    args = ap.parse_args(argv[1:])
    if not args.assets:
        ap.print_help()
        return 1
    print(f"{'asset':34s} {'voices':>6s} {'balance':>8s} {'coverage':>9s} "
          f"{'escaped':>8s}")
    failed = False
    for arg in args.assets:
        path = Path(arg)
        bands = bands_from_svg(path.read_text()) if args.bands else None
        r = measure(path, size=args.size, circle=args.circle, bands=bands)
        esc = "n/a" if r["escaped"] is None else f"{r['escaped'] * 100:.1f}%"
        print(f"{arg:34s} {r['readable']:>3d}/{len(r['counts']):d} {r['balance']:>8.2f} "
              f"{r['coverage'] * 100:>8.1f}% {esc:>8s}  alpha {r['alpha']:.2f}")
        print(f"{'':34s} {r['counts']}")
        # Ink outside the ground is a defect, not a note: it puts part of the
        # mark on the desktop. Anything above a rounding error fails.
        if r["escaped"] is not None and r["escaped"] > 0.001:
            print(f"{'':34s} ESCAPED: {esc} of the ink is outside the ground rect")
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
