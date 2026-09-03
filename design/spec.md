# Chaos of Zen — Visual Identity Design

**Status:** Sections 4 (the mark) and 7.2–7.3 are superseded by
`docs/superpowers/specs/2026-09-02-chaos-of-zen-logo-redesign-design.md`.
Sections 5, 6 and 7.4 stand.
**Date:** 2026-08-30
**Scope:** The Chaos of Zen house mark, the Ekphrasis and Seriatim product
marks, the applied theme, and the Lemon Squeezy storefront (§7.4).

> This document is the *reasoning*. `design/mark.py` is the *implementation*,
> and it reproduces every committed asset byte-for-byte — run
> `python3 design/mark.py --verify`. Where the two disagree, the generator is
> right and this file needs updating.
>
> A copy also lives in the `ekphrasis` repository under
> `docs/superpowers/specs/`, where it was originally written. That copy and
> this one will drift; this is the one that sits beside the code.

---

## 1. Context

Chaos of Zen ships two macOS instruments — **Seriatim** (v1.5.0, on sale) and
**Ekphrasis** (v0.1.0, unreleased) — and runs a third project, *365 Strange
Attractors*, on a separate site. Before this work there was no identity: the
website's favicon was still the Astro starter logo, and nothing visually
connected the instruments to the studio that makes them.

The name is the brief. It states an intention to build original work from **Zen**
and **chaos theory** together, and those are not two moods to blend. They make
the same claim in different languages:

- A **strange attractor** is deterministic and never repeats.
- An **ensō** is one breath — never closed, never corrected.

Both describe order that refuses to resolve into repetition. That is also, and
not by coincidence, what Seriatim *is*: `lcm(576,5,7,11,13,17,19) = 931,170,240`
events before a voice's state recurs.

### 1.1 The constraint that shaped everything

The identity had to draw **three** marks — the house and two products — that are
recognisably siblings and never twins. Most candidate directions fail one half of
that. It is the test this document keeps returning to.

---

## 2. Goals and non-goals

### Goals

- A house mark for Chaos of Zen that says nothing about any single product.
- An Ekphrasis mark and a macOS `.icns`.
- A palette, type system and control geometry that apply to the website, both
  plugin editors, and release material.
- A grammar that generates Seriatim's mark without re-opening the system.
- Every mark **generated from a stated construction**, so it can be redrawn at any
  size or parameter without tracing.

### Non-goals

- Seriatim's mark and UI repaint are specified, not built. It ships on its own
  schedule.
- No rebrand of *365 Strange Attractors*, which lives on its own site.
- No motion system beyond the single draw-in used on the proposal page.
- No print or packaging application.

---

## 3. Decisions taken

| # | Decision | Rationale |
|---|---|---|
| 1 | The mark is a **Rössler attractor orbit**, x–y projection, drawn as a sumi-e brushstroke | Its projection is a spiral that folds and never closes. It *is* an ensō and *is* a strange attractor — one object, not a juxtaposition |
| 2 | Every mark is generated from equations at draw time, never traced | Redrawable at any size; the icon is a parameter change, not a second file to keep in sync |
| 3 | The palette is **taken out of the plugin source** | `ScoreView.cpp:7-8` is the only deliberately chosen colour set in either codebase |
| 4 | The accent is a **position on the trajectory**, never a line across it | A playhead is a position in time, and here the orbit *is* time |
| 5 | The ink→accent handover **feathers**, per-bristle | A clean colour boundary is the one place the mark reads as machine-made |
| 6 | Seriatim divides one orbit into **four voices with rests** | Its real claim is coprime non-realignment, not chaotic divergence |
| 7 | Icon sizes use a **shorter integration**, not a redrawing | One system, one parameter between logo and icon |

### 3.1 Directions considered and rejected

- **Bands crossed by a reading head.** Clearest about what Ekphrasis does. Rejected
  because it does not differentiate: Seriatim in the same grammar is four bands
  versus five, indistinguishable at 32 px.
- **A letterform `E`.** Best behaved at every size from one file. Rejected because
  an `E` is Ekphrasis's initial and nobody else's — the house becomes a set of
  initials sharing only a palette.
- **A logistic-map bifurcation diagram.** Rectilinear, scales well, and states the
  order/chaos thesis precisely. Rejected because it generates a house mark and
  then improvises for the products; at 16 px it reads as a plain arrowhead.
- **"Ma" — a perfect void with a chaotically eroded rim.** Best small-size
  behaviour of any candidate. Rejected because it reads as a sun or an eclipse
  before it reads as anything to do with music.
- **The warm paper/terracotta palette** inherited from `global.css`. Rejected on
  discovering it came from an Astro starter template rather than a decision —
  see §5.

---

## 4. The mark (superseded)

### 4.1 Construction

An orbit, then a brush over it. Both stages are deterministic; the same inputs
give the same mark every time.

**Stage 1 — the curve.** Rössler system, integrated with RK4:

```
dx/dt = −y − z
dy/dt =  x + a·y
dz/dt =  b + z·(x − c)

a = 0.2   b = 0.2   c = 5.7
x₀ = y₀ = z₀ = 1        dt = 0.006
```

The first 10% of samples are discarded as transient. The remainder is decimated
and fitted to a 128×128 box with a 13-unit margin. `t_end` selects how many
loops the mark shows:

| Use | `t_end` | decimation |
|---|---|---|
| Full mark | 19.0 | every 8th |
| Icon sizes | 13.2 | every 6th |
| Seriatim | 26.0 | every 5th |

**Stage 2 — the brush.** The stroke is **six parallel filaments** (three at icon
size), not one outline. Filament *k* sits at cross-stroke offset
`u = (k+0.5)/n − 0.5`, with half-width `(width/n) × 0.60` — deliberately under
the spacing, so a lifted filament leaves real white rather than being covered by
its neighbours.

Each filament carries its own chaotic driver: the **logistic map** at `r = 3.93`,
seeded `(seed₀ + 0.031k) mod 1`, low-passed over a 14-sample window.

> **Normalise the smoothed series by its range, not its amplitude.** The smoothed
> series is strongly skewed — max `1.00`, min `−0.06`. Dividing by `max(|v|)`
> leaves the minimum near zero, so nothing ever crosses the lift threshold and
> every "dry" setting renders identically to the wet one. This bug survived two
> rounds of visual review because the failure looked like a taste problem.

A filament lifts — laying no ink — where `1 + dry·s(i) < 0.62`. Because each
filament lifts independently, the flying white runs **along** the stroke. Cutting
the stroke *across* instead reads as a dashed line, not as a brush.

Measured lift, as a fraction of stroke length:

| `dry` | lifted | reads as |
|---|---|---|
| 0.0 | 0% | loaded brush |
| 0.5 | 1.3% | damp |
| **0.8** | **9.1%** | **dry — the default** |
| 1.1 | 15.9% | spent |

### 4.2 The accent

The accent colour is **the leading stretch of the stroke itself** — never a
radius, a bar, or any added geometry.

For a single-accent mark (Ekphrasis) the handover is centred at `t = 0.84` and
feathers over a width of `0.26` by default. The house mark instead distributes
four handovers along the stroke — at roughly `0.30`, `0.52`, `0.68` and `0.84` —
so it passes through teal, sage, amber and vermilion in the order the score lists
them.

Two things feather at once:

1. **Along the stroke** — colour interpolates on a smoothstep, so ink passes
   through a darkened intermediate rather than switching.
2. **Across the bristles** — each filament takes up new pigment at its own moment,
   offset by `feather × 0.45 × (((k·37) mod 7)/6 − 0.5)`.

The second is what makes the edge look wet. Without it the boundary is clean and
the mark reads as vector art.

Implementation note: colour varies per drawn polygon, so runs are chopped into
short chunks **only inside the transition zone** — long runs elsewhere keep the
path count down. The published favicon quantises this to five flat colours, which
takes it from 33 KB to 4.7 KB.

> **That quantisation is also a legibility mechanism, and was credited only as
> compression for two revisions of this document.** Measured at 32 px, the same
> geometry without the snap retains three voices of four with amber at **zero**
> pixels; with it, four of four. It is §4.5's finding — a voice's ink half and
> its pigment half averaging into a midtone that classifies as neither — met
> with the only remedy available to a mark that cannot drop its feather, since
> feathering through all four voices is what the house mark *is*. Nothing that
> renders below roughly 64 px may take the unquantised ramp.

### 4.3 The three marks

| Mark | Drives the chaos | Accent |
|---|---|---|
| **Chaos of Zen** | Breath: the stroke tapers in and out, lift at `r = 3.93` | Feathers through **all four** voice colours — the studio holds what the products divide |
| **Ekphrasis** | Stroke width is image brightness — the picture written along the orbit | Teal. Barely lifts (`dry = 0.28`): an image has no gaps |
| **Seriatim** | Four voices dividing one orbit | Each voice carries its own colour |

### 4.4 Seriatim — four voices

Four voices take contiguous arcs of one orbit with a **rest between each**, so no
two are ever in the same place. This is non-coincidence, not divergence.

Two measured constraints govern it, and both were arrived at by measurement after
visual judgement failed:

> **The rest is a fraction of each voice's own window, not of the whole cycle.**
> With four voices each window is 25% wide, so a "12% gap" applied to the whole
> cycle leaves each voice `0.25 − 0.24 = 1%` of the orbit and draws slivers. This
> defect made the approach look unusable and caused it to be rejected for two
> rounds.

> **Split the voices by arc length, not by time.** A spiral's outer quarter runs
> roughly eight times the length of its inner one, so equal time gives wildly
> unequal ink — measured at 98 px for one voice against 769 for another. Mapping
> equal cumulative arc length back to the curve parameter brings the four to
> 460–500 px each, a min/max balance of **0.92**.

Each voice also takes its **own** breath taper across its own window; a single
taper across the whole orbit leaves the first and last voices in the thin part of
the stroke, nearly invisible.

**Chaotic divergence was the wrong model and was abandoned.** At `t = 12.4` four
orbits from initial conditions 0.09 apart separate by 2.9% of the attractor's
extent — 2–6 px against a 4 px stroke, i.e. inside one another. `t = 25` reaches
7% and `t = 45` reaches 29%, but the latter collapses into a solid mass. More
fundamentally, Seriatim is built on coprime periods that never realign, not on
sensitive dependence.

### 4.5 Reduction for icon sizes

Icon renderings use `seriatim_icon()`: the same orbit, the same brush, the same
arc-length voice split and the same rests, with `t_end` 26.0 → 11.0, `bristles`
4 → 2, stroke width 2.6–8.0 → 14.0–22.0, `margin` 13 → 30, `gap` 0.12 → 0.14,
and **the ink→colour feather turned off** so each voice is solid in its own
colour. A `#0e0e14` rounded rect on the macOS icon grid sits behind it.

**The feather is what breaks the mark at icon size, not the loop count.** An
earlier version of this section proposed a two-loop orbit (`t_end = 13.2`),
three filaments and reduced lift against a heavier stroke, and expected that to
carry. It does not. Measured with `design/measure_icon.py` — render at 16 px,
classify every non-ground pixel to its nearest palette entry in RGB distance,
count it under a distance of 60, and report how many of the four voices retain
at least 3 px:

| Construction | Voices readable | Balance |
|---|---|---|
| The full mark, unmodified | 0 of 4 | 0.00 |
| Two-loop orbit, feather retained | 1 of 4 | 0.00 |
| Heavier stroke, feather retained | 4 of 4 | 0.25 |
| **Feather dropped, fitted to the ground** | **4 of 4** | **1.00** |

At 16 px a voice spans about ten pixels, so its ink half and its pigment half
average into a midtone that classifies as neither. The handover is what makes
the mark look wet at 512 px and is exactly what destroys it at 16. Keeping it
and adding weight brings all four voices back but at a 0.25 balance — sage at
24 px against amber at 6 — because how much of a voice survives then depends on
where its handover happened to fall.

**A second constraint, and the only defect in this system that measurement
missed and looking caught.** The first construction to satisfy the table above
scored 4 of 4 at a 0.91 balance while **42% of its ink lay outside the rounded
rect** — three of the four voices were drawn on the desktop rather than on the
icon. `fit_one` fits the orbit to the 128-unit canvas, but the ground covers
only the middle 103, and the stroke extends a further half-width beyond the
fitted centreline. The metric was satisfied by voices that had escaped, because
counting coloured pixels cannot tell you where they are.

Refitting to the ground cost nothing. `margin = 30` with a 14–22 stroke and a
0.14 gap measures **4 of 4 at a balance of 1.00, fully contained** — better than
the escaped version on the metric the escaped version was tuned for.
`measure_icon.py` now reports an escaped fraction and exits non-zero above a
rounding error, so this cannot recur silently.

1.00 sits above where the arc-length split landed at full size (0.92), which is
the argument that this is the same system reduced rather than a second drawing.
**§3's one-system property holds.**

This does not claim detail at 16 px. Four coloured arcs around a void read as a
mark at that size; the brush does not survive and is not meant to.

---

## 5. Palette

Every value is lifted from shipping source. The set that matters is
`seriatim/plugin/Source/ScoreView.cpp:7-8` — four voice colours that were chosen,
where nearly everything else in both codebases is a JUCE default
(`Colours::cyan`, `orange`, `white`) or an Astro starter token.

| Token | Value | Source |
|---|---|---|
| Voice 1 — vermilion | `#e4572e` | `ScoreView.cpp:7` |
| Voice 2 — teal | `#29b6a8` | `ScoreView.cpp:7` |
| Voice 3 — amber | `#f3a712` | `ScoreView.cpp:8` |
| Voice 4 — sage | `#a8c686` | `ScoreView.cpp:8` |
| Ground (score) | `#0e0e14` | `ScoreView.cpp:299` |
| Ground (editor) | `#121214` | ekphrasis `PluginEditor.cpp:22` |
| Panel | `#1a1a22` | `ControlPanel.h:76` |
| Panel (ekphrasis) | `#1c1c20` | ekphrasis `ControlPanel.cpp:159` |
| Ink on dark | `#eceaf2` | — |
| Ink on light | `#12121a` | — |

Four colours, four voices. Seriatim's mark had four arcs before this palette was
found, which is the argument for it: the marks and the interfaces stop being two
systems that need reconciling.

### 5.1 Accent contrast

**The accent is not one colour.** Teal `#29b6a8` reads 7.65:1 on `#0e0e14` and
**2.24:1** on light grounds — failing AA for text, and the accent is used for
body-size links. Light grounds take a darkened teal `#17786e` at 4.73:1.

`#1d8d82` was tried and is **not sufficient** at 3.60:1.

Ekphrasis takes teal rather than the true cyan `Colours::cyan` its playhead
currently draws: cyan is unusable on light grounds. Sage is the one voice colour
that does not carry onto `#f2f1f5`, which constrains its use in documentation.

---

## 6. Typography

| Role | Face | Weights | Licence |
|---|---|---|---|
| Display, wordmark | **Literata** | 300, 400 | OFL 1.1, 2017 The Literata Project Authors |
| Body, plugin UI | **Source Sans 3** | 400, 600 + italic | OFL 1.1, Adobe, reserved name "Source" |
| Data, labels, parameters | **IBM Plex Mono** | 400 | OFL 1.1, IBM Corp., reserved name "Plex" |

The mono is not decoration: this identity has real constants in it (`r = 3.93`,
lift percentages, contrast ratios) and they should be set in a face that admits
it.

**Source Sans 3 was chosen by measurement, not preference.** The binding
constraint is the Ekphrasis control panel: six columns of knobs with two-word
labels and live numeric readouts at 11 px. Measured across five real strings
from `ControlPanel.cpp`:

| Face | Total width @ 11 px | vs Source Sans 3 |
|---|---|---|
| **Source Sans 3** | 382.8 px | — |
| IBM Plex Sans | 418.1 px | +9.2% |
| Inter | 442.6 px | +15.6% |

Inter is the widest of the three, which is the reverse of its reputation: the
large x-height that makes it legible comes with generous advance widths at the
same nominal size. All three fit today; only Source Sans 3 leaves headroom if a
label grows. It is therefore the body face everywhere, not only in the panel --
running one sans on the web and another in the plugin would be a split with no
reason behind it.

Literata replaces Newsreader for display. Newsreader arrived as a default rather
than a decision and is a newspaper face; Literata is sturdier and holds up small,
which matters because the display face also sets product names in the About
panel.

**Fonts must be self-hosted, not hotlinked.** `chaosofzen.com/privacy` states the
site "sets no cookies and performs no cross-site tracking — there is nothing here
for a consent banner to disclose." Requesting Google Fonts at page load would
send every visitor's IP to Google, which that sentence does not cover. Astro's
native fonts API downloads them at build time; the built output contains zero
external font references.

For the plugins this is also a **licensing** question, and it is now settled.
Embedding a face in a distributed binary is a different grant from serving it on
a website, so each was checked against its licence text rather than assumed:

- **Literata** -- OFL 1.1, no reserved name.
- **Source Sans 3** -- OFL 1.1, reserved name "Source".
- **IBM Plex Mono** -- OFL 1.1, reserved name "Plex".

All three state the software "may be bundled, redistributed and/or sold with any
software." The conditions are that the copyright notice and licence text ship
with the binary, that the fonts are not sold standalone, and that a *modified*
face does not reuse a reserved name. Shipping unmodified faces alongside a
licence file satisfies all three.

Note that a **wordmark is outlined** when it ships, so no font is embedded for it
at all; the licence question applies only to live UI text.

---

## 7. Application

### 7.1 Website — shipped

`chaosofzen-com-web#2`. Palette tokens keep their semantic names (`canvas`,
`ink`, `accent`), so it is a values-only change. The Astro starter favicon is
replaced by the mark; typography styles elements directly, because the pages are
plain `h1`/`h2`/`p` and `prose` was never applied, so headings had been rendering
at body size. A 1200×630 social card is generated from the same code that draws
the mark, resolving an `og:image` that had 404'd since the layout was written.

### 7.2 Ekphrasis plugin — not built

The largest remaining item, and the natural unit for a single implementation
plan. Seriatim's repaint (§7.3) is a separate plan in a separate repository and
should not be folded into it.

- A `juce::LookAndFeel_V4` subclass over the editor: rotaries, combo boxes,
  panels, status row.
- Ground `#121214`, panel `#1c1c20`, ink `#eceaf2`.
- **The playhead in `ImageView` becomes teal**, replacing `Colours::cyan`. The
  displayed image is rendered greyscale (`ImageView.cpp:51` sets `r=g=b`), so a
  saturated overlay can never collide with picture content.
- Status colours (`orange` / `lightgreen` gate) map onto amber and sage.
- The mark in `AboutPanel`, and an `.icns` for the standalone bundle.

### 7.3 Seriatim — specified, not built

Same treatment, plus its mark. Ground `#0e0e14`, panel `#1a1a22`. `ScoreView`
already uses the voice palette and needs no colour change.

### 7.4 Storefront — shipped

`store.chaosofzen.com` is a Lemon Squeezy storefront. Its appearance is six
settings in someone else's admin panel, so the design question is not what to
draw but **what survives leaving our control**.

Two things change relative to everything in `public/`:

1. **The ground is baked in.** `favicon.svg` emits its ink as `currentColor` and
   the raster icons are transparent with `#eceaf2` ink; both are built to
   inherit a ground the page supplies. The storefront's card is a light one we
   do not theme, so an inherited ground is an invisible mark. The store assets
   carry `#0e0e14` themselves.
2. **Containment is a question about a circle.** The storefront crops the logo
   round, not to §4.5's macOS rounded rect. Same defect class, different shape,
   so it gets the same measurement rather than an assumption:
   `measure_icon.py --circle` reports **0.0% escaped**, furthest ink at 86% of
   the radius. `measure_icon.py` now reads the ground rect off the asset instead
   of assuming the macOS grid — measuring a full-bleed ground against that
   constant reported a 3.1% escape for ink sitting comfortably on its own
   ground, which is BUG-5's failure mode running backwards.

The avatar is the **house mark**, not a product's: it identifies the merchant
on the store page, at checkout and on every receipt, and the store sells
Seriatim now and Ekphrasis later. §4.3 — the studio holds what the products
divide. The product thumbnail is the deliberate exception, below: it takes
Seriatim's own mark, because a thumbnail identifies the thing being bought,
not the merchant selling it.

| Setting | Value | |
|---|---|---|
| Header | `design/store/header-1600.png` | 1600×300, the mark locked up with an outlined Literata 300 wordmark |
| Logo | `design/store/logo-320.png` | Full-fidelity house mark. 2× the recommended 160 for retina; ~50 KB against a 1 MB cap |
| Favicon | `design/store/favicon-32.png` | The two-loop icon construction (`house_icon`), ink baked. See `docs/superpowers/specs/2026-09-02-chaos-of-zen-logo-redesign-design.md` |
| Product thumbnail | `design/store/product-seriatim-1024.png` | Seriatim's own mark, not the house mark — the exception above. 1024×1024 is assumed, not read from the dashboard |
| Theme | **Vanilla** | The only neutral ground offered. Kiwi, Lime and Blueberry impose green, mint and purple card grounds that collide with the voice palette |
| Button | `#17786e` | The light-ground accent of §5.1 |
| Button text | `#ffffff` | **5.32:1** on that fill — clears AA |

**The storefront themes five surfaces, not one.** Design settings expose
Store, Checkout, Overlay checkout, Customer Portal and Emails separately, each
able to override the theme's colours, while the button colour is offered once
globally. Since §5.1 makes the accent ground-dependent, that single control
spans surfaces that may not share a ground — and the wrong half of the pair is
a measured failure, not a near miss: `#17786e` on `#0e0e14` is 3.62:1 and
`#ffffff` on `#29b6a8` is 2.51:1.

All five are therefore set light, matching the Vanilla theme and the
website's default — the value to enter, not a read of the dashboard, which is
the live authority and which this file cannot observe. `design/surfaces.py`
records that decision and recomputes every ratio on `--verify`, carrying the
rejected pairings alongside the accepted ones so a regression in the contrast
maths cannot pass silently.

**The header is ground plus mark, because the system contains no wide object.**
The Rössler x–y projection is bounded in a near-circular region however long it
is integrated — `t_end` adds loops, not width. Fitting the orbit to a 16:3 box
would be a non-uniform scale, which is a different curve rather than a
parameter change, and §3's one-system property would not survive it. So the
header is the mark at 196 px locked up with the wordmark, centred, on the same
`#0e0e14`; the empty two thirds are the design and not a gap to fill.

The wordmark is **outlined** per §6, so the header embeds no font and raises no
licensing question. It is Literata instanced at **weight 300** — what
`global.css` sets `h1`/`h2`/`h3` to — and HarfBuzz-shaped, so it carries the
face's real kerning rather than naive advance widths.

Crop survival is measured, not assumed, on the same reasoning as §4.5's
containment check: ink that a crop removes is ink the viewer cannot see. The
centred lockup spans 43% of the width and is intact down to a **2.5:1** centre
crop; at 2:1 it keeps 84.6% and is clipped. Whether the storefront ever crops
that hard is unknown, so the number is recorded rather than designed around.

`#29b6a8` with `#12121a` text also clears AA, at 7.41:1, and is wrong anyway:
it is the *dark*-ground accent and the Vanilla card is light. The platform's own
default button purple is declined on §3.1's grounds — it is a starter default,
which is the same objection that removed the warm paper palette.

---

## 8. Verification

What was checked, and how:

- **Contrast** computed from relative luminance for every accent/ground pair, not
  eyeballed. The `#1d8d82` failure was found this way before shipping.
- **Voice ink balance** measured by counting near-match pixels per voice colour on
  the rendered canvas: 0.92 min/max after the arc-length split, 0.13 before.
- **Lift fraction** computed directly from the driver series rather than inferred
  from appearance — this is what exposed the range-normalisation bug.
- **Web application** gated on `pnpm astro check`, vitest, and Playwright
  including an axe WCAG 2 AA sweep across all 8 pages in both themes. Green in CI.
- **Font loading** asserted with `document.fonts.check()` before rendering the
  social card. An earlier attempt silently produced system Times because the CSS
  variables resolved to empty and the status line reported the fallback strings
  back as if they were loaded faces.

The recurring lesson: **every defect in this work was found by measurement and
missed by looking.** Three of them survived rounds of visual review while
appearing to be matters of taste.

---

## 9. Open questions for implementation

1. ~~**Wordmark typeface.**~~ **Resolved 2026-08-30.** Literata for display and
   wordmark, Source Sans 3 for body and plugin UI, IBM Plex Mono for data. All
   three are OFL 1.1 and verified embeddable -- see §6. One sub-question remains:
   whether the mono becomes Source Code Pro for family coherence, or stays Plex
   Mono, which already ships.
2. ~~**16 px.**~~ **Resolved 2026-08-31.** The reduced orbit was the wrong
   parameter; the feather was the right one, and fitting to the ground rect
   rather than to the canvas was a second one nobody had asked about. See §4.5.
   No dedicated icon-only construction was needed and §3's one-system property
   is intact. **Partly resolved further 2026-08-31** by §7.4, which had to pick
   a construction at two sizes and measured both: the full mark scores 4 of 4
   at 320 px and **2 of 4 at 32 px**, where the reduced-and-quantised body
   scores 4 of 4. So the crossover is somewhere between, and the two endpoints
   are now measured rather than asserted. 64 px and 128 px — the sizes the
   claim actually rests on — remain unmeasured.
3. **Sequencing against the host smoke test.** `docs/superpowers/checklists/host-smoke-test.md`
   is an unpassed release gate, and the README records that a sibling project
   shipped the same class of unit-display bug three times because only a real host
   revealed it. Restyling the editor puts new code directly in front of that gate;
   decide whether the smoke test runs before or after the repaint.
4. **Feather placement.** `t = 0.84` at width `0.26` are defaults chosen on a
   slider, not derived. Worth fixing deliberately before they harden.
5. **Seriatim's repaint** has no schedule. It is the senior product and will wear
   the identity longest.
