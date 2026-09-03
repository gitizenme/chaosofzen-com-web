# Chaos of Zen — Logo Redesign

**Status:** Design agreed, not built.
**Date:** 2026-09-02
**Supersedes:** the house mark, icon and product mark constructions in `design/spec.md` §4. Palette (§5), typography (§6) and the storefront settings (§7.4) are unchanged except where this document says so.
**Source of intent:** Joe's original illustration, `Chaos of Zen - Logo.svg` (iCloud, 1024×1024, an image-traced painting): a yin-yang whose left half is a spectral swirl through the whole hue circle and whose right half is ink, on a warm sage-grey ground, over a field of vertical strings, with ink-wash edges.

> This document is the reasoning and the parameters. `design/mark.py` remains the implementation and the source of truth; `python3 design/mark.py --verify` must reproduce every committed asset byte for byte after this work, as it does today.

---

## 1. Decisions taken

| # | Decision | Rationale |
|---|---|---|
| 1 | The form is a **yin-yang**: two interlocked halves, one colour and one ink | The original's thesis, kept literally |
| 2 | Every mark is **generated** in `mark.py`, never traced | Regenerable at any size; the icon is a parameter change; `--verify` keeps covering it |
| 3 | The two halves are **two Rössler orbits mirrored through the centre** | Keeps the attractor as the drawing tool the studio already owns; each spiral centre is an eye, so no dots are drawn |
| 4 | The coloured half carries the **full spectrum**, in oklch at constant lightness | The original's hue circle; constant lightness so no hue shouts |
| 5 | The mark is **layered**: ink orbit underneath at full strength, spectral orbit on top at partial alpha | Chosen after comparing the opposite layering; overlaps read as colour darkened by ink |
| 6 | Grounds stay **cool** (`#f2f1f5` light, `#0e0e14` dark) | The warm sage ground was considered and declined; the spectrum is pigment only, so the accent-contrast rule of `spec.md` §5.1 is untouched |
| 7 | The icon is **not a taijitu**: two outer loops, colour outside over ink inside | Chosen over a solid taijitu (too literal) and over interlocking loops, from rendered comparisons at 96, 32 and 16 |
| 8 | Scope covers the house mark and icon, both product marks, a strings-and-cloud field, and the wordmark lockup | Requested in full |

### 1.1 Constructions considered and rejected

- **Streamline paint.** Filaments seeded on each half's boundary, circling that half's eye and drifting inward, bounded to the exact taijitu half. Closest to the painted original at 256 px. Rejected in favour of the two-orbit construction, which the studio already draws with.
- **Vortex taijitu.** Exact taijitu geometry under a radial swirl deformation, rings of brush following the deformed halves. Most legible at 16 px; rejected as reading like a taijitu with a filter applied.
- **Solid taijitu at icon size.** Rejected as too literal.
- **Interlocking loops at icon size** (two variants, with and without extra overlap). Rejected in favour of the nested form.

---

## 2. The house mark

### 2.1 Orbit

Unchanged from `mark.py`: Rössler system, RK4, `a = b = 0.2`, `c = 5.7`, `x₀ = y₀ = z₀ = 1`, `dt = 0.006`, `t_end = 19.0`, first 10 % of samples discarded, decimated every 8th, fitted to the 128-unit box with a 13-unit margin (`fit_one(rossler(), margin=13)`).

### 2.2 Placement

Two copies of that fitted orbit, `A` (colour) and `B` (ink):

| Parameter | Value |
|---|---|
| scale about (64, 64) | 0.60 |
| offset of A's centre from (64, 64) | (−11, −8) |
| offset of B's centre | (+11, +8) |
| rotation of B | π (point mirror through the centre) |

These three numbers were chosen on a sheet and are the ones to fix by measurement before they harden (see §7). The criteria: the union's bounding box within 3 % of square, and ink balance between A and B (near-match pixel count at 512 px) within 0.9–1.1.

### 2.3 Brush

`brush()` as it exists, with:

| Parameter | Value |
|---|---|
| width | `BREATH`-shaped: `1.8 + 6.0·sin(min(t·1.06, 1)^0.8 · π)` |
| bristles | 8 |
| dry | 0.45 |
| wobble | 0.5 |
| seed | 0.31 for A, 0.58 for B |
| chunk | 8 |

### 2.4 Colour

Orbit A's `stops` are 24 samples along arc length of

```
spectrum(u) = oklch(L = 0.70, C = 0.15, H = (20 + 360·u) mod 360)      u ∈ [0, 1]
```

converted to sRGB hex at generation time (gamut-clipped per channel). `L` and `C` are the means of the four voice colours' oklch values, so the sweep sits at the voices' own lightness. Orbit B is `ink` (`#eceaf2` on dark, `#12121a` on light).

### 2.5 Layering

```svg
<g>{brush(B, ink)}</g>
<g opacity="0.76">{brush(A, spectrum)}</g>
```

Group opacity, not per-path opacity: a stroke is many chunks, and per-path alpha would show every chunk seam.

### 2.6 What is not drawn

No disc, no dots, no seam. The eyes are the spiral centres. The disc is implied by the two orbits' outer loops.

---

## 3. The icon

Used for the favicon at 16, 32 and 48, the nav mark at 22, the store favicon at 32, and the macOS icon grid at 128 and above.

### 3.1 Construction

| Parameter | Value |
|---|---|
| orbit | `rossler(t_end=11.0, step=6)`, fitted with margin 13 — the outer loop only |
| scale | 0.78 |
| offsets | A (colour) at (+4, +3), B (ink) at (−4, −3); A is the rotated copy (π) |
| width | `7.0 + 5.0·sin(t^0.6 · π)` |
| bristles | 1 |
| dry, wobble | 0 |
| colour | three flat bands by arc-length thirds: `spectrum(0.125·0.75)`, `spectrum(0.375·0.75)`, `spectrum(0.625·0.75)` — the sweep stops short of violet at icon size |
| layering | ink loop underneath at full strength, colour loop on top at `opacity="0.76"` |
| feather | none (`spec.md` §4.5, BUG-4: the feather is what breaks a mark at 16 px) |

Each loop must be emitted as **one path** (a single ring polygon), not chunks, so no seams show through the alpha.

### 3.2 Ground

On the macOS grid the icon sits on the existing `ICON_GROUND` rounded rect (`#0e0e14`, `rx = 23.2`). The favicon is transparent with the ink as `currentColor`, self-themed by an internal style as today.

### 3.3 Measurement

`design/measure_icon.py` at 16 and 32 px: escaped fraction must be 0.0 %, and all three colour bands plus the ink loop must survive classification at 16 px. Record the numbers in this document when measured.

---

## 4. Product marks

Same two-orbit skeleton as §2, so the three marks are siblings; only the colouring rule of orbit A changes. Orbit B (ink) and the layering are identical.

| Mark | Orbit A rule |
|---|---|
| Chaos of Zen | full spectrum (§2.4) |
| Seriatim | four voice bands with rests, by arc length, in the plugin's own voices `#e4572e #29b6a8 #f3a712 #a8c686` in score order — the existing `seriatim_mark()` rule (rest = 12 % of each voice's own window, each voice its own breath taper) |
| Ekphrasis | ink with a single teal handover, `single_stops(ink, TEAL, at=0.84, feather=0.26)` — the existing `ekphrasis_mark()` rule, so the mark is one voice reading one image |

Icons follow §3 with the same rule applied to the colour loop: Seriatim four flat bands, Ekphrasis ink with one teal band.

The feather placement `at = 0.84, feather = 0.26` remains the open item `spec.md` §9.4 records.

---

## 5. Strings and cloud field

A separate layer, generated by `mark.py`, never part of an icon or a mark file. Used behind the mark on the site landing hero, the store header and the social card.

### 5.1 Strings

Vertical lines across the field. String positions come from the coprime periods Seriatim uses, on a unit grid `g = 4 px`:

```
positions = sorted({ g · (i · p) mod W  for p in (5, 7, 11, 13)  for i in 0 .. W / (g · p) })
```

in `ink-muted` at 6 % alpha, 1 px wide. Because 5, 7, 11 and 13 are coprime the pattern of gaps does not repeat inside the field — the same argument Seriatim makes about its periods. Four strings, at the x-centroids of the four arc-length quarters of orbit A, are drawn in the four voice colours at 100 %.

### 5.2 Cloud

The two orbits of §2 rendered again, scaled 1.35 about the mark's centre, with `bristles = 8`, `dry = 0.9`, `wobble = 0.8`, ink only, inside a group at 12 % alpha. The result is the mark's own stroke continued past its edge as dry brush.

### 5.3 Reduced motion and dark mode

The field is static SVG. On the site it is decorative (`aria-hidden`), honours `prefers-color-scheme` through `currentColor`, and is omitted below 640 px viewport width.

---

## 6. Wordmark lockup

- **Face:** Literata weight 300, shaped by HarfBuzz and **outlined** by the existing `design/header.py`, so no font is embedded.
- **Horizontal lockup** (site header, installer, DMG): mark height = 2.2 × the wordmark's cap height; gap between mark and wordmark = 0.5 × mark height; baseline of the wordmark at the mark's vertical centre + 0.35 × cap height.
- **Stacked lockup** (store header, 1600×300): mark centred above the wordmark, gap 0.4 × mark height, the whole lockup centred on `#0e0e14`; the empty sides are the design, per `spec.md` §7.4.
- **Site nav** keeps the 22 px icon (§3) plus the wordmark in Source Sans 3 600 as today; the Literata lockup is for the hero, the store and installers.

---

## 7. Assets, verification and rollout

### 7.1 `design/mark.py`

New or replaced functions:

- `spectrum(u)` and the oklch conversion.
- `house_mark_svg()`: §2. Replaces the brush-and-feather orbit.
- `house_icon()` and `favicon_svg()`: §3.
- `seriatim_mark_svg()`, `ekphrasis_mark_svg()`, `seriatim_icon_svg()`, and a new `ekphrasis_icon_svg()`: §4.
- `strings_field_svg(w, h)` and `cloud_svg()`: §5.
- `lockup_svg(orientation)`: §6, using `header.py`'s outlining.
- `store_*` assets regenerated from the above.

`ASSETS` gains the new files; `--verify` stays byte-for-byte. `measure_icon.py` gains a check that all three colour bands survive at 16 px (§3.3).

### 7.2 Regenerated files

`public/favicon.svg`, `public/favicon.ico`, `public/icon-{16,32,48,512}.png`, `public/apple-touch-icon.png`, `public/marks/*.svg` (plus `ekphrasis-icon.svg`), `public/og/default.png`, `design/store/*`. The retired Rössler brush marks are not kept as files; git history holds them.

### 7.3 Downstream

- `seriatim/resources/brand/` re-vendors `seriatim-mark.svg` and `icon-*.png` with the new SHA-256 provenance, per its README.
- `ekphrasis/plugin/resources/` takes `ekphrasis-mark.svg` and `icon-1024.png`; the shell heredoc in its README is replaced by `mark.py` output, closing the verify gap noted in the review.
- The storefront gets the four regenerated `design/store/*` files; the six settings in `spec.md` §7.4 are unchanged.

### 7.4 Parameters to fix by measurement before they harden

1. §2.2 offset, scale and mirror angle (bounding-box squareness and ink balance).
2. §3.1 icon offsets and widths (escape 0 %, colour survival at 16 px).
3. §2.5 and §3.1 alpha 0.76: measure the overlap colour on both grounds against 3:1 from the ground so the crossing reads at 32 px.
4. §4 Ekphrasis feather placement (`spec.md` §9.4, still open).

### 7.5 Verification

```bash
python3 design/mark.py --write && python3 design/mark.py --verify
python3 design/measure_icon.py public/favicon.svg
python3 design/surfaces.py --verify
pnpm build && pnpm exec playwright test
```

Then open `/`, `/seriatim` and the store header on both grounds and look: a screenshot pass is not a human pass.

---

## 8. Out of scope

- *365 Strange Attractors* keeps its own identity.
- The site and plugin theming work in the design-system review plan (buttons, tokens, plugin type) is unchanged by this document and does not depend on it.
- Motion: the live orbit on the review canvas is a study, not a deliverable of this spec.
