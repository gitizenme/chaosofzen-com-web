#!/usr/bin/env python3
"""The storefront header -- the house mark locked up with an outlined wordmark.

Separate from mark.py because it cannot meet mark.py's one hard property:
mark.py is standard library only, and setting type is not. This file needs
fontTools, uharfbuzz and Astro's downloaded Literata, so it lives beside
measure_icon.py in the category of tools you run by hand.

    pnpm astro build                    # Astro fetches Literata into node_modules
    python3 design/header.py --write            # header.svg -> header-horizontal-1600.png,
                                                 # the installer lockup
    python3 design/header.py --write --stacked  # header-stacked.svg -> header-1600.png,
                                                 # the store upload
    python3 design/header.py --measure          # centre-crop survival of header.svg

THE WORDMARK IS OUTLINED, per spec.md section 6. Nothing here embeds a font, so
the licence question that applies to live UI text does not arise. The glyphs are
shaped by HarfBuzz first, so the wordmark carries Literata's real kerning rather
than naive advance-width placement -- at 78 px the difference in "Ch" and "Ze"
is plainly visible.

Literata is a variable font. Astro subsets it to a wght axis of 200-400, and
this instances it at 300 because that is what global.css sets h1/h2/h3 to: the
wordmark and the site's headings are then the same weight of the same face.

WHY THE HEADER IS GROUND PLUS MARK RATHER THAN A WIDE MARK. The Rossler x-y
projection is bounded in a near-circular region however long you integrate --
t_end adds loops, not width -- so the system contains no wide object to scale
into a 16:3 letterbox. Fitting the orbit to a wide box would be a non-uniform
scale, which is not a parameter change but a different curve, and section 3's
one-system property would not survive it. The empty two thirds are the design,
not a gap: the studio is called Chaos of Zen.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mark  # noqa: E402

W, H = 1600, 300
WORDMARK = "Chaos of Zen"
WEIGHT = 300           # matches global.css h1/h2/h3
TYPE_PX = 78.0
MARK_PER_CAP = 2.2            # horizontal lockup: mark height / wordmark cap height
MARK_PER_CAP_STACKED = 3.2    # stacked lockup ceiling: the 2.2 ratio read as noise at
                               # 300px, but the ceiling is not always a promise -- PAD below
GAP_PER_MARK = 0.5     # horizontal gap, as a fraction of mark height
STACK_GAP_PER_MARK = 0.4
PAD = 16.0              # stacked lockup: px of breathing room top and bottom


def literata(fonts_dir: Path) -> Path:
    """The upright Literata among Astro's hash-named downloads."""
    from fontTools.ttLib import TTFont
    for f in sorted(fonts_dir.glob("*.woff2")):
        ft = TTFont(f)
        name = ft["name"]
        fam = name.getDebugName(16) or name.getDebugName(1) or ""
        sub = name.getDebugName(17) or name.getDebugName(2) or ""
        if fam.startswith("Literata") and "Italic" not in sub:
            return f
    raise SystemExit(f"no upright Literata in {fonts_dir} -- run `pnpm astro build` first")


def wordmark_path(font: Path, text: str, size: float) -> tuple[str, float, float]:
    """Outlined, HarfBuzz-shaped text as one SVG path. Returns (d, width, cap)."""
    import uharfbuzz as hb
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.misc.transform import Transform

    ft = TTFont(font)
    if "fvar" in ft:
        ft = instancer.instantiateVariableFont(ft, {"wght": WEIGHT}, inplace=False)

    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    # Shape with the instanced font, so kerning is the weight's own.
    blob = hb.Blob(_toBytes(ft))
    hb.shape(hb.Font(hb.Face(blob)), buf)

    upem = ft["head"].unitsPerEm
    scale = size / upem
    order = ft.getGlyphOrder()
    glyf = ft.getGlyphSet()

    d, x = [], 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        pen = SVGPathPen(glyf)
        # y flips: font space is up-positive, SVG is down-positive.
        t = Transform(scale, 0, 0, -scale, x + pos.x_offset * scale,
                      -pos.y_offset * scale)
        glyf[order[info.codepoint]].draw(TransformPen(pen, t))
        if (seg := pen.getCommands()):
            d.append(seg)
        x += pos.x_advance * scale
    cap = ft["OS/2"].sCapHeight * scale if hasattr(ft["OS/2"], "sCapHeight") else size * .7
    return " ".join(d), x, cap


def _toBytes(ft) -> bytes:
    """Serialise for HarfBuzz, which cannot read woff2.

    fontTools keeps the flavor it loaded with, so saving a font that came from
    a .woff2 writes .woff2 back out. HarfBuzz then fails to make a face at all
    and shapes every character to .notdef -- which renders as a row of tofu
    boxes rather than as an error.
    """
    import io
    ft.flavor = None
    b = io.BytesIO()
    ft.save(b)
    return b.getvalue()


def header_svg(fonts_dir: Path, stacked: bool = False) -> str:
    d, tw, cap = wordmark_path(literata(fonts_dir), WORDMARK, TYPE_PX)
    if stacked:
        # The stack is fitted to the banner: the ratio is a ceiling, not a promise.
        mark_px = min(MARK_PER_CAP_STACKED * cap,
                      (H - 2 * PAD - 1.35 * cap) / (1 + STACK_GAP_PER_MARK))
    else:
        mark_px = MARK_PER_CAP * cap
    # The mark is mark.py's house mark, unmodified, scaled off its 128 viewBox.
    body = mark.house_body()
    s = mark_px / mark.VIEWBOX

    if stacked:
        gap = STACK_GAP_PER_MARK * mark_px
        total_h = mark_px + gap + cap
        mark_x = (W - mark_px) / 2.0
        mark_y = (H - total_h - 0.35 * cap) / 2.0
        text_x = (W - tw) / 2.0
        text_y = mark_y + mark_px + gap + cap
    else:
        # Centre the whole lockup, so a centre crop keeps it -- see --measure.
        gap = GAP_PER_MARK * mark_px
        total = mark_px + gap + tw
        mark_x = (W - total) / 2.0
        mark_y = (H - mark_px) / 2.0
        text_x = mark_x + mark_px + gap
        text_y = H / 2.0 + cap / 2.0          # optical centre on cap height

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" \
width="{W}" height="{H}" role="img" aria-label="Chaos of Zen">
  <rect width="{W}" height="{H}" fill="{mark.GROUND_SCORE}"/>
  <g transform="translate({mark_x:.2f} {mark_y:.2f}) scale({s:.6f})">{body}</g>
  <path transform="translate({text_x:.2f} {text_y:.2f})" d="{d}" \
fill="{mark.INK_ON_DARK}"/>
</svg>
'''


def measure(svg_path: Path) -> int:
    """Does the horizontal lockup survive the crops a 16:3 banner actually gets?

    A storefront header is centre-cropped as the viewport narrows. Ink lost to
    that is the same defect class as BUG-5 -- part of the mark somewhere it
    cannot be seen -- so it is measured rather than assumed.

    Centre-crop survival is only defined on the horizontal lockup (header.svg),
    not the stacked one, so this renders its own PNG from header.svg into a
    scratch directory rather than reading a committed raster -- header-1600.png
    is the store upload and always holds the stacked orientation now that
    horizontal writes its own header-horizontal-1600.png instead.
    """
    if not svg_path.exists():
        print(f"{svg_path} not found -- run --write first")
        return 1

    import tempfile
    from PIL import Image
    with tempfile.TemporaryDirectory() as td:
        png = Path(td) / "header-measure.png"
        subprocess.run(["inkscape", str(svg_path), "-w", str(W), "-h", str(H),
                        "--export-filename", str(png)], check=True, capture_output=True)
        im = Image.open(png).convert("RGB")
        w, h = im.size
        px = im.load()
        g = mark._rgb(mark.GROUND_SCORE)
        cols = [x for x in range(w)
                if any(sum(abs(a - b) for a, b in zip(px[x, y], g)) > 40 for y in range(h))]

    lo, hi = min(cols), max(cols)
    print(f"lockup spans x {lo}-{hi} of {w}  ({(hi - lo) / w * 100:.1f}% of the width)")
    print(f"{'crop':>10s} {'kept':>8s}")
    failed = False
    for ratio in (16 / 3, 4.0, 3.0, 2.5, 2.0):
        cw = min(w, int(h * ratio))
        x0 = (w - cw) // 2
        kept = sum(1 for x in cols if x0 <= x < x0 + cw) / len(cols)
        flag = "" if kept > 0.999 else "   <- CLIPPED"
        print(f"{ratio:>10.2f} {kept * 100:>7.1f}%{flag}")
        if kept <= 0.999:
            failed = True
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true", help="write the SVG and rasterise it")
    ap.add_argument("--measure", action="store_true", help="check centre-crop survival")
    ap.add_argument("--stacked", action="store_true",
                    help="mark above the wordmark (the store header) instead of beside it")
    ap.add_argument("--fonts", default="node_modules/.astro/fonts",
                    help="where Astro put the downloaded faces")
    a = ap.parse_args()
    if not (a.write or a.measure):
        ap.print_help()
        return 0

    root = Path(__file__).resolve().parent.parent
    svg_name = "header-stacked.svg" if a.stacked else "header.svg"
    svg = root / "design/store" / svg_name
    # Stacked writes the store upload (header-1600.png); horizontal writes its
    # own file, so the two orientations no longer clobber each other's raster.
    png_name = "header-1600.png" if a.stacked else "header-horizontal-1600.png"
    png = root / "design/store" / png_name
    if a.write:
        svg.write_text(header_svg(root / a.fonts, stacked=a.stacked))
        print(f"wrote    {svg.relative_to(root)}  ({svg.stat().st_size} bytes)")
        subprocess.run(["inkscape", str(svg), "-w", str(W), "-h", str(H),
                        "--export-filename", str(png)], check=True, capture_output=True)
        print(f"wrote    {png.relative_to(root)}  ({png.stat().st_size} bytes)")
    return measure(root / "design/store/header.svg") if a.measure else 0


if __name__ == "__main__":
    sys.exit(main())
