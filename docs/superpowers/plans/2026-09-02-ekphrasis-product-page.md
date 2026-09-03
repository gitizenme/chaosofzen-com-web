# Ekphrasis Product Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five pages under `/ekphrasis/` on chaosofzen.com, and the smallest refactor that lets two products share the site's existing machinery.

**Architecture:** One `PRODUCTS` record replaces four product-specific constants; Seriatim's exports become aliases onto it so its pages keep working unchanged. The changelog collection gains a required `product` enum so an entry cannot reach the wrong page. A build-time guard refuses a placeholder Lemon Squeezy variant id.

**Tech Stack:** Astro 7, TypeScript, vitest, Tailwind. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-09-02-ekphrasis-product-page-design.md`](../specs/2026-09-02-ekphrasis-product-page-design.md)

## Global Constraints

Every task's requirements implicitly include this section.

- **Seriatim's pages must keep working.** They are live. The refactor keeps `DOWNLOAD_URL`, `MANIFEST_URL`, `SERIATIM_VARIANT_ID` and `SUGGESTED_PRICE_CENTS` exported with their exact current values, as aliases onto the new record.
- **The exact current values, which tests assert verbatim:**
  - `DOWNLOAD_URL` = `https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg`
  - `MANIFEST_URL` = `https://dl.chaosofzen.dev/seriatim/latest.json`
  - `SERIATIM_VARIANT_ID` = `b6654c01-a0a8-473b-a260-bbb84d08b9ba`
  - `SUGGESTED_PRICE_CENTS` = `1200`
  - `LS_STORE_DOMAIN` = `store.chaosofzen.com` — one store, both products, unchanged
- **Ekphrasis's URLs:** `https://dl.chaosofzen.dev/ekphrasis/Ekphrasis-latest.dmg` and `https://dl.chaosofzen.dev/ekphrasis/latest.json`. The download URL is a **stable alias** — never a versioned object. `download.ts`'s existing comment says why: the pipeline overwrites the object behind it, which is what lets a plugin release ship without redeploying this site.
- **The placeholder is the literal string** `PLACEHOLDER-NO-LEMON-SQUEEZY-PRODUCT-YET`.
- **Do not touch** `parseManifest`, `formatBytes`, `parsePrice`, `checkoutUrl`, or `LS_STORE_DOMAIN`. They are already product-agnostic — `checkoutUrl` takes the variant id as a parameter.
- **`Base.astro` needs no `ogImage`.** Its props are `{ title, description, ogImage?: string }` with `ogImage = '/og/default.png'`. Ekphrasis pages omit it.
- **Text only.** No screenshots, no demo media. `public/marks/ekphrasis.svg` already exists.
- **macOS 11.0** is the stated minimum, matching what the plugin's installer asserts.

## Test discipline — read this before writing any assertion

Across the three sub-projects that built the pipeline these pages link to, **thirteen defects looked correct and failed only under measurement.** The recurring shapes:

- A **negative pattern match** (`grep -q ' [ */]*build/release/'`) meant to catch a path where a basename belonged. It passed against exactly that regression, because it asserted one wrong spelling was absent rather than that the right answer was present.
- A test whose **shim was never reached** — it passed because the real binary failed the fixture anyway. Only adding the *positive* case proved the mechanism worked.
- A **completion sentinel that was dead** because a later handler silently replaced it.

So for every assertion you write: **perturb what it checks, watch it fail, restore, watch it pass.** Paste the output. An assertion you only inspected is not evidence. Prefer equality against an expected value over "does not contain the wrong thing".

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/products.ts` *(create)* | The `Product` interface and the `PRODUCTS` record — the single place a product's URLs, variant id and suggested price live |
| `src/lib/products.test.ts` *(create)* | Per-product URL correctness and the Seriatim-alias guarantee |
| `src/lib/download.ts` *(modify)* | `DOWNLOAD_URL`/`MANIFEST_URL` become aliases; everything else untouched |
| `src/lib/store.ts` *(modify)* | `SERIATIM_VARIANT_ID`/`SUGGESTED_PRICE_CENTS` become aliases; everything else untouched |
| `scripts/check-products.mjs` *(create)* | The build-time placeholder guard |
| `scripts/check-products.test.ts` *(create)* | The guard, proved from both sides |
| `src/content.config.ts` *(modify)* | `product` added to the changelog schema |
| `src/content/changelog/*.md` *(modify)* | Seven entries backfilled |
| `src/components/VersionBadge.astro` *(modify)* | Takes a `manifestUrl` prop |
| `src/pages/seriatim/download.astro` *(modify)* | One line: passes the prop |
| `src/pages/ekphrasis/*.astro` *(create)* | Five pages |
| `src/components/Nav.astro` *(modify)* | An Ekphrasis link |

---

## Task 1: The product record and Seriatim's aliases

**Files:**
- Create: `src/lib/products.ts`, `src/lib/products.test.ts`
- Modify: `src/lib/download.ts`, `src/lib/store.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Product { slug: string; name: string; downloadUrl: string; manifestUrl: string; variantId: string; suggestedPriceCents: number }`
  - `const PRODUCTS: Record<string, Product>` with keys `seriatim` and `ekphrasis`
  - `PLACEHOLDER_VARIANT_ID` — the literal `PLACEHOLDER-NO-LEMON-SQUEEZY-PRODUCT-YET`, exported so the guard and its tests share one definition

- [ ] **Step 1: Write the failing test**

Create `src/lib/products.test.ts`. Follow `src/lib/download.test.ts` for conventions — `import { describe, it, expect } from 'vitest'`.

```ts
import { describe, it, expect } from 'vitest';
import { PRODUCTS, PLACEHOLDER_VARIANT_ID } from './products';
import { DOWNLOAD_URL, MANIFEST_URL } from './download';
import { SERIATIM_VARIANT_ID, SUGGESTED_PRICE_CENTS } from './store';

describe('PRODUCTS', () => {
  it('has exactly the two products the site ships', () => {
    expect(Object.keys(PRODUCTS).sort()).toEqual(['ekphrasis', 'seriatim']);
  });

  // Each product's urls must point at ITS OWN prefix. Asserting only that a
  // url contains the right slug would pass if it also contained the other's,
  // so both halves are checked: the right one present, the wrong one absent.
  it.each(['seriatim', 'ekphrasis'])('%s urls point at its own prefix', slug => {
    const p = PRODUCTS[slug];
    const other = slug === 'seriatim' ? 'ekphrasis' : 'seriatim';
    for (const url of [p.downloadUrl, p.manifestUrl]) {
      expect(url).toContain(`/${slug}/`);
      expect(url).not.toContain(`/${other}/`);
    }
  });

  // The download url is a STABLE ALIAS. A versioned url here would work for
  // exactly one release and then pin the site to it silently.
  it.each(['seriatim', 'ekphrasis'])('%s download url is the stable alias', slug => {
    expect(PRODUCTS[slug].downloadUrl).toMatch(/-latest\.dmg$/);
  });

  it('gives ekphrasis the placeholder variant id, because its product does not exist yet', () => {
    expect(PRODUCTS.ekphrasis.variantId).toBe(PLACEHOLDER_VARIANT_ID);
  });
});

// The whole point of the alias layer: Seriatim's pages import these names and
// are live. Equality against the literals they had BEFORE this refactor is what
// proves the refactor cannot have changed what they resolve to.
describe('seriatim aliases are unchanged by the refactor', () => {
  it('DOWNLOAD_URL', () => {
    expect(DOWNLOAD_URL).toBe('https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg');
  });
  it('MANIFEST_URL', () => {
    expect(MANIFEST_URL).toBe('https://dl.chaosofzen.dev/seriatim/latest.json');
  });
  it('SERIATIM_VARIANT_ID', () => {
    expect(SERIATIM_VARIANT_ID).toBe('b6654c01-a0a8-473b-a260-bbb84d08b9ba');
  });
  it('SUGGESTED_PRICE_CENTS', () => {
    expect(SUGGESTED_PRICE_CENTS).toBe(1200);
  });
  it('the aliases and the record are the same values, not parallel copies', () => {
    expect(DOWNLOAD_URL).toBe(PRODUCTS.seriatim.downloadUrl);
    expect(MANIFEST_URL).toBe(PRODUCTS.seriatim.manifestUrl);
    expect(SERIATIM_VARIANT_ID).toBe(PRODUCTS.seriatim.variantId);
    expect(SUGGESTED_PRICE_CENTS).toBe(PRODUCTS.seriatim.suggestedPriceCents);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/lib/products.test.ts
```

Expected: FAIL — `Failed to resolve import "./products"`.

- [ ] **Step 3: Write `src/lib/products.ts`**

```ts
// One record per product. Two products is where a shape either generalises or
// ossifies -- a record makes a third additive, where parallel constant sets
// make every consumer grow a conditional.
//
// download.ts and store.ts keep their existing exports as aliases onto this,
// so Seriatim's live pages import the same names and cannot be broken by the
// refactor that introduced this file.

export interface Product {
  slug: string;
  name: string;
  /** The STABLE ALIAS, never a versioned object. See download.ts's comment. */
  downloadUrl: string;
  manifestUrl: string;
  /** Lemon Squeezy checkout UUID -- not the numeric variant id. */
  variantId: string;
  suggestedPriceCents: number;
}

// Ekphrasis has no Lemon Squeezy product yet (gitizenme/ekphrasis#28). This
// literal is what scripts/check-products.mjs refuses to build with: a checkout
// wired to a product that does not exist would take payment and deliver
// nothing.
export const PLACEHOLDER_VARIANT_ID = 'PLACEHOLDER-NO-LEMON-SQUEEZY-PRODUCT-YET';

export const PRODUCTS: Record<string, Product> = {
  seriatim: {
    slug: 'seriatim',
    name: 'Seriatim',
    downloadUrl: 'https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg',
    manifestUrl: 'https://dl.chaosofzen.dev/seriatim/latest.json',
    variantId: 'b6654c01-a0a8-473b-a260-bbb84d08b9ba',
    suggestedPriceCents: 1200,
  },
  ekphrasis: {
    slug: 'ekphrasis',
    name: 'Ekphrasis',
    downloadUrl: 'https://dl.chaosofzen.dev/ekphrasis/Ekphrasis-latest.dmg',
    manifestUrl: 'https://dl.chaosofzen.dev/ekphrasis/latest.json',
    variantId: PLACEHOLDER_VARIANT_ID,
    suggestedPriceCents: 1200,
  },
};
```

- [ ] **Step 4: Turn `download.ts`'s constants into aliases**

Replace the two `export const` lines. **Keep the existing comment above them** — it explains the stable-alias rule and is still true.

```ts
import { PRODUCTS } from './products';

export const DOWNLOAD_URL = PRODUCTS.seriatim.downloadUrl;
export const MANIFEST_URL = PRODUCTS.seriatim.manifestUrl;
```

- [ ] **Step 5: Turn `store.ts`'s constants into aliases**

Keep `LS_STORE_DOMAIN` exactly as it is — one store serves both products. Keep the existing comments.

```ts
import { PRODUCTS } from './products';

export const SERIATIM_VARIANT_ID = PRODUCTS.seriatim.variantId;
export const SUGGESTED_PRICE_CENTS = PRODUCTS.seriatim.suggestedPriceCents;
```

- [ ] **Step 6: Run the whole suite**

```bash
npx vitest run
```

Expected: PASS, including the pre-existing `download.test.ts`, `store.test.ts` and `price.test.ts` **untouched**. Those passing unchanged is the evidence that Seriatim is unbroken.

- [ ] **Step 7: Prove the alias assertions can fail**

Change `PRODUCTS.seriatim.downloadUrl` to the ekphrasis URL. Confirm both the own-prefix test and the `DOWNLOAD_URL` equality test FAIL, and that `download.test.ts` fails too. Restore; confirm all pass. Paste both runs.

This is the assertion that matters most in this task — it is the one standing between a refactor and a broken live page.

- [ ] **Step 8: Commit**

```bash
git add src/lib/products.ts src/lib/products.test.ts src/lib/download.ts src/lib/store.ts
git commit -m "feat(lib): one product record, with Seriatim's exports as aliases

Two products is where a shape either generalises or ossifies. A record makes a
third additive; parallel constant sets make every consumer grow a conditional.

Seriatim's four exports keep their exact values as aliases onto the record, so
its live pages import the same names and the refactor cannot break them. The
test asserts those values as literals -- the ones they had before this commit.

parseManifest, formatBytes, parsePrice and checkoutUrl are untouched: they were
already product-agnostic, and checkoutUrl already takes the variant id as a
parameter.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: The build-time placeholder guard

**Files:**
- Create: `scripts/check-products.mjs`, `scripts/check-products.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `PRODUCTS`, `PLACEHOLDER_VARIANT_ID` (Task 1).
- Produces: `checkProducts(products)` — exported from the script, returns an array of human-readable problem strings, empty when everything is shippable. The script's CLI entry prints them and exits 1.

### Why a guard rather than a note

A checkout wired to a nonexistent Lemon Squeezy product does not fail loudly. It renders, it accepts a price, and it sends someone to a broken checkout — or worse, takes payment against a product that delivers nothing. The plugin's release script gates on an unresolved licence for the same reason: the artefact cannot be produced while a value that would harm someone is unresolved.

- [ ] **Step 1: Write the failing test**

Create `scripts/check-products.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { checkProducts } from './check-products.mjs';
import { PLACEHOLDER_VARIANT_ID } from '../src/lib/products';

const real = {
  slug: 'x', name: 'X',
  downloadUrl: 'https://dl.chaosofzen.dev/x/X-latest.dmg',
  manifestUrl: 'https://dl.chaosofzen.dev/x/latest.json',
  variantId: 'b6654c01-a0a8-473b-a260-bbb84d08b9ba',
  suggestedPriceCents: 1200,
};

describe('checkProducts', () => {
  it('accepts a product with a real variant id', () => {
    expect(checkProducts({ x: real })).toEqual([]);
  });

  it('refuses a placeholder variant id', () => {
    const out = checkProducts({ x: { ...real, variantId: PLACEHOLDER_VARIANT_ID } });
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('x');
  });

  // The message is what an operator acts on. A guard that says only "invalid"
  // costs a search at exactly the wrong moment.
  it('names the issue that creates the product', () => {
    const out = checkProducts({ x: { ...real, variantId: PLACEHOLDER_VARIANT_ID } });
    expect(out[0]).toContain('#28');
  });

  it('reports every offending product, not just the first', () => {
    const bad = { ...real, variantId: PLACEHOLDER_VARIANT_ID };
    expect(checkProducts({ a: bad, b: bad })).toHaveLength(2);
  });

  // An empty record must not read as "everything is fine" -- that is the
  // failure mode where a refactor drops the record and the build goes green.
  it('refuses an empty record', () => {
    expect(checkProducts({})).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run scripts/check-products.test.ts
```

Expected: FAIL — cannot resolve `./check-products.mjs`.

- [ ] **Step 3: Write `scripts/check-products.mjs`**

```js
// Refuses to build a site whose checkout points at a product that does not
// exist. Run by `npm run build` before astro, so the failure arrives before
// anything is generated rather than after it is deployed.
//
// This mirrors the licence gate in the plugin's release script: the artefact
// cannot be produced while a value that would harm someone is unresolved.

import { PRODUCTS, PLACEHOLDER_VARIANT_ID } from '../src/lib/products.ts';

export function checkProducts(products) {
  const problems = [];

  if (Object.keys(products).length === 0) {
    problems.push(
      'the product record is empty -- nothing would be checked, which is not the same as everything being fine'
    );
    return problems;
  }

  for (const [key, p] of Object.entries(products)) {
    if (p.variantId === PLACEHOLDER_VARIANT_ID) {
      problems.push(
        `${key}: variantId is still the placeholder.\n` +
        `  A checkout wired to a product that does not exist takes payment and\n` +
        `  delivers nothing. Create the Lemon Squeezy product\n` +
        `  (gitizenme/ekphrasis#28), then put its checkout UUID here.`
      );
    }
  }

  return problems;
}

const problems = checkProducts(PRODUCTS);
if (problems.length > 0) {
  console.error('error: the site is not shippable.\n');
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run scripts/check-products.test.ts
```

Expected: PASS, five tests.

If the import of a `.ts` file from an `.mjs` script fails under plain node, run the guard through the same loader vitest uses — or make the script `.ts` and invoke it with the project's existing TypeScript runner. Report which you did and why; do not duplicate the constants into the script to dodge the import, since two copies of a value that must agree is the defect this whole task exists to prevent.

- [ ] **Step 5: Wire it into the build**

In `package.json`, `"build"` is currently `"astro build"`. Make it run the guard first:

```json
"build": "node scripts/check-products.mjs && astro build"
```

- [ ] **Step 6: Prove the build actually refuses**

```bash
npm run build
```

Expected: non-zero, the message naming `ekphrasis` and `#28`, and **no `dist/` output generated by this run**. Confirm astro did not run.

Then temporarily set `PRODUCTS.ekphrasis.variantId` to a plausible UUID, re-run `npm run build`, and confirm it proceeds. Restore the placeholder and confirm it refuses again. Paste all three runs.

The middle run is the one that matters: a guard nobody has seen permit is indistinguishable from a guard that always fails.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-products.mjs scripts/check-products.test.ts package.json
git commit -m "feat(build): refuse to ship a checkout that would take money and deliver nothing

Ekphrasis has no Lemon Squeezy product yet, so its variant id is a placeholder.
A page built with it renders, accepts a price, and sends someone to a checkout
for a product that does not exist.

The guard runs before astro, so the failure arrives before anything is
generated. An empty record is refused too -- nothing to check is not the same
as everything being fine.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: The changelog gains a product

**Files:**
- Modify: `src/content.config.ts`, all seven `src/content/changelog/*.md`
- Modify: `src/pages/seriatim/changelog.astro`
- Test: `src/lib/changelog.test.ts` *(create)*

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `entriesFor(entries, slug)` in `src/lib/changelog.ts` — filters a collection to one product and sorts newest first. Both changelog pages call it.

### Why required, and why an enum

The collection currently globs one directory with no discriminator. Add Ekphrasis entries and they appear in Seriatim's history — silently, because nothing distinguishes them.

Making the field **required** turns a forgotten one into a build error. Making it an **enum** turns a typo (`serriatim`) into a build error too, rather than an entry that renders on neither page and is noticed months later.

- [ ] **Step 1: Write the failing test**

Create `src/lib/changelog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { entriesFor } from './changelog';

const entries = [
  { data: { product: 'seriatim', version: '1.5.0', title: 'a', date: '2026-08-28' } },
  { data: { product: 'ekphrasis', version: '0.1.0', title: 'b', date: '2026-09-01' } },
  { data: { product: 'seriatim', version: '1.4.0', title: 'c', date: '2026-08-01' } },
];

describe('entriesFor', () => {
  it('returns only the named product', () => {
    expect(entriesFor(entries, 'seriatim').map(e => e.data.version)).toEqual(['1.5.0', '1.4.0']);
  });

  // The defect this exists to prevent: one product's history on the other's
  // page. Asserting the right entries are present is not enough -- assert the
  // wrong ones are absent.
  it('never leaks another product', () => {
    for (const slug of ['seriatim', 'ekphrasis']) {
      for (const e of entriesFor(entries, slug)) {
        expect(e.data.product).toBe(slug);
      }
    }
  });

  it('sorts newest first', () => {
    expect(entriesFor(entries, 'seriatim').map(e => e.data.date)).toEqual(['2026-08-28', '2026-08-01']);
  });

  it('returns empty for a product with no entries', () => {
    expect(entriesFor(entries, 'nonexistent')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/lib/changelog.test.ts
```

Expected: FAIL — cannot resolve `./changelog`.

- [ ] **Step 3: Write `src/lib/changelog.ts`**

```ts
// One product's entries, newest first. Both changelog pages call this rather
// than filtering inline, so the filter cannot drift between them -- and so the
// "never leaks another product" assertion covers both pages at once.
export function entriesFor<T extends { data: { product: string; date: string } }>(
  entries: readonly T[],
  slug: string,
): T[] {
  return entries
    .filter(e => e.data.product === slug)
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
}
```

- [ ] **Step 4: Add the field to the schema**

In `src/content.config.ts`, add to the changelog schema:

```ts
product: z.enum(['seriatim', 'ekphrasis']),
```

Required, not `.optional()`. A missing field must be a build error.

- [ ] **Step 5: Backfill the seven existing entries**

Every file in `src/content/changelog/` is a Seriatim entry. Add `product: "seriatim"` to each frontmatter block, matching the existing quoting style:

```yaml
---
product: "seriatim"
version: "1.5.0"
title: "Signed, notarized installer, and MIDI input"
date: "2026-08-28"
---
```

- [ ] **Step 6: Point Seriatim's changelog page at the helper**

`src/pages/seriatim/changelog.astro` currently sorts inline. Replace that with `entriesFor(entries, 'seriatim')`, keeping everything else identical.

- [ ] **Step 7: Prove the schema rejects a missing field**

Remove `product:` from one entry and run `npx astro check` (or `npm run build`). Confirm it **fails** naming that file. Restore, confirm it passes.

Then set one entry's `product` to `serriatim` — a plausible typo — and confirm the enum rejects it. Restore.

Paste all four runs. A schema you have not seen reject something is a schema you are hoping about.

- [ ] **Step 8: Run everything and commit**

```bash
npx vitest run && npx astro check
git add src/content.config.ts src/content/changelog src/lib/changelog.ts src/lib/changelog.test.ts src/pages/seriatim/changelog.astro
git commit -m "feat(content): a changelog entry belongs to exactly one product

The collection globbed one directory with no discriminator, so an Ekphrasis
entry would have appeared in Seriatim's history with nothing to distinguish it.

Required rather than optional, so a forgotten field is a build error; an enum
rather than a string, so a typo is one too -- otherwise the entry renders on
neither page and nobody notices.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: `VersionBadge` takes its manifest URL

**Files:**
- Modify: `src/components/VersionBadge.astro`, `src/pages/seriatim/download.astro`

**Interfaces:**
- Consumes: `PRODUCTS` (Task 1).
- Produces: `<VersionBadge manifestUrl={...} />` — a **required** prop.

### A deliberate departure from the spec's letter

The spec says Seriatim's pages do not change. This task changes one line of one of them, and that is the better call: the alternative is defaulting the prop to Seriatim's URL, which is exactly the coupling this removes, hidden inside a default.

One line, covered by an assertion that Seriatim's page still renders its own URL. The spec's intent — the refactor cannot break what is live — is what the test enforces.

- [ ] **Step 1: Make the prop required and read it client-side**

`VersionBadge.astro` currently imports `MANIFEST_URL` in both its frontmatter and its client script. A client script cannot see component props directly, so pass it through the DOM:

```astro
---
interface Props { manifestUrl: string }
const { manifestUrl } = Astro.props;
---
<p data-testid="version-badge" hidden data-manifest-url={manifestUrl}
   class="text-sm text-ink-muted">
  <span data-slot="summary"></span>
  <code data-slot="sha" class="block break-all text-xs opacity-70"></code>
</p>

<script>
  import { parseManifest, formatBytes } from '../lib/download';

  const el = document.querySelector<HTMLElement>('[data-testid="version-badge"]');
  if (el) {
    // The url comes from the element, not an import: this component serves
    // more than one product, and an imported constant would silently make
    // every badge show the same one.
    const url = el.dataset.manifestUrl;
    // ... rest of the existing logic unchanged, using `url`
  }
</script>
```

Keep the existing fire-and-forget comment and behaviour — only the URL's source changes.

- [ ] **Step 2: Pass the prop from Seriatim's download page**

```astro
<VersionBadge manifestUrl={PRODUCTS.seriatim.manifestUrl} />
```

Import `PRODUCTS` from `../../lib/products`.

- [ ] **Step 3: Verify Seriatim's page still renders its own URL**

```bash
npm run build 2>/dev/null || true
grep -r 'data-manifest-url' dist/seriatim/download/index.html
```

Expected: the attribute present, carrying `https://dl.chaosofzen.dev/seriatim/latest.json`.

If the build refuses because of Task 2's guard, temporarily set a plausible UUID to get past it, then restore the placeholder — and say in your report that you did.

- [ ] **Step 4: Prove the prop is actually used**

Change the passed value to the ekphrasis manifest URL, rebuild, and confirm the rendered attribute changes. Restore and confirm it changes back. Paste both.

A prop that is accepted and ignored renders exactly like one that works.

- [ ] **Step 5: Commit**

```bash
git add src/components/VersionBadge.astro src/pages/seriatim/download.astro
git commit -m "refactor(ui): VersionBadge takes the manifest url it should show

It imported MANIFEST_URL directly, which is fine for one product and wrong for
two. The prop is required rather than defaulted to Seriatim: a default naming
one product is the coupling this removes, hidden inside a default.

The client script reads the url from a data attribute, since a script cannot
see props -- an imported constant there would make every badge show the same
product.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: The five Ekphrasis pages

**Files:**
- Create: `src/pages/ekphrasis/{index,download,changelog,manual,thanks}.astro`
- Modify: `src/components/Nav.astro`

**Interfaces:**
- Consumes: `PRODUCTS` (Task 1), `entriesFor` (Task 3), `<VersionBadge manifestUrl>` (Task 4), and the untouched `checkoutUrl`, `parsePrice`, `SUGGESTED_PRICE_CENTS`.
- Produces: the routes.

### Read Seriatim's pages first

Each Ekphrasis page mirrors its Seriatim counterpart's structure and classes. Read all five before writing any, and follow what is there — this task is about content and wiring, not a new design.

### What Ekphrasis is, stated accurately

The index page's one job is to say what the instrument does without overclaiming. It reads an image as a spectrogram — brightness becomes amplitude, vertical position becomes frequency — and resynthesizes that into sound, so a picture becomes something you can play. It is a macOS VST3/AU/Standalone instrument.

Do not claim it is released, notarized-and-verified, or available. It is none of those yet.

### The manual's content, which you have real sources for

The plugin repo's `README.md` and `scripts/uninstall-ekphrasis.sh` are authoritative. The facts:

- The installer is a `.pkg` inside a `.dmg`.
- It installs three things: the AU to `/Library/Audio/Plug-Ins/Components`, the VST3 to `/Library/Audio/Plug-Ins/VST3`, and the standalone app to `/Applications`.
- macOS 11.0 or later.
- The dmg carries `Uninstall Ekphrasis.sh` beside the installer. It removes all three and forgets three `pkgutil` receipts, so a later reinstall does not report "already installed" against files that are gone.
- Hosts find AU and VST3 after a rescan; Logic runs its own AU validation on first sight.

- [ ] **Step 1: Write the pages**

Five files, each mirroring its Seriatim counterpart:

- **`index.astro`** — what it is, per above. `<Base title="Ekphrasis — a macOS image-to-sound instrument" description="..." >`. No `ogImage`.
- **`download.astro`** — mirror Seriatim's: the price field, `checkoutUrl(PRODUCTS.ekphrasis.variantId, …)`, `<VersionBadge manifestUrl={PRODUCTS.ekphrasis.manifestUrl} />`, macOS 11.0, and the checksum line from Step 2.
- **`changelog.astro`** — `entriesFor(entries, 'ekphrasis')`.
- **`manual.astro`** — install, where each format lands, host rescan, uninstall.
- **`thanks.astro`** — mirror Seriatim's, using `PRODUCTS.ekphrasis.downloadUrl`.

- [ ] **Step 2: Put the checksum command on the download page**

The release pipeline emits `SHA256SUMS` naming **both** `Ekphrasis-<version>.dmg` and `Ekphrasis-latest.dmg` against one hash, so a check works whichever file the user has. The consequence: a bare `shasum -c SHA256SUMS` exits non-zero — it reports the file you have as `OK` and the one you do not as missing.

So the page must show:

```
shasum -c --ignore-missing SHA256SUMS
```

That flag is currently documented only in the plugin repo's README, in the section an operator reads rather than the one a downloader reads. Without this line it is documented where nobody who needs it will look.

- [ ] **Step 3: Add Ekphrasis to the nav**

In `Nav.astro`, beside the existing Seriatim link, matching its classes exactly.

- [ ] **Step 4: Build and check every route renders**

```bash
npm run build   # set a plausible UUID first if Task 2's guard blocks; restore after
for p in "" download changelog manual thanks; do
  test -f "dist/ekphrasis/${p:+$p/}index.html" && echo "ok: /ekphrasis/$p" || echo "MISSING: /ekphrasis/$p"
done
```

All five present.

- [ ] **Step 5: Verify the pages carry Ekphrasis's own values, not Seriatim's**

```bash
grep -o 'dl\.chaosofzen\.dev/[a-z]*' dist/ekphrasis/download/index.html | sort -u
grep -c 'seriatim' dist/ekphrasis/download/index.html
```

Expected: only `dl.chaosofzen.dev/ekphrasis`, and zero Seriatim references in the download page's body.

This is the copy-paste error this task is most likely to make — mirroring Seriatim's page and leaving one of its URLs behind.

- [ ] **Step 6: Verify the changelog pages do not cross-contaminate**

Add a temporary Ekphrasis changelog entry, rebuild, and confirm it appears on `/ekphrasis/changelog` and **not** on `/seriatim/changelog`. Remove it, rebuild, confirm both are as before. Paste both runs.

- [ ] **Step 7: Run everything and commit**

```bash
npx vitest run && npx astro check
git add src/pages/ekphrasis src/components/Nav.astro
git commit -m "feat(pages): the Ekphrasis product pages

Five pages mirroring Seriatim's, text only -- no screenshots or demo media
yet, which is a real weakness for a product whose subject is images and a
deliberate follow-up rather than an oversight.

The download page carries \`shasum -c --ignore-missing SHA256SUMS\`, because
the pipeline emits both filenames against one hash and a bare \`shasum -c\`
therefore exits non-zero. That flag was documented only in the operator's half
of the plugin README.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Point the manifest at the changelog (other repository)

**Files:**
- Modify: `scripts/release.sh` and `scripts/tests/test-publish.sh` in **`gitizenme/ekphrasis`**, not this repo.

**Interfaces:**
- Consumes: the `/ekphrasis/changelog` route (Task 5).
- Produces: nothing here.

### Why this is last, and why it is in D at all

Sub-project C sets the manifest's `notes_url` to the GitHub release, because Ekphrasis had no changelog page and the website's `parseManifest` returns `null` for the whole document if that field is empty. Now the page exists.

Doing this before Task 5 would point the manifest at a 404.

**This is a separate repository and a separate pull request.** Do not mix it into this repo's commits.

- [ ] **Step 1: Change the anchor construction**

In `gitizenme/ekphrasis`'s `scripts/release.sh`, `cmd_manifest` writes:

```
"notes_url": "https://github.com/gitizenme/ekphrasis/releases/tag/v$v",
```

Change it to the changelog anchor, matching Seriatim's form — `1.5.0` becomes `v1-5-0`:

```sh
local anchor="v${v//./-}"
```

```
"notes_url": "https://chaosofzen.com/ekphrasis/changelog#$anchor",
```

- [ ] **Step 2: Update the covering assertion**

`scripts/tests/test-publish.sh` asserts the notes_url. Update it to the new value, and keep it an equality assertion.

- [ ] **Step 3: Prove the anchor is built correctly**

Assert that version `0.1.0` produces `#v0-1-0` and **not** `#v0.1.0`. Then change the substitution to `${v}` and confirm the assertion fails. Restore.

A dotted anchor matches no heading and the link silently lands at the top of the page — it looks like it works.

- [ ] **Step 4: Run the ekphrasis suites and commit there**

```bash
for t in version-bump licence-gate notarize packaging release-robustness publish rc-guard; do
  ./scripts/tests/test-$t.sh >/dev/null || echo "FAILED: $t"
done
```

Commit in that repo, on its own branch, for its own PR.

---

## Done when

- `npx vitest run` and `npx astro check` both pass in this repo.
- `npm run build` **refuses**, naming `ekphrasis` and `#28` — that is correct until the Lemon Squeezy product exists.
- With a plausible UUID substituted, the build succeeds and all five `/ekphrasis/` routes render with Ekphrasis's own URLs.
- Seriatim's pages and its three existing test files are unchanged in behaviour.
- Every assertion added has been shown to fail under mutation.

## What remains unverified

**Nothing has been published.** `dl.chaosofzen.dev/ekphrasis/latest.json` returns 404 today, so the version badge will show nothing on a live page until a release lands. That is expected, not a defect — the badge is written fire-and-forget for exactly this reason.

**The pages cannot ship** until the Lemon Squeezy product exists (#28) and the plugin's `LICENSE` §3 PRICE is settled (#39). Do not remove the guard to make a build pass.
