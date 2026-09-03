# Chaos of Zen — design system

Everything visual about the studio and its products, and the code that produces
it. Nothing here ships to the browser; it generates what does.

| | |
|---|---|
| [`mark.py`](mark.py) | The generator. Produces every mark from the equations. |
| [`spec.md`](spec.md) | Why the system is the way it is, and what was rejected. |
| [`measure_icon.py`](measure_icon.py) | Measures whether a mark survives at 16 px, and whether it stays inside its own ground. `--bands` classifies against the colours the asset actually carries, compositing the expected colours through the colour layer's own group opacity. Needs Inkscape and Pillow; run by hand. |
| [`header.py`](header.py) | The store header (stacked) and installer lockup (horizontal). Needs fontTools, uharfbuzz, Inkscape and Astro's downloaded Literata; run by hand. |
| [`surfaces.py`](surfaces.py) | Records each storefront surface's ground and accent, and checks every pairing clears WCAG AA. Standard library only; run by hand. |

## The one rule

**The SVGs are output. Do not edit them.**

The marks are not drawings anyone traced — they are a Rössler attractor orbit
rendered as a sumi-e brushstroke. Change a parameter in `mark.py` and
regenerate. An SVG edited by hand is immediately unreproducible, and the next
regeneration silently reverts it.

```sh
python3 design/mark.py --verify       # do the committed assets match the generator?
python3 design/surfaces.py --verify   # does every storefront surface clear AA?
python3 design/mark.py --write        # regenerate them
```

Both `--verify` commands exit non-zero on a mismatch. CI ignores `design/**` on
every push and pull request, so neither runs automatically anywhere — `design/`
is verified locally, by design. `mark.py --verify` checks that every committed
asset matches the generator byte-for-byte — that is what makes this a source of
truth rather than a copy of one.

Standard library only. No dependencies.

## What it generates

| Asset | What it is |
|---|---|
| `public/favicon.svg` | The icon construction: two outer loops, colour over ink, ink as `currentColor` |
| `public/marks/chaos-of-zen.svg` | The house mark: two orbits mirrored through the centre, spectrum over ink at 76 % |
| `public/marks/chaos-of-zen-icon.svg` | The icon on the macOS rounded-rect ground; source of every raster icon |
| `public/marks/ekphrasis.svg`, `ekphrasis-icon.svg` | Same skeleton; the colour orbit is ink with one teal handover |
| `public/marks/seriatim.svg`, `seriatim-icon.svg` | Same skeleton; the colour orbit is four voices with rests, the icon four flat bands |
| `public/marks/field.svg` | Strings at coprime positions and the mark's own dry-brush cloud, 1200×630, for the hero and the social card |
| `design/store/*.svg` | As before: house mark, icon and Seriatim thumbnail on the opaque store ground |

Every mark is the same orbit drawn by the same brush. What separates them is
**what drives the chaos** — so they are siblings by construction, not by styling.

## What it does *not* generate

Three asset groups are committed as binaries because reproducing them needs more
than Python:

- Raster icons and store PNGs are produced by `python3 design/rasters.py`
  (Inkscape), including `favicon.ico`, which it assembles from the
  16/32/48 PNGs. The raster icons carry the dark rounded-rect ground so they
  read on both light and dark browser chrome.
- **The store header raster** (`design/store/header-1600.png`) — not part of
  `rasters.py`, because it needs real font metrics, not just a mark. Comes from
  `header-stacked.svg`, which [`header.py`](header.py) generates:
  `python3 design/header.py --write --stacked`.
- **The social card** (`public/og/default.png`) — rendered in a browser served
  from this origin, because it must use the real self-hosted Literata and
  Source Sans 3. An earlier attempt silently fell back to system Times, so the
  renderer asserts `document.fonts.check()` for both faces and refuses to draw
  without them.

If these need regenerating, the mark geometry comes from `mark.py`; only the
rasterisation differs.

## Palette

Taken **out of** the plugin source rather than applied to it. The set that
matters is `seriatim/plugin/Source/ScoreView.cpp:7-8` — four voice colours that
were actually chosen, where nearly everything else in both codebases was a JUCE
default or an Astro starter token.

| | | Source |
|---|---|---|
| Vermilion | `#e4572e` | `ScoreView.cpp:7` |
| Teal | `#29b6a8` | `ScoreView.cpp:7` |
| Amber | `#f3a712` | `ScoreView.cpp:8` |
| Sage | `#a8c686` | `ScoreView.cpp:8` |
| Score ground | `#0e0e14` | `ScoreView.cpp:299` |
| Editor ground | `#121214` | ekphrasis `PluginEditor.cpp:22` |
| Panel | `#1a1a22` | `ControlPanel.h:76` |

Four colours, four voices — and Seriatim's mark had four arcs before this
palette was found.

**The accent is not one colour.** Teal reads 7.65:1 on dark and **2.24:1** on
light, which fails AA for body-size link text. Light grounds take `#17786e` at
4.73:1. `#1d8d82` was tried and is not sufficient at 3.60:1.

Applied values live in [`../src/styles/global.css`](../src/styles/global.css).

### The storefront

`store.chaosofzen.com` is a Lemon Squeezy storefront, so its appearance is a
handful of settings in someone else's admin panel rather than CSS we control.
The values, and why each is what it is:

| Setting | Value | |
|---|---|---|
| Header | `design/store/header-1600.png` | 1600×300. ~45 KB against a 10 MB cap |
| Logo | `design/store/logo-320.png` | 2× the recommended 160, for retina. ~50 KB against a 1 MB cap |
| Favicon | `design/store/favicon-32.png` | ~1.7 KB |
| Product thumbnail | `design/store/product-seriatim-1024.png` | Seriatim's own mark, not the house mark. 1024×1024 is assumed — no dashboard access to confirm the cap |
| Theme | **Vanilla** | The only neutral ground on offer. Kiwi, Lime and Blueberry impose green, mint and purple card backgrounds that collide with the voice palette |
| Button | `#17786e` | The light-ground accent. Not `#29b6a8`, for the reason directly above this section |
| Button text | `#ffffff` | **5.32:1** on that fill — clears AA |

Lemon Squeezy themes **five surfaces independently** — Store, Checkout, Overlay
checkout, Customer Portal and Emails — and offers one global button colour
across them. Because the accent is ground-dependent, that global control is a
trap: `#17786e` on a dark surface measures **3.62:1** and fails.
[`surfaces.py`](surfaces.py) holds each surface's ground and accent and refuses
a pairing below AA, via `python3 design/surfaces.py --verify`.

The storefront crops the logo to a **circle**, which is why the mark is measured
for circular containment (`measure_icon.py --circle`) rather than against the
macOS rounded rect: 0.0% escaped, furthest ink at 86% of the radius.

The header is **ground plus mark**, not a wide mark. The Rossler x–y projection
is bounded in a near-circular region however long you integrate — `t_end` adds
loops, not width — so the system contains no wide object to scale into a 16:3
letterbox, and fitting the orbit to a wide box would be a non-uniform scale,
which is a different curve rather than a parameter change. The empty two thirds
are the design. Its wordmark is **outlined**, per the typography section below,
so the header PNG embeds no font.

The lockup is centred and measured against the centre-crops a wide banner gets
(`header.py --measure`): intact down to **2.5:1**, and clipped at 2:1, where it
keeps 84.6%. If the storefront turns out to crop harder than 2.5:1 on narrow
viewports, the fix is a smaller lockup, not a rearranged one.

All four store assets bake their own ground. Everything in `public/` is built to
inherit one — `favicon.svg` emits `currentColor`, the raster icons are
transparent — and an inherited ground is an invisible mark on a light card we
do not control.

## Typography

| Role | Face | Licence |
|---|---|---|
| Display, wordmark | Literata | SIL OFL 1.1, no reserved name |
| Body, plugin UI | Source Sans 3 | SIL OFL 1.1, reserved name "Source" |
| Data, parameters | IBM Plex Mono | SIL OFL 1.1, reserved name "Plex" |

Source Sans 3 was chosen by **measurement**, against the hardest case — the
Ekphrasis control panel at 11 px. Across five real strings from
`ControlPanel.cpp` it runs 9.2% narrower than IBM Plex Sans and 15.6% narrower
than Inter. Inter being the widest is the reverse of its reputation.

Fonts are **self-hosted** via Astro's native fonts API, configured in
[`../astro.config.mjs`](../astro.config.mjs). That is not only a performance
choice: `/privacy` states this site sets no cookies and performs no cross-site
tracking, and hotlinking Google Fonts would send every visitor's IP to Google on
every page load.

All three licences permit bundling in distributed software, which matters for
the plugin binaries later. A **wordmark is outlined** when it ships, so no font
is embedded for it at all — the licence question applies only to live UI text.

## Six constants that exist because of bugs

Each was invisible to visual review and only appeared under measurement. Five
are marked `BUG-N` in `mark.py`; the sixth is pinned by `test_mark.Icon`. Do
not "simplify" them away.

1. **Normalise the logistic series by range, not amplitude.** It is strongly
   skewed — max `1.00`, min `-0.06`. Dividing by `max(|v|)` leaves the minimum
   near zero, nothing crosses the lift threshold, and *every dryness setting
   renders identically*.
2. **Sibling curves share one fit transform.** Fitting each to the box
   independently rescales away the divergence they exist to show.
3. **Split voices by arc length, not by time.** A spiral's outer quarter runs
   about eight times its inner one: 98 px of ink against 769. Arc length brings
   four voices to 460–500 px each, a balance of 0.92.
4. **The feather, not the loop count, is what breaks a mark at icon size.**
   At 16 px a voice's ink half and pigment half average into a midtone that is
   neither, so the shipping mark retains *zero* of its four voices. Shortening
   the orbit — the obvious fix, and the one `spec.md` proposed for two
   revisions — rescues one voice of four.
5. **Fit an icon's orbit to the ground rect, not to the canvas.** `fit_one`
   fits to the full 128 units; the ground covers the middle 103, and the stroke
   adds a half-width beyond the centreline on top of that. The first icon to
   pass the legibility metric had **42% of its ink outside the rounded rect** —
   three voices drawn on the desktop rather than on the icon — because a metric
   that counts coloured pixels cannot tell where they are. This is the one
   defect here that measurement missed and looking caught; `measure_icon.py`
   checks containment now.
6. **Each icon loop is one path.** The icon's colour loop sits over the ink
   loop at partial alpha; a loop drawn as chunks shows every seam through that
   alpha. `test_mark.Icon` counts paths.
