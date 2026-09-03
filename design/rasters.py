#!/usr/bin/env python3
"""Rasterise the marks. Needs Inkscape; run by hand.

    python3 design/rasters.py

Geometry comes from mark.py; this only rasterises. The ICO is a container of
PNG payloads (valid since Vista), assembled here so no editor touches it.
"""
from __future__ import annotations

import struct
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC, STORE, MARKS = ROOT / "public", ROOT / "design/store", ROOT / "public/marks"

# (source svg, output png, size)
RASTERS = [
    (MARKS / "chaos-of-zen-icon.svg", PUBLIC / "icon-16.png", 16),
    (MARKS / "chaos-of-zen-icon.svg", PUBLIC / "icon-32.png", 32),
    (MARKS / "chaos-of-zen-icon.svg", PUBLIC / "icon-48.png", 48),
    (MARKS / "chaos-of-zen-icon.svg", PUBLIC / "icon-512.png", 512),
    (MARKS / "chaos-of-zen-icon.svg", PUBLIC / "apple-touch-icon.png", 180),
    (STORE / "logo.svg", STORE / "logo-320.png", 320),
    (STORE / "favicon.svg", STORE / "favicon-32.png", 32),
    (STORE / "product-seriatim.svg", STORE / "product-seriatim-1024.png", 1024),
]


def inkscape(svg: Path, png: Path, size: int) -> None:
    try:
        subprocess.run(["inkscape", str(svg), "-w", str(size), "-h", str(size),
                        "--export-filename", str(png)], check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.stderr.decode())
    print(f"wrote {png.relative_to(ROOT)}  {size}px")


def ico(pngs: list[Path], out: Path) -> None:
    """ICO container with PNG payloads: 6-byte header, 16-byte entries, data."""
    payloads = [p.read_bytes() for p in pngs]
    header = struct.pack("<HHH", 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries, blob = b"", b""
    for p, data in zip(pngs, payloads):
        size = int(p.stem.split("-")[1])          # icon-16.png -> 16
        w = h = 0 if size >= 256 else size
        entries += struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(data), offset + len(blob))
        blob += data
    out.write_bytes(header + entries + blob)
    print(f"wrote {out.relative_to(ROOT)}  {[p.name for p in pngs]}")


def main() -> int:
    for svg, png, size in RASTERS:
        inkscape(svg, png, size)
    ico([PUBLIC / "icon-16.png", PUBLIC / "icon-32.png", PUBLIC / "icon-48.png"],
        PUBLIC / "favicon.ico")
    return 0


if __name__ == "__main__":
    sys.exit(main())
