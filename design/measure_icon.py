#!/usr/bin/env python3
"""Measure how a mark survives at icon size.

Two things, because measuring only the first one lets a real defect through.

1. LEGIBILITY. Render at 16 px and classify every non-ground pixel to its
   nearest palette entry in RGB Euclidean distance. Report how many of the
   four voices retain at least 3 px, and the min/max balance across them.

2. CONTAINMENT. If the mark carries a ground rect, render it again WITHOUT
   that rect and report how much of the ink falls outside where the ground
   would have been.

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
"""
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
# A pixel counts as a voice only if it is within this RGB distance of it.
# 60 is wide enough to admit antialiased edges and narrow enough to reject
# the ink/pigment midtone the feather produces at small sizes.
THRESHOLD = 60
MIN_PIXELS = 3

# The ground rect in viewBox units: the macOS icon grid's 824/1024, i.e.
# 103 of 128, inset 12.5 either side.
GROUND_RECT = (12.5, 12.5, 115.5, 115.5)
GROUND_FILL = 'fill="#0e0e14"'


def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def render(svg_text: str, png: Path, size: int, background: str | None = None):
    src = png.with_suffix(".svg")
    src.write_text(svg_text)
    cmd = ["inkscape", str(src), "-w", str(size), "-h", str(size)]
    if background:
        cmd += ["--export-background", background]
    cmd += ["--export-filename", str(png)]
    subprocess.run(cmd, check=True, capture_output=True)


def escaped_fraction(svg_text: str, tmp: Path, size: int = 256) -> float | None:
    """How much ink falls outside the ground rect. None if there is no ground.

    Renders with the ground rect stripped, so every non-transparent pixel is
    mark ink rather than backdrop.
    """
    import re
    stripped, n = re.subn(r"<rect\b[^>]*" + re.escape(GROUND_FILL) + r"[^>]*/>",
                          "", svg_text)
    if n == 0:
        return None
    png = tmp / "noground.png"
    render(stripped, png, size)
    im = Image.open(png).convert("RGBA")
    px = im.load()
    sc = size / 128.0
    x0, y0, x1, y1 = (v * sc for v in GROUND_RECT)
    total = outside = 0
    for y in range(size):
        for x in range(size):
            if px[x, y][3] > 40:
                total += 1
                if x < x0 or x > x1 or y < y0 or y > y1:
                    outside += 1
    return (outside / total) if total else 0.0


def measure(svg: Path, size: int = 16):
    svg_text = svg.read_text()
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        png = tmp / "out.png"
        render(svg_text, png, size, background="#0e0e14")
        escaped = escaped_fraction(svg_text, tmp)
        im = Image.open(png).convert("RGB")
        counts = {k: 0 for k in VOICES}
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
            for name, colour in list(VOICES.items()) + [("ink", INK)]:
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
    }


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1
    print(f"{'asset':34s} {'voices':>6s} {'balance':>8s} {'coverage':>9s} "
          f"{'escaped':>8s}")
    failed = False
    for arg in argv[1:]:
        r = measure(Path(arg))
        esc = "n/a" if r["escaped"] is None else f"{r['escaped'] * 100:.1f}%"
        print(f"{arg:34s} {r['readable']:>4d}/4 {r['balance']:>8.2f} "
              f"{r['coverage'] * 100:>8.1f}% {esc:>8s}")
        print(f"{'':34s} {r['counts']}")
        # Ink outside the ground is a defect, not a note: it puts part of the
        # mark on the desktop. Anything above a rounding error fails.
        if r["escaped"] is not None and r["escaped"] > 0.001:
            print(f"{'':34s} ESCAPED: {esc} of the ink is outside the ground rect")
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
