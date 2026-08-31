#!/usr/bin/env python3
"""The five Lemon Squeezy storefront surfaces, and proof each one clears AA.

Lemon Squeezy themes five surfaces independently -- Store, Checkout, Overlay
checkout, Customer Portal and Emails -- and each can override the theme's
colours. Those settings live in a web dashboard and cannot be committed, so
what lives here is the DECISION, plus a check that refuses an invalid one.

    python3 design/surfaces.py            # print the table
    python3 design/surfaces.py --verify   # exit 1 if any pairing fails AA

THE ACCENT IS GROUND-DEPENDENT AND THE DASHBOARD OFFERS ONE GLOBAL BUTTON
COLOUR. That is the trap this file exists for. spec.md 5.1 settled that light
grounds take #17786e and dark grounds take #29b6a8; the reverse pairings are
3.62:1 and 2.51:1, both failures, and both are one careless copy away in a
colour picker that does not know which surface it is theming.

Standard library only, like mark.py.
"""
from __future__ import annotations

import argparse
import sys
from typing import NamedTuple

AA = 4.5            # body-size text, which is what these accents are used for

ACCENT_ON_LIGHT = "#17786e"
ACCENT_ON_DARK = "#29b6a8"
GROUND_LIGHT = "#f2f1f5"
GROUND_DARK = "#0e0e14"
INK_ON_LIGHT = "#12121a"
WHITE = "#ffffff"


class Surface(NamedTuple):
    name: str
    ground: str
    accent: str        # accent used as text on `ground` (links, prices)
    button: str        # button fill
    button_text: str   # text on that fill


# All five are set light, matching the Vanilla theme and the website's default.
# A surface switched to a dark ground must ALSO switch to ACCENT_ON_DARK, with
# INK_ON_LIGHT on the button; --verify rejects it otherwise.
SURFACES = [
    Surface("Store", GROUND_LIGHT, ACCENT_ON_LIGHT, ACCENT_ON_LIGHT, WHITE),
    Surface("Checkout", GROUND_LIGHT, ACCENT_ON_LIGHT, ACCENT_ON_LIGHT, WHITE),
    Surface("Overlay checkout", GROUND_LIGHT, ACCENT_ON_LIGHT, ACCENT_ON_LIGHT, WHITE),
    Surface("Customer Portal", GROUND_LIGHT, ACCENT_ON_LIGHT, ACCENT_ON_LIGHT, WHITE),
    Surface("Emails", GROUND_LIGHT, ACCENT_ON_LIGHT, ACCENT_ON_LIGHT, WHITE),
]

# Pairings the system already settled, with the ratios spec.md 5.1 records.
# The False rows matter as much as the True ones: they prove the check can
# still reject, so a regression in the contrast maths cannot pass silently by
# quietly approving everything.
CASES = [
    ("#17786e", "#f2f1f5", 4.73, True),
    ("#17786e", "#ffffff", 5.32, True),
    ("#ffffff", "#17786e", 5.32, True),
    ("#29b6a8", "#0e0e14", 7.65, True),
    ("#12121a", "#29b6a8", 7.41, True),
    ("#29b6a8", "#f2f1f5", 2.24, False),
    ("#1d8d82", "#f2f1f5", 3.60, False),
    ("#ffffff", "#29b6a8", 2.51, False),
    ("#17786e", "#0e0e14", 3.62, False),
]


def luminance(hexcol: str) -> float:
    """WCAG relative luminance."""
    h = hexcol.lstrip("#")
    ch = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    ch = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in ch]
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]


def ratio(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def verify() -> int:
    failed = False

    for fg, bg, expected, must_pass in CASES:
        got = ratio(fg, bg)
        if abs(got - expected) > 0.01:
            print(f"DRIFT    {fg} on {bg}: expected {expected:.2f} got {got:.2f}")
            failed = True
        elif (got >= AA) != must_pass:
            verdict = "should pass" if must_pass else "should be rejected"
            print(f"WRONG    {fg} on {bg} at {got:.2f} -- {verdict}")
            failed = True

    print(f"{'surface':18s} {'accent/ground':>14s} {'text/button':>13s}")
    for s in SURFACES:
        a, b = ratio(s.accent, s.ground), ratio(s.button_text, s.button)
        flag = "" if min(a, b) >= AA else "   <- FAILS AA"
        print(f"{s.name:18s} {a:>13.2f}: {b:>12.2f}:{flag}")
        if min(a, b) < AA:
            failed = True
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--verify", action="store_true",
                    help="exit 1 if any surface or settled pairing fails")
    args = ap.parse_args()
    status = verify()          # always prints the table
    return status if args.verify else 0   # bare invocation is a report, not a gate


if __name__ == "__main__":
    sys.exit(main())
