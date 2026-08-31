# Storefront Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put every Lemon Squeezy storefront surface's colour decision under version control with a verifier that refuses a pairing failing WCAG AA, and generate the product thumbnail the storefront needs.

**Architecture:** Lemon Squeezy's Design settings expose five independently themeable surfaces (Store, Checkout, Overlay checkout, Customer Portal, Emails) while offering one global button colour across them. Those settings live in a web dashboard and cannot be committed, so this repo holds the *decision* instead: a declarative table of surfaces with their grounds and accents, and a `--verify` that recomputes every contrast ratio from relative luminance and exits non-zero on a failure. Dashboard entry stays manual, but it becomes transcription from a verified table rather than judgement in a colour picker. The product thumbnail extends `mark.py` the way the store logo did — a new asset function, not a new drawing.

**Tech Stack:** Python 3 standard library (`design/*.py`), Inkscape + Pillow for rasterisation and measurement, Astro / Playwright / vitest for the site.

**Spec:** `design/spec.md` — §5.1 (accent contrast), §7.4 (storefront), §4.5 (what survives at small size). `design/README.md` records the same decisions in short form.

## Global Constraints

- **`design/mark.py` is standard library only.** No third-party imports, ever. Tools that need dependencies (`measure_icon.py`, `header.py`) live beside it and are run by hand.
- **The SVGs are output. Do not edit them.** Change a parameter and regenerate. `python3 design/mark.py --verify` must exit 0 before any commit.
- **Every colour value is lifted from shipping plugin source**, not invented. The four voices are `#e4572e` `#29b6a8` `#f3a712` `#a8c686`.
- **The accent is ground-dependent.** `#17786e` on light grounds, `#29b6a8` on dark. Never the reverse: `#17786e` on `#0e0e14` measures 3.62:1 and fails.
- **AA threshold is 4.5:1** for body-size text, which is what these accents are used for.
- **Measure, do not look.** Every defect in this system was found by measurement and missed by visual review. New constructions get a measured number recorded in the commit message.
- CI ignores `design/**`, so `design/` changes are verified locally.

---

## File Structure

| File | Responsibility |
|---|---|
| `design/surfaces.py` | **Create.** The five storefront surfaces, their grounds and accents, and a `--verify` that recomputes every contrast ratio and rejects AA failures. Standard library only. |
| `design/mark.py` | **Modify.** Add `store_product_svg()` and one `ASSETS` entry. |
| `design/store/product-seriatim.svg` | **Create (generated).** Seriatim's four-voice mark on the opaque store ground. |
| `design/store/product-seriatim-1024.png` | **Create (generated).** The uploaded raster. |
| `design/README.md` | **Modify.** Storefront section gains the surface table and the thumbnail row. |
| `design/spec.md` | **Modify.** §7.4 gains the per-surface reasoning. |
| `src/pages/privacy.astro` | **Modify, conditional.** Only if the store's email opt-in is enabled — see Task 4. |

---

## Task 1: The storefront surface record and its verifier

Encodes §5.1's rule so a dark surface cannot be given the light accent. The verifier is the test: it carries pairings that MUST pass and pairings that MUST be rejected, so it fails loudly if the contrast maths itself regresses.

**Files:**
- Create: `design/surfaces.py`
- Modify: `design/README.md`, `design/spec.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `luminance(hex: str) -> float`, `ratio(a: str, b: str) -> float`, `SURFACES: list[Surface]`, `verify() -> int` (0 pass, 1 fail). `Surface` is a `NamedTuple(name: str, ground: str, accent: str, button: str, button_text: str)`.

- [ ] **Step 1: Write the failing verifier invocation**

Create `design/surfaces.py` containing only the self-check data and the entry point, with no implementation, so running it fails:

```python
#!/usr/bin/env python3
"""The five Lemon Squeezy storefront surfaces, and proof each one clears AA."""
import sys

# (foreground, background, expected_ratio, must_pass)
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

if __name__ == "__main__":
    sys.exit(verify())
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 design/surfaces.py`
Expected: FAIL with `NameError: name 'verify' is not defined`

- [ ] **Step 3: Write the implementation**

Replace the whole file with:

> **Corrected during execution.** The listing below has `ap.parse_args()` /
> `return verify()`, which makes a bare invocation and `--verify` behaviourally
> identical — both would exit 1 on failure, contradicting this module's own
> docstring. This plan is a record of what was planned, so the listing is left
> as written; `main()` was corrected in commit `1943b04` to branch on
> `args.verify`, returning 0 on a bare invocation and only propagating the
> failure status when `--verify` is passed.

```python
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
    ap.parse_args()
    return verify()


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run it to verify it passes**

Run: `python3 design/surfaces.py --verify; echo "exit=$?"`
Expected: `exit=0`, no `DRIFT` or `WRONG` lines, all five surfaces printed with no `<- FAILS AA` flag.

- [ ] **Step 5: Prove the check can actually fail**

Temporarily change the `Customer Portal` row's ground to `GROUND_DARK`, leaving its accent as `ACCENT_ON_LIGHT`.

Run: `python3 design/surfaces.py --verify; echo "exit=$?"`
Expected: `exit=1`, Customer Portal flagged `<- FAILS AA` at 3.62.

Revert the change and confirm `exit=0` again. Do not commit the broken state.

- [ ] **Step 6: Document it**

In `design/README.md`, inside `### The storefront`, after the settings table, add:

> Lemon Squeezy themes **five surfaces independently** — Store, Checkout, Overlay checkout, Customer Portal and Emails — and offers one global button colour across them. Because the accent is ground-dependent, that global control is a trap: `#17786e` on a dark surface measures **3.62:1** and fails. [`surfaces.py`](surfaces.py) holds each surface's ground and accent and refuses a pairing below AA, via `python3 design/surfaces.py --verify`.

In `design/spec.md` §7.4, after the settings table, add:

> **The storefront themes five surfaces, not one.** Design settings expose Store, Checkout, Overlay checkout, Customer Portal and Emails separately, each able to override the theme's colours, while the button colour is offered once globally. Since §5.1 makes the accent ground-dependent, that single control spans surfaces that may not share a ground — and the wrong half of the pair is a measured failure, not a near miss: `#17786e` on `#0e0e14` is 3.62:1 and `#ffffff` on `#29b6a8` is 2.51:1.
>
> All five are therefore set light, matching the Vanilla theme and the website's default. `design/surfaces.py` records that and recomputes every ratio on `--verify`, carrying the rejected pairings alongside the accepted ones so a regression in the contrast maths cannot pass silently.

- [ ] **Step 7: Commit**

```bash
git add design/surfaces.py design/README.md design/spec.md
git commit -m "feat(design): put the storefront's five surfaces under a contrast check"
```

---

## Task 2: Seriatim product thumbnail

The storefront shows product media on cards and at checkout. This is the one place a **product** mark is correct rather than the house mark.

**Files:**
- Modify: `design/mark.py`
- Create: `design/store/product-seriatim.svg` (generated)
- Create: `design/store/product-seriatim-1024.png` (generated)
- Modify: `design/README.md`

**Interfaces:**
- Consumes: `STORE_GROUND`, `seriatim_mark()`, `_svg()` — all already present in `design/mark.py` on this branch.
- Produces: `store_product_svg() -> str`, and the `ASSETS` key `"design/store/product-seriatim.svg"`.

- [ ] **Step 1: Add the generator**

In `design/mark.py`, immediately after `store_favicon_svg()`, add:

```python
def store_product_svg() -> str:
    """Seriatim's product thumbnail for the storefront.

    seriatim_mark() unmodified on the store ground. It is grounded for the same
    reason the logo is: section 5.1 records sage (#a8c686) as the one voice
    colour that does not carry onto light, so a transparent thumbnail loses a
    voice on the storefront's light card -- the exact failure the grounded
    constructions exist to prevent.

    This is the one store asset that takes a PRODUCT mark rather than the house
    mark. The avatar identifies the merchant; a thumbnail identifies the thing
    being bought.
    """
    return _svg(STORE_GROUND + seriatim_mark(), "Seriatim")
```

- [ ] **Step 2: Register it**

In `design/mark.py`, add one line to the `ASSETS` dict so it ends:

```python
    "design/store/favicon.svg": store_favicon_svg,
    "design/store/product-seriatim.svg": store_product_svg,
}
```

- [ ] **Step 3: Run verify to watch it fail on the missing file**

Run: `python3 design/mark.py --verify; echo "exit=$?"`
Expected: `exit=1`, with `MISMATCH design/store/product-seriatim.svg  committed=missing generated=<N>`, and every other asset reported `match`.

- [ ] **Step 4: Generate, and confirm nothing else moved**

Run: `python3 design/mark.py --write`
Expected: `wrote design/store/product-seriatim.svg`, and byte counts for the seven pre-existing assets identical to before (4771, 56729, 73287, 76490, 15822, 56788, 4377).

Run: `python3 design/mark.py --verify; echo "exit=$?"`
Expected: `exit=0`, all eight `match`.

- [ ] **Step 5: Measure before rasterising**

Run: `python3 design/measure_icon.py --size 512 design/store/product-seriatim.svg`
Expected: `4/4` voices and `0.0%` escaped. Record the balance figure — it goes in the commit message.

If it reports fewer than 4 voices, or any escape above 0.1%, STOP and report the numbers. Do not adjust parameters until the metric goes green; §4.5 records where that leads.

- [ ] **Step 6: Confirm the upload size, then rasterise**

Read the size Lemon Squeezy states for product media, at Design » Store. **Do not guess it.** 1024 below is a safe square default that scales down cleanly; if the dashboard states otherwise, use that and say so in the commit message.

```bash
cd design/store
inkscape product-seriatim.svg -w 1024 -h 1024 --export-filename=product-seriatim-1024.png
```

- [ ] **Step 7: Verify the raster**

```bash
python3 -c "
from PIL import Image
im = Image.open('design/store/product-seriatim-1024.png').convert('RGBA')
alphas = {p[3] for p in im.get_flattened_data()}
print('size', im.size, 'opaque', alphas == {255}, 'corner', im.getpixel((0,0))[:3])
"
```
Expected: `size (1024, 1024) opaque True corner (14, 14, 20)`

- [ ] **Step 8: Document it**

In `design/README.md`, add to "What it generates":

> `design/store/product-seriatim.svg` — Seriatim's storefront thumbnail, the four-voice mark on the opaque store ground. The one store asset that takes a product mark rather than the house mark.

to the storefront settings table:

> Product thumbnail — `design/store/product-seriatim-1024.png`, Seriatim's own mark, not the house mark.

and add the `inkscape product-seriatim.svg -w 1024 -h 1024 --export-filename=product-seriatim-1024.png` line to the rasterisation snippet under "What it does *not* generate".

- [ ] **Step 9: Commit**

```bash
git add design/mark.py design/store/product-seriatim.svg \
        design/store/product-seriatim-1024.png design/README.md
git commit -m "feat(design): Seriatim's storefront thumbnail"
```

---

## Task 3: Name both verifiers in one place

Two `--verify` entry points is one more than anyone will remember to run.

**Files:**
- Modify: `design/README.md`

**Interfaces:**
- Consumes: `design/mark.py --verify`, `design/surfaces.py --verify`.
- Produces: nothing importable; a documented command.

- [ ] **Step 1: Confirm both pass together**

Run: `python3 design/mark.py --verify && python3 design/surfaces.py --verify; echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 2: Document the combined command**

In `design/README.md`, under "The one rule", change the code block to:

```sh
python3 design/mark.py --verify       # do the committed assets match the generator?
python3 design/surfaces.py --verify   # does every storefront surface clear AA?
python3 design/mark.py --write        # regenerate them
```

- [ ] **Step 3: Commit**

```bash
git add design/README.md
git commit -m "docs(design): name both verifiers in one place"
```

---

## Task 4: Privacy page — CONDITIONAL

**Do this task only if the store's Email opt-in is turned on.** If it stays off, skip this task entirely; the current privacy page is accurate as written.

`src/pages/privacy.astro:24-31` says payment data is handled entirely by Lemon Squeezy and "none of it reaches this website or Chaos of Zen directly", and says nothing about a mailing list because there isn't one. An opt-in creates a list that Chaos of Zen owns and can broadcast to, which that sentence does not cover. Same consistency problem §6 caught with Google Fonts, reached from the other direction.

**Files:**
- Modify: `src/pages/privacy.astro`
- Test: `tests/docs-pages.spec.ts`

**Interfaces:**
- Consumes: nothing. Produces: nothing importable.

- [ ] **Step 1: Write the failing test**

Add to `tests/docs-pages.spec.ts`:

```typescript
test('privacy discloses the store mailing list', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Mailing list' })).toBeVisible();
  await expect(page.getByText(/opt in.*store/i)).toBeVisible();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm playwright test tests/docs-pages.spec.ts -g "mailing list"`
Expected: FAIL — the heading does not exist.

- [ ] **Step 3: Add the section**

In `src/pages/privacy.astro`, between the `<h2>Payment</h2>` block and `<h2>Contact</h2>`, insert:

```astro
  <h2>Mailing list</h2>
  <p>
    The store has an optional email opt-in. If you tick it, your email address
    is stored by <strong>Lemon Squeezy</strong> on behalf of Chaos of Zen and
    used to send occasional product news — nothing else, and never shared or
    sold. Every message carries an unsubscribe link, and you can ask to be
    removed at any time at support@chaosofzen.com. Buying without ticking it
    adds you to nothing.
  </p>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm playwright test tests/docs-pages.spec.ts -g "mailing list"`
Expected: PASS

- [ ] **Step 5: Run the full suite including the accessibility sweep**

Run: `pnpm astro check && pnpm vitest run && pnpm playwright test`
Expected: 0 errors, vitest green, Playwright green including the axe WCAG 2 AA sweep across all pages in both themes.

- [ ] **Step 6: Commit**

```bash
git add src/pages/privacy.astro tests/docs-pages.spec.ts
git commit -m "docs: disclose the store mailing list on the privacy page"
```

---

## Appendix: dashboard configuration — NOT tasks

These have no test cycle and cannot be executed from this repo. They are transcription from the verified table above, done once in the Lemon Squeezy dashboard by someone with access. Listed so the plan is not mistaken for the whole job.

- [ ] **Per-surface colours.** Design » each of Store, Checkout, Overlay checkout, Customer Portal, Emails. Set each to the light ground, button `#17786e`, button text `#ffffff`, exactly as `surfaces.py` prints. If any surface is set dark instead, change its row in `surfaces.py` first and let `--verify` tell you the correct accent — do not pick one in the colour picker.
- [ ] **Checkout language.** Design » Checkout » Language. Currently Automatic, which follows the customer's browser. Seriatim's manual and EULA are English-only, so consider setting `en` rather than wrapping an English legal document in a German checkout.
- [ ] **Product thumbnail.** Upload `design/store/product-seriatim-1024.png`.
- [ ] **Header, logo, favicon.** Already produced — `design/store/header-1600.png`, `logo-320.png`, `favicon-32.png`.
- [ ] **Store name and description.** Check whether the store name renders beside the header image; the header already carries the wordmark, and setting the name twice is worse than setting it once.
- [ ] **Confirmation modal**, per product: Title, Message, Button text, Button link. Seriatim's button should point at the download page.
- [ ] **Receipt email**, per product: Button content, Destination link, optional thank-you note.
- [ ] **Email opt-in.** If enabled, Task 4 becomes required.

---

## Notes for the executor

- **CI will not run on Tasks 1–3.** The workflow's `paths-ignore` covers `design/**`. Task 4 is the only one touching `src/`, and the only one CI will see. Everything else is verified locally, which means actually running the commands rather than reasoning about them.
- **If a measurement disagrees with this plan, the measurement is right.** Report the number and stop; do not tune a construction until a metric goes green.
- **Branch note.** This worktree's local branch is `claude/magical-villani-d9e68c`, but the work was pushed to `origin/claude/chaos-zen-ls-store-branding-213b70`, which is what PR #8 tracks. Push with an explicit refspec: `git push origin HEAD:claude/chaos-zen-ls-store-branding-213b70`.
