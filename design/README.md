# Chaos of Zen — design system

Everything visual about the studio and its products, and the code that produces
it. Nothing here ships to the browser; it generates what does.

| | |
|---|---|
| [`mark.py`](mark.py) | The generator. Produces every mark from the equations. |
| [`spec.md`](spec.md) | Why the system is the way it is, and what was rejected. |

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

Every mark is the same orbit drawn by the same brush. What separates them is
**what drives the chaos** — so they are siblings by construction, not by styling.

## What it does *not* generate

Two asset groups are committed as binaries because reproducing them needs more
than Python:

- **Raster icons** (`favicon.ico`, `icon-*.png`, `apple-touch-icon.png`) —
  rasterised from the mark. Regenerating needs a renderer; the ICO is a
  hand-assembled container around 16/32/48 PNG payloads, valid since Vista.
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

## Three constants that exist because of bugs

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
