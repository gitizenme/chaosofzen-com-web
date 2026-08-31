# Chaos of Zen — design system

Everything visual about the studio and its products, and the code that produces
it. Nothing here ships to the browser; it generates what does.

| | |
|---|---|
| [`mark.py`](mark.py) | The generator. Produces every mark from the equations. |
| [`spec.md`](spec.md) | Why the system is the way it is, and what was rejected. |
| [`measure_icon.py`](measure_icon.py) | Measures whether a mark survives at 16 px, and whether it stays inside its own ground. Needs Inkscape and Pillow; run by hand. |
| [`header.py`](header.py) | The storefront header — the mark locked up with an outlined wordmark. Needs fontTools, uharfbuzz, Inkscape and Astro's downloaded Literata; run by hand. |

## The one rule

**The SVGs are output. Do not edit them.**

The marks are not drawings anyone traced — they are a Rössler attractor orbit
rendered as a sumi-e brushstroke. Change a parameter in `mark.py` and
regenerate. An SVG edited by hand is immediately unreproducible, and the next
regeneration silently reverts it.

```sh
python3 design/mark.py --verify    # do the committed assets match the generator?
python3 design/mark.py --write     # regenerate them
```

`--verify` exits non-zero on a mismatch, so it works in CI. It currently passes
byte-for-byte against `public/favicon.svg` — that is what makes this a source of
truth rather than a copy of one.

Standard library only. No dependencies.

## What it generates

| Asset | What it is |
|---|---|
| `public/favicon.svg` | The house mark, quantised to five flat colours and 4.7 KB, ink as `currentColor` so one file serves both themes |
| `public/marks/chaos-of-zen.svg` | The house mark at full fidelity — feathers through all four voices |
| `public/marks/ekphrasis.svg` | Stroke width is image brightness; barely lifts, because an image has no gaps |
| `public/marks/seriatim.svg` | Four voices divide one orbit, each in its own colour |
| `public/marks/seriatim-icon.svg` | The same four voices reduced for bundle icons — one loop, solid colours, on a dark rounded rect. The feather is dropped and the orbit is fitted to the ground: see BUG-4 and BUG-5 |
| `design/store/logo.svg` | The merchant avatar for the Lemon Squeezy storefront — the full house mark on an opaque full-bleed `#0e0e14`, ink baked rather than `currentColor` |
| `design/store/favicon.svg` | The storefront tab icon — `reduced_body()` with baked ink and the same opaque ground |
| `design/store/product-seriatim.svg` | Seriatim's storefront thumbnail, the four-voice mark on the opaque store ground. The one store asset that takes a product mark rather than the house mark. |

Every mark is the same orbit drawn by the same brush. What separates them is
**what drives the chaos** — so they are siblings by construction, not by styling.

## What it does *not* generate

Two asset groups are committed as binaries because reproducing them needs more
than Python:

- **Raster icons** (`favicon.ico`, `icon-*.png`, `apple-touch-icon.png`) —
  rasterised from the mark. Regenerating needs a renderer; the ICO is a
  hand-assembled container around 16/32/48 PNG payloads, valid since Vista.
- **The store rasters** (`design/store/logo-320.png`, `design/store/favicon-32.png`) —
  what actually gets uploaded, since the storefront takes PNG. Rasterised from
  the two SVGs above with Inkscape:

  ```sh
  cd design/store
  inkscape logo.svg    -w 320 -h 320 --export-filename=logo-320.png
  inkscape favicon.svg -w  32 -h  32 --export-filename=favicon-32.png
  inkscape product-seriatim.svg -w 1024 -h 1024 --export-filename=product-seriatim-1024.png
  ```

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
| Product thumbnail | `design/store/product-seriatim-1024.png` | Seriatim's own mark, not the house mark |
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

All three store assets bake their own ground. Everything in `public/` is built to
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

Each was invisible to visual review and only appeared under measurement. They
are marked `BUG-N` in `mark.py` and explained in `spec.md`. Do not "simplify"
them away.

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
6. **The reduced mark's colour quantisation is a legibility mechanism, not a
   compression one.** It was added to get `favicon.svg` from 33 KB to 4.7 KB
   and was documented as nothing else. At 32 px the same geometry *without* the
   snap retains 3 voices of 4 with amber at **zero** pixels; with it, 4 of 4.
   It is BUG-4's remedy applied to the one mark that cannot drop its feather,
   because feathering through all four voices is what the house mark *is*.
   Nothing rendering below ~64 px may take the unquantised ramp.
