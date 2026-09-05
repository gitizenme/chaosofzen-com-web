# Web Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the site a real button and field, a shared content column, both house/product marks visible on the pages that already earned them, cleaned-up long-form containers, and named tokens — the "set the tone" work from the original design review, updated for the two-product site that shipped since.

**Architecture:** No new dependencies. A `Button.astro` and styled form controls in `global.css`, applied to both download pages (Seriatim and Ekphrasis share the same unstyled-form defect). `design/mark.py` gains `currentColor` variants of the three full marks (favicon already has this pattern for the icon; the full marks don't), placed as `h1` lockups on the landing and both product pages. Token names are added, not renamed — `canvas`/`ink` stay as they are; this avoids a repo-wide utility-class rename that isn't this plan's job.

**Tech Stack:** Astro 7, Tailwind v4 (CSS-first `@theme`), Playwright, Vitest, the existing `design/mark.py` generator (stdlib Python).

**Spec:** The design review conducted earlier in this project (no separate spec file — this plan's Context section carries the findings that still apply, re-verified against the current codebase).

## Global Constraints

- `pnpm astro check`, `pnpm vitest run`, `pnpm astro build` (NOT `pnpm build` — that's gated by `scripts/check-products.mjs` on Ekphrasis's placeholder Lemon Squeezy variant, unrelated to this work; CI itself builds unguarded for the same reason), and `pnpm exec playwright test` must all stay green after every task.
- Every existing `data-testid` in `src/pages/seriatim/download.astro` and `src/pages/ekphrasis/download.astro` (`price-form`, `price-input`, `price-error`, `download-button`) and every `id`/`for` pairing (`price`, `price-help`, `price-error`) stays exactly as-is — `tests/download-flow.spec.ts` and `tests/product-page.spec.ts` key off them.
- Colours: light `#f2f1f5`/`#12121a`/accent `#17786e`; dark `#0e0e14`/`#eceaf2`/accent `#29b6a8`; voices `#e4572e #29b6a8 #f3a712 #a8c686`. No new colour values — only new *names* for pairings that already exist (`on-accent`, `hairline`).
- `design/mark.py`: `python3 design/mark.py --verify` must pass after every change that touches it; new assets are added to `ASSETS` and regenerated with `--write`, never hand-written.
- Radius: `--radius-brand` (6px) everywhere a radius is needed — including the focus ring, which currently hardcodes `2px`.
- Reduced motion: any new `transition` goes under `@media (prefers-reduced-motion: no-preference)`.
- Commit messages: `type(scope): summary`, ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

## File structure

| File | Responsibility |
|---|---|
| `src/styles/global.css` (modify) | Token additions (`--color-on-accent`, `--color-hairline`), `color-scheme`, button/field element styles, `pre`/`blockquote`/`hr`/`table` base styles, reduced-motion transitions, focus ring using `--radius-brand`. |
| `src/components/Button.astro` (create) | One component, rendered as `<a>` or `<button>` by whether an `href` prop is passed. No variants beyond the one style the site needs. |
| `src/components/Mark.astro` (create) | Inlines one of the three `currentColor` mark SVGs at a given pixel size. |
| `src/pages/seriatim/download.astro`, `src/pages/ekphrasis/download.astro` (modify) | Replace the bare `<input>`/`<button>` with the styled field markup and `Button`. |
| `src/pages/index.astro`, `src/pages/seriatim/index.astro`, `src/pages/ekphrasis/index.astro` (modify) | Add the `Mark` lockup; replace the text CTA link with `Button`; drop the `text-lg` lede override. |
| `src/components/Nav.astro`, `src/components/Footer.astro` (modify) | Inner content moves into the shared `max-w-3xl` column; `aria-label`/`aria-current` on Nav. |
| `src/pages/seriatim/manual.astro`, `src/pages/ekphrasis/manual.astro`, `src/pages/seriatim/changelog.astro`, `src/pages/ekphrasis/changelog.astro` (modify) | `pre`/`code` inherit the new base style; changelog date moves out of the `h2`. |
| `design/mark.py` (modify) | `house_mark_inline_svg`, `seriatim_mark_inline_svg`, `ekphrasis_mark_inline_svg` — the `currentColor` treatment `favicon_svg` already applies to the icon, applied to the three full marks. New `ASSETS` entries. |
| `design/test_mark.py` (modify) | Tests pinning the three new functions. |
| `playwright.config.ts`, `tests/dark-mode.spec.ts` (create/modify) | A `dark` project running the a11y sweep with `colorScheme: 'dark'`; one assertion that the download button has a non-transparent computed background in both themes. |

---

### Task 1: Token hygiene in `global.css`

**Files:**
- Modify: `src/styles/global.css:1-58` (the `@theme`/`:root` block) and `:154-158` (focus ring)

**Interfaces:**
- Produces: `--color-on-accent` (light `#ffffff`, dark `#12121a`), `--color-hairline` (`ink` at 10% — replaces the bare `border-ink/10` utility used ad hoc today), Tailwind utilities `bg-on-accent`, `border-hairline` via `@theme`.

- [ ] **Step 1: Add the tokens and fix the self-reference**

In `src/styles/global.css`, inside `:root` (after `--color-accent`):

```css
  --color-on-accent: #ffffff;
```

Inside the `@media (prefers-color-scheme: dark)` block's `:root`:

```css
    --color-on-accent: #12121a;
```

Add `color-scheme` so native controls (scrollbars, checkboxes, the eventual `<input>`) render correctly per theme — add this as its own rule right after the dark-mode `:root` block closes:

```css
:root { color-scheme: light dark; }
```

Replace the `@theme` block's self-referential lines with `@theme inline` (Tailwind v4's form for tokens that reference other custom properties, rather than restating themselves) and add the two new tokens:

```css
@theme inline {
  --color-canvas: var(--color-canvas);
  --color-canvas-raised: var(--color-canvas-raised);
  --color-ink: var(--color-ink);
  --color-ink-muted: var(--color-ink-muted);
  --color-accent: var(--color-accent);
  --color-on-accent: var(--color-on-accent);
  --color-voice-1: var(--color-voice-1);
  --color-voice-2: var(--color-voice-2);
  --color-voice-3: var(--color-voice-3);
  --color-voice-4: var(--color-voice-4);
  --radius-brand: var(--radius-brand);

  --font-sans: var(--font-body);
  --font-serif: var(--font-display);
  --font-mono: var(--font-code);
}
```

(`--color-hairline` is not a colour Tailwind needs to emit as a bare utility — it is only ever used as a border colour via `border-hairline`, so add it to the `@theme inline` block too:)

```css
  --color-hairline: var(--color-hairline);
```

and define `--color-hairline` in both `:root` blocks: light `rgba(18, 18, 26, 0.10)`, dark `rgba(236, 234, 242, 0.10)` — the exact values `border-ink/10` already resolves to, just named.

- [ ] **Step 2: Fix the focus ring's hardcoded radius**

Replace:

```css
  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
    border-radius: 2px;
  }
```

with:

```css
  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
    border-radius: var(--radius-brand);
  }
```

- [ ] **Step 3: Remove the unused typography plugin**

Delete `@plugin "@tailwindcss/typography";` from the top of `global.css`. Remove `@tailwindcss/typography` from `package.json`'s `devDependencies` and run `pnpm install` to update the lockfile.

- [ ] **Step 4: Verify**

Run: `pnpm astro build`
Expected: builds clean, no missing-token errors. Run: `pnpm vitest run` — unaffected, still passing. Visually confirm nothing shifted: `pnpm exec playwright test tests/layout.spec.ts tests/landing.spec.ts` still green.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css package.json pnpm-lock.yaml
git commit -m "feat(design): name the on-accent and hairline pairings, fix the theme self-reference

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `Button.astro` and a styled field, on both download pages

**Files:**
- Create: `src/components/Button.astro`
- Modify: `src/styles/global.css` (append field styles)
- Modify: `src/pages/seriatim/download.astro`, `src/pages/ekphrasis/download.astro`
- Test: `tests/download-flow.spec.ts` (no changes expected — verify it still passes)

**Interfaces:**
- Produces: `Button` component — props `href?: string`, `variant?: 'button' | 'link'` (default `'button'`; `'link'` renders the existing underlined-link style for cases that need a CTA that isn't a filled button — not used in this task but kept for Task 3), plus every native `<a>`/`<button>` attribute via `{...rest}`. Renders `<a>` when `href` is passed, `<button>` otherwise.

- [ ] **Step 1: Write `Button.astro`**

```astro
---
interface Props extends astroHTML.JSX.AnchorHTMLAttributes, astroHTML.JSX.ButtonHTMLAttributes {
  href?: string;
}
const { href, class: className, ...rest } = Astro.props;
const classes = ['btn', className].filter(Boolean).join(' ');
---
{href
  ? <a href={href} class={classes} {...rest}><slot /></a>
  : <button class={classes} {...rest}><slot /></button>}
```

- [ ] **Step 2: Style it, and the field, in `global.css`**

Append, still inside the `@layer base` block (after the `:focus-visible` rule):

```css
  .btn {
    display: inline-flex;
    align-items: center;
    height: 2.75rem;
    padding-inline: 1.25rem;
    border: none;
    border-radius: var(--radius-brand);
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
    font-weight: 600;
    font-size: 1.0625rem;
    text-decoration: none;
    cursor: pointer;
  }
  .btn:hover { filter: brightness(1.08); }
  @media (prefers-color-scheme: dark) {
    .btn:hover { filter: brightness(0.92); }
  }

  .field {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    height: 2.75rem;
    padding-inline: 0.875rem;
    width: 7rem;
    box-sizing: border-box;
    background: var(--color-canvas-raised);
    border: 1px solid var(--color-hairline);
    border-radius: var(--radius-brand);
    color: var(--color-ink);
    font-family: var(--font-code), ui-monospace, SFMono-Regular, monospace;
    font-size: 1.0625rem;
    font-variant-numeric: tabular-nums;
  }
  .field:focus-within { outline: 2px solid var(--color-accent); outline-offset: 1px; }
  .field-prefix { color: var(--color-ink-muted); }
  .field input {
    all: unset;
    flex: 1;
    min-width: 0;
  }
```

Add the reduced-motion-guarded transitions the review called for, right after `.btn`/`.field` (a single rule covering both, plus the existing link and card hovers):

```css
  @media (prefers-reduced-motion: no-preference) {
    .btn, main a:not([class]), .grid > a { transition: filter 150ms, border-color 150ms, color 150ms; }
  }
```

- [ ] **Step 3: Rebuild the Seriatim download page's form**

In `src/pages/seriatim/download.astro`, replace:

```astro
  <form data-testid="price-form" novalidate>
    <label for="price">What's it worth to you?</label>
    <div>
      <span aria-hidden="true">$</span>
      <input
        id="price" name="price" data-testid="price-input"
        type="text" inputmode="decimal" autocomplete="off"
        value={suggested} aria-describedby="price-help price-error"
      />
    </div>
    <p id="price-help">Suggested ${suggested}. Enter 0 to download free — anything else takes you to checkout to confirm the amount.</p>
    <p id="price-error" data-testid="price-error" role="alert" hidden></p>

    <button type="submit" data-testid="download-button">Download for macOS</button>
  </form>
```

with:

```astro
  <form data-testid="price-form" novalidate class="flex flex-col gap-2">
    <label for="price" class="font-semibold">What's it worth to you?</label>
    <div class="flex items-center gap-3">
      <div class="field">
        <span class="field-prefix" aria-hidden="true">$</span>
        <input
          id="price" name="price" data-testid="price-input"
          type="text" inputmode="decimal" autocomplete="off"
          value={suggested} aria-describedby="price-help price-error"
        />
      </div>
      <Button type="submit" data-testid="download-button">Download for macOS</Button>
    </div>
    <p id="price-help" class="text-sm text-ink-muted !mt-0">Suggested ${suggested}. Enter 0 to download free — anything else takes you to checkout to confirm the amount.</p>
    <p id="price-error" data-testid="price-error" role="alert" hidden class="text-sm !mt-0" style="color: var(--color-voice-1);"></p>
  </form>
```

Add the import at the top of the frontmatter: `import Button from '../../components/Button.astro';`

Apply the identical change to `src/pages/ekphrasis/download.astro` (same markup, same import; the two pages' forms are already byte-for-byte the same shape per `PRODUCTS.ekphrasis`).

- [ ] **Step 4: Run the download-flow tests**

Run: `pnpm astro build && pnpm exec playwright test tests/download-flow.spec.ts tests/product-page.spec.ts tests/thanks.spec.ts`
Expected: all passing — every assertion keys off `data-testid`, `id`, and `for`, none of which changed.

- [ ] **Step 5: Look at both pages, both themes**

Start a preview (`pnpm astro build && pnpm exec astro preview --port 4321`) and open `/seriatim/download` and `/ekphrasis/download` in a browser at both light and dark OS appearance. Confirm the field and button are visible with fills, borders and a visible focus ring on Tab. Stop the preview after (`pnpm astro preview stop`).

- [ ] **Step 6: Commit**

```bash
git add src/components/Button.astro src/styles/global.css src/pages/seriatim/download.astro src/pages/ekphrasis/download.astro
git commit -m "feat(design): a real button and field on both download pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Product-page CTAs and lede sizing

**Files:**
- Modify: `src/pages/seriatim/index.astro`, `src/pages/ekphrasis/index.astro`
- Test: `tests/product-page.spec.ts`, `tests/ekphrasis.spec.ts` — verify unaffected

**Interfaces:**
- Consumes: `Button` from Task 2.

- [ ] **Step 1: Seriatim — drop the lede override, swap the CTA**

In `src/pages/seriatim/index.astro`, remove `import` nothing new is needed beyond `Button`; add `import Button from '../../components/Button.astro';` to the frontmatter.

Change:

```astro
  <p class="text-lg">
    An instrument that composes four-voice music that never repeats — for
    roughly 931 million events per voice before it does.
  </p>
```

to:

```astro
  <p>
    An instrument that composes four-voice music that never repeats — for
    roughly 931 million events per voice before it does.
  </p>
```

(the `h1 + p` rule in `global.css` already sizes this correctly at 1.2rem/1.5 — `text-lg` was overriding it smaller).

Change:

```astro
  <p>
    <a href="/seriatim/download" class="font-semibold text-accent">Download Seriatim</a>
  </p>
```

to:

```astro
  <p><Button href="/seriatim/download">Download Seriatim</Button></p>
```

- [ ] **Step 2: Ekphrasis — same two fixes**

`src/pages/ekphrasis/index.astro` has the identical `<p class="text-lg">` lede (its opening paragraph) — remove the class the same way. It has no download CTA link on the product page itself today (the only route to `/ekphrasis/download` is via the nav-level download page, and the page's own "Status" section just links to `/ekphrasis/download` as a plain sentence link: `<a href="/ekphrasis/download">download page</a>`). Leave that inline sentence link as plain body text (it is a sentence, not a call to action) — do not add a `Button` here; only fix the lede.

- [ ] **Step 3: Verify**

Run: `pnpm astro build && pnpm exec playwright test tests/product-page.spec.ts tests/ekphrasis.spec.ts tests/landing.spec.ts`
Expected: passing. `tests/product-page.spec.ts` checks `getByRole('link', { name: /download/i })` is visible — confirm this still matches: `Button` renders an `<a>` when given `href`, so the accessible role stays `link`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/seriatim/index.astro src/pages/ekphrasis/index.astro
git commit -m "fix(design): one lede size across every page, a real button for the CTA

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Nav and Footer share the content column

**Files:**
- Modify: `src/components/Nav.astro`, `src/components/Footer.astro`

**Interfaces:** none crossing files.

- [ ] **Step 1: Nav**

Replace the outer `<nav>` element's classes so the column constraint lives on an inner wrapper (keeping `<nav>` full-bleed for its background, but the content centred), and add the accessibility attributes:

```astro
<nav aria-label="Primary" class="w-full">
  <div class="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4 text-sm">
    <a href="/" class="flex items-center gap-2.5 font-semibold tracking-tight text-ink">
      <img src="/favicon.svg" alt="" width="22" height="22" class="block" />
      Chaos of Zen
    </a>
    <div class="flex items-center gap-6">
      <a href="/seriatim" class="text-ink-muted hover:text-ink" aria-current={Astro.url.pathname.startsWith('/seriatim') ? 'page' : undefined}>Seriatim</a>
      <a href="/ekphrasis" class="text-ink-muted hover:text-ink" aria-current={Astro.url.pathname.startsWith('/ekphrasis') ? 'page' : undefined}>Ekphrasis</a>
      <a href="https://chaosofzen.dev" rel="noopener" class="text-ink-muted hover:text-ink">365 Strange Attractors</a>
    </div>
  </div>
</nav>
```

Keep the existing comment above the `<img>` tag (served-from-favicon.svg rationale) — it moves with the tag, unchanged.

- [ ] **Step 2: Footer**

Same wrapping move, plus a studio line:

```astro
<footer class="mt-24 w-full border-t border-hairline">
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-8 text-sm text-ink-muted">
    <p class="!mb-0">© 2026 Chaos of Zen</p>
    <div class="flex flex-wrap gap-x-6 gap-y-2">
      <a href="/eula" class="hover:text-ink">Licence</a>
      <a href="/privacy" class="hover:text-ink">Privacy</a>
      <a href={issuesUrl} rel="noopener" class="hover:text-ink">Report an issue</a>
    </div>
  </div>
</footer>
```

The `border-ink/10` utility becomes `border-hairline` (Task 1's token). The frontmatter above the template (the `ISSUE_TRACKERS` logic) is untouched.

- [ ] **Step 3: Verify**

Run: `pnpm astro build && pnpm exec playwright test tests/layout.spec.ts tests/landing.spec.ts`
Expected: passing (no test currently asserts nav/footer width, so this is a visual-only check — confirm by eye in the browser at a viewport wider than 816px that the wordmark and footer links now line up with the `h1` above/below them).

- [ ] **Step 4: Commit**

```bash
git add src/components/Nav.astro src/components/Footer.astro
git commit -m "fix(layout): nav and footer share the content column

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Marks on the site

**Files:**
- Modify: `design/mark.py`, `design/test_mark.py`
- Create: `public/marks/chaos-of-zen-inline.svg`, `public/marks/seriatim-inline.svg`, `public/marks/ekphrasis-inline.svg` (generator output)
- Create: `src/components/Mark.astro`
- Modify: `src/pages/index.astro`, `src/pages/seriatim/index.astro`, `src/pages/ekphrasis/index.astro`

**Interfaces:**
- Consumes: `house_body()`, `seriatim_mark()`, `ekphrasis_mark()`, `INK_ON_LIGHT`, `INK_ON_DARK`, `_svg()` — all already in `design/mark.py`.
- Produces: `house_mark_inline_svg() -> str`, `seriatim_mark_inline_svg() -> str`, `ekphrasis_mark_inline_svg() -> str`.

- [ ] **Step 1: Write the failing tests**

Append to `design/test_mark.py`:

```python
class InlineMarks(unittest.TestCase):
    def test_house_mark_inline_takes_current_color(self):
        svg = mark.house_mark_inline_svg()
        self.assertIn('fill="currentColor"', svg)
        self.assertNotIn(f'fill="{mark.INK_ON_LIGHT}"', svg)
        self.assertIn('prefers-color-scheme: dark', svg)

    def test_seriatim_and_ekphrasis_inline_take_current_color(self):
        for svg in (mark.seriatim_mark_inline_svg(), mark.ekphrasis_mark_inline_svg()):
            self.assertIn('fill="currentColor"', svg)
            self.assertNotIn(f'fill="{mark.INK_ON_LIGHT}"', svg)

    def test_inline_marks_keep_their_colour_orbit(self):
        # the ink orbit takes currentColor; the colour orbit's own hues
        # (never INK_ON_LIGHT/DARK) must survive untouched
        svg = mark.seriatim_mark_inline_svg()
        for v in mark.VOICE:
            self.assertIn(f'fill="{v}"', svg)
```

- [ ] **Step 2: Run to verify failure**

Run: `python3 -m unittest discover -s design -p 'test_*.py' -k InlineMarks -v`
Expected: `AttributeError: module 'mark' has no attribute 'house_mark_inline_svg'`.

- [ ] **Step 3: Implement**

In `design/mark.py`, directly after `house_mark_svg()`:

```python
def _inline(body: str, label: str) -> str:
    """currentColor variant of a dark-baked mark body: the ink orbit's fills
    are brushed with INK_ON_LIGHT as a sentinel and rewritten, exactly as
    favicon_svg() already does for the icon. The colour orbit's own hues
    never equal INK_ON_LIGHT, so the rewrite cannot touch them."""
    body = body.replace(f'fill="{INK_ON_LIGHT}"', 'fill="currentColor"')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="{label}">
  {body}
  <style>
    svg {{ color: {INK_ON_LIGHT}; }}
    @media (prefers-color-scheme: dark) {{ svg {{ color: {INK_ON_DARK}; }} }}
  </style>
</svg>
'''


def house_mark_inline_svg() -> str:
    return _inline(house_body(INK_ON_LIGHT), "Chaos of Zen")


def seriatim_mark_inline_svg() -> str:
    return _inline(seriatim_mark(INK_ON_LIGHT), "Seriatim")


def ekphrasis_mark_inline_svg() -> str:
    return _inline(ekphrasis_mark(INK_ON_LIGHT), "Ekphrasis")
```

Add to `ASSETS`:

```python
    "public/marks/chaos-of-zen-inline.svg": house_mark_inline_svg,
    "public/marks/seriatim-inline.svg": seriatim_mark_inline_svg,
    "public/marks/ekphrasis-inline.svg": ekphrasis_mark_inline_svg,
```

- [ ] **Step 4: Run, regenerate, verify**

Run: `python3 -m unittest discover -s design -p 'test_*.py' -v`
Expected: `OK`.
Run: `python3 design/mark.py --write && python3 design/mark.py --verify`
Expected: `wrote` for 3 new assets, then `match` for all 14.

- [ ] **Step 5: `Mark.astro`**

```astro
---
interface Props { name: 'chaos-of-zen' | 'seriatim' | 'ekphrasis'; size: number }
const { name, size } = Astro.props;
---
<img src={`/marks/${name}-inline.svg`} alt="" width={size} height={size} style={`display:block; width:${size}px; height:${size}px;`} />
```

- [ ] **Step 6: Place the marks**

`src/pages/index.astro` — above the `h1`, add `import Mark from '../components/Mark.astro';` and:

```astro
  <Mark name="chaos-of-zen" size={96} />
  <h1>Chaos of Zen</h1>
```

(remove any top margin the mark's default `<img>` display would otherwise need — `Mark`'s `display:block` already avoids inline baseline gap; add a `mb-2` wrapper if the spacing to `h1` looks tight when you look at it in Step 8).

`src/pages/seriatim/index.astro` and `src/pages/ekphrasis/index.astro` — beside the `h1`, matching the wordmark-lockup pattern:

```astro
  <div class="flex items-center gap-4">
    <Mark name="seriatim" size={72} />
    <h1>Seriatim</h1>
  </div>
```

(and `name="ekphrasis"` on the Ekphrasis page). Import `Mark` in both frontmatters.

- [ ] **Step 7: Verify and look**

Run: `pnpm astro build && pnpm exec playwright test`
Expected: full suite green (no test currently checks for the mark's presence — this step is confirming nothing else broke).
Then look at all three pages in a preview, both themes: the mark should read clearly, not clash with the `h1`'s baseline. Adjust `gap`/`size` by eye if it looks wrong before committing — this is a visual judgment call the plan cannot make for you.

- [ ] **Step 8: Commit**

```bash
git add design/mark.py design/test_mark.py public/marks/chaos-of-zen-inline.svg public/marks/seriatim-inline.svg public/marks/ekphrasis-inline.svg src/components/Mark.astro src/pages/index.astro src/pages/seriatim/index.astro src/pages/ekphrasis/index.astro
git commit -m "feat(design): the house and product marks appear on their own pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Long-form containers

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/pages/seriatim/changelog.astro`, `src/pages/ekphrasis/changelog.astro`
- Modify: `src/pages/seriatim/manual.astro`, `src/pages/ekphrasis/manual.astro` (only if either changes the `<pre>` markup — the style is global, so likely no markup change is needed; check by looking first)

**Interfaces:** none crossing files.

- [ ] **Step 1: Base styles for `pre`, `blockquote`, `hr`, `table`**

Append to `global.css`'s `@layer base` (after the `code` rule):

```css
  pre {
    background: var(--color-canvas-raised);
    border: 1px solid var(--color-hairline);
    border-radius: var(--radius-brand);
    padding: 1rem;
    overflow-x: auto;
    font-size: 0.88rem;
    margin-block-end: 1.1em;
  }
  pre code { font-size: inherit; }

  blockquote {
    border-inline-start: 2px solid var(--color-hairline);
    padding-inline-start: 1rem;
    color: var(--color-ink-muted);
    margin-block-end: 1.1em;
  }

  hr {
    border: none;
    border-top: 1px solid var(--color-hairline);
    margin-block: 2em;
  }

  table {
    border-collapse: collapse;
    font-size: 0.95em;
    margin-block-end: 1.1em;
  }
  th, td {
    border: 1px solid var(--color-hairline);
    padding: 0.5em 0.75em;
    text-align: left;
  }
```

- [ ] **Step 2: Changelog date out of the heading**

In both `src/pages/seriatim/changelog.astro` and `src/pages/ekphrasis/changelog.astro`, change:

```astro
        <h2 id={anchor}>
          {entry.data.version} — {entry.data.title}
          <span> · {entry.data.date}</span>
        </h2>
```

to:

```astro
        <h2 id={anchor}>{entry.data.version} — {entry.data.title}</h2>
        <p class="text-sm text-ink-muted font-mono !mt-0 !mb-4"><time datetime={entry.data.date}>{entry.data.date}</time></p>
```

- [ ] **Step 3: Verify**

Run: `pnpm astro build && pnpm exec playwright test tests/docs-pages.spec.ts tests/a11y/site.spec.ts`
Expected: passing. Look at both changelog pages and both manual pages (the manual's `<pre><code>` block) in a preview, confirm the code block has a visible background/border and no longer overflows the viewport at 375px width (resize the preview browser to confirm).

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css src/pages/seriatim/changelog.astro src/pages/ekphrasis/changelog.astro
git commit -m "fix(design): style pre, blockquote, hr and table; changelog date leaves the heading

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Dark-mode coverage in CI

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/dark-mode.spec.ts`

**Interfaces:** none crossing files.

- [ ] **Step 1: Add a `dark` project**

Replace `playwright.config.ts`'s body with:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'pnpm preview --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:4321' },
  projects: [
    { name: 'light', use: { ...devices['Desktop Chrome'] } },
    { name: 'dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
  ],
});
```

Every existing spec file runs unmodified under both projects now (the config didn't name `testMatch` per project, so all specs run twice — this is deliberate: `tests/a11y/site.spec.ts` gets the "both themes" coverage the design spec always claimed but never had).

- [ ] **Step 2: Write the button-visibility regression test**

Create `tests/dark-mode.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('the download button has a visible fill', async ({ page }) => {
  await page.goto('/seriatim/download');
  const btn = page.getByTestId('download-button');
  const bg = await btn.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).not.toBe('transparent');
});
```

This runs under both the `light` and `dark` projects automatically, which is the regression this plan exists to prevent (the original bare `<button>` had no background in either theme).

- [ ] **Step 3: Run the full suite**

Run: `pnpm astro build && pnpm exec playwright test`
Expected: every spec now runs under both `light` and `dark` projects — roughly double the prior test count, all passing. This will take noticeably longer than before; that is expected (real coverage was missing, not slow).

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/dark-mode.spec.ts
git commit -m "test(a11y): run the full suite in both colour schemes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-review

**Coverage against the original review's Phase 1 findings:** #1 (unstyled form) → Task 2, now covering both products. #2 (`color-scheme`) → Task 1. #3 (CTA loses underline / has no button) → Task 3 (now a real button, not a link needing the underline rule at all). #4 (lede override) → Task 3, both products. #5 (marks never shown) → Task 5. #6 (no transitions) → Task 2. #7 (nav/footer break the container) → Task 4. #9 (unstyled long-form containers) → Task 6. #10 (changelog date in the heading) → Task 6. #12 (`@theme` self-reference) → Task 1. #14 (radius/hairline unnamed) → Task 1. #16 (a11y sweep light-only) → Task 7.

**Deliberately not in this plan**, with why: a `canvas`→`ground` rename to match the plugins' naming (would touch ~40 files for a naming-only change, no user-visible effect, and the plugins' own tokens aren't unified yet either — better done together as its own pass); moving the EULA to a content collection (a real improvement, but a large, separate content migration of legal text, not a "foundations" task); `design/tokens.py`, the shared cross-repo token generator (Phase 2 of the original review — a separate plan, since it also touches both plugin repos); plugin type/spacing tokens (Phase 3, plugin-repo work). `#11` (video `preload`) is small enough to fold into Task 2's page edit — add it there if you notice it, but it isn't its own task.

**Placeholder scan:** none — every step names the file, the exact diff, and a runnable verification command.

**Type consistency:** `Button`'s prop is `href?: string` everywhere it's used (Tasks 2, 3). `Mark`'s `name` union (`'chaos-of-zen' | 'seriatim' | 'ekphrasis'`) matches the three files Task 5 generates. `--color-hairline` and `--color-on-accent` are defined once (Task 1) and consumed by name everywhere after (Tasks 2, 4, 6) — no task redefines them.
