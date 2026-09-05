# Ekphrasis product page — Design

**Status:** Approved design for sub-project D.
**Date:** 2026-09-02
**Repo:** this one (`chaosofzen-com-web`). The pipeline that produces what these
pages link to lives in `gitizenme/ekphrasis`.
**Scope:** Five pages under `/ekphrasis/`, and the smallest refactor that lets
two products share the site's existing machinery.

---

## 1. Context

Ekphrasis is a macOS VST3/AU/Standalone plugin that reads an image as a
spectrogram and resynthesizes it. Three sub-projects in `gitizenme/ekphrasis`
built its distribution: a signed `.pkg` in a signed `.dmg` (A), notarization and
stapling (B), and publishing to `dl.chaosofzen.dev/ekphrasis/` with a
`latest.json` manifest (C).

Nothing points at any of it. This site has a product page for Seriatim and
nothing for Ekphrasis.

### 1.1 What already exists here

Seriatim has five pages — `index`, `download`, `changelog`, `manual`, `thanks` —
plus `Nav`, `Footer`, `VersionBadge`, and `src/lib/{download,store,price}.ts`.
`public/marks/ekphrasis.svg` is already present.

### 1.2 The refactor is smaller than it looks

Reading the modules before designing changed the shape of this work. Most of
the machinery is **already product-agnostic**:

| Already generic | Product-specific |
|---|---|
| `parseManifest`, `formatBytes` | `DOWNLOAD_URL`, `MANIFEST_URL` |
| `parsePrice` (pure) | `SERIATIM_VARIANT_ID`, `SUGGESTED_PRICE_CENTS` |
| `checkoutUrl(variantId, opts)` — takes the id as a parameter | — |
| `LS_STORE_DOMAIN` (one store, both products) | — |

So the surface is **four constants across two modules**, plus one component:
`VersionBadge.astro` imports `MANIFEST_URL` directly and must take it as a prop.
`price.ts` needs no change at all.

---

## 2. Goals and non-goals

### Goals

- Five pages under `/ekphrasis/` matching Seriatim's structure.
- Two products sharing the site's machinery without duplicating logic.
- **Seriatim's pages unchanged**, so a refactor cannot break what is live.
- A changelog that cannot silently show one product's history on the other's
  page.
- A build that refuses to ship a checkout that would take money and deliver
  nothing.

### Non-goals

- **Media.** No screenshots, no demo video, no poster. Text and the existing
  mark. This is a real weakness for a product whose whole subject is images,
  and it is a deliberate follow-up rather than a thing forgotten.
- **Changing Seriatim's copy, layout or behaviour.**
- **Creating the Lemon Squeezy product.** That is
  [#28](https://github.com/gitizenme/ekphrasis/issues/28) and requires a person.
- Any change to the plugin, the installer, or the publishing pipeline, except
  the single `notes_url` line in §6.

---

## 3. Decisions taken

| # | Decision | Rationale |
|---|---|---|
| 1 | One `PRODUCTS` record, not parallel constant sets | Two products is where a shape either generalises or ossifies; a record makes a third additive |
| 2 | **Seriatim's existing exports stay as aliases** | Its pages are live. A refactor that does not touch them cannot break them |
| 3 | The changelog collection gains a required `product` field | Without a discriminator, an Ekphrasis entry silently appears in Seriatim's history |
| 4 | Make the field **required**, and backfill the existing entries | A missing field becomes a build error, not a page rendering the wrong product |
| 5 | The build refuses a placeholder variant id | A live checkout wired to a nonexistent product takes money and delivers nothing |
| 6 | `VersionBadge` takes the manifest URL as a prop | It is the only component with a product baked in |

### 3.1 Considered and rejected

- **A second set of constants (`EKPHRASIS_DOWNLOAD_URL`, …).** Rejected under
  decision 1: it works for two and is unbearable at three, and every consumer
  needs a conditional.
- **A second changelog collection.** Rejected: two globs and two schemas to
  keep in step, where one field does it.
- **Filtering the changelog by filename convention** (`ekphrasis-v0-1-0.md`).
  Rejected: a convention a schema cannot enforce is a convention that drifts.
- **Shipping the download page without a checkout** and adding it later.
  Considered seriously — it would unblock D entirely. Rejected because the
  chosen model is name-your-price parity with Seriatim, and a page that changes
  shape publicly once is worse than a page that arrives late.

---

## 4. Structure

### 4.1 The product record

`src/lib/products.ts`, new:

```ts
export interface Product {
  slug: string;
  name: string;
  downloadUrl: string;
  manifestUrl: string;
  variantId: string;
  suggestedPriceCents: number;
}

export const PRODUCTS: Record<string, Product> = { seriatim, ekphrasis };
```

`src/lib/download.ts` keeps `DOWNLOAD_URL` and `MANIFEST_URL` as aliases onto
`PRODUCTS.seriatim`, and `store.ts` keeps `SERIATIM_VARIANT_ID` and
`SUGGESTED_PRICE_CENTS` the same way. **No Seriatim page changes.**

`parseManifest`, `formatBytes`, `parsePrice`, `checkoutUrl` and
`LS_STORE_DOMAIN` are untouched — they are already generic.

### 4.2 The variant-id guard

Ekphrasis has no Lemon Squeezy product. Its `variantId` is the literal
`PLACEHOLDER-NO-LEMON-SQUEEZY-PRODUCT-YET`, and a build-time check fails on it:

```
error: PRODUCTS.ekphrasis.variantId is still the placeholder.
  A checkout wired to a nonexistent product takes payment and delivers nothing.
  Create the product (gitizenme/ekphrasis#28), then put its checkout UUID here.
```

This mirrors the licence gate in the plugin's release script: the artefact
cannot be produced while a value that would harm someone is unresolved. It runs
in the same place the site's other checks run, so `npm run build` refuses.

### 4.3 The changelog

`src/content.config.ts`'s schema gains `product: z.enum(['seriatim', 'ekphrasis'])`.
Each changelog page filters on it. The seven existing entries are backfilled with
`product: seriatim`.

Required rather than optional, and enum rather than string, so a typo is a build
error rather than an entry that appears on neither page.

### 4.4 The pages

Five under `src/pages/ekphrasis/`, mirroring Seriatim's:

- **`index.astro`** — what the instrument is: an image read as a spectrogram and
  resynthesized. The one product claim worth making precisely.
- **`download.astro`** — the price field and checkout, `VersionBadge`, the system
  requirement (macOS 11.0), and the checksum line from §5.
- **`changelog.astro`** — filtered collection.
- **`manual.astro`** — install, where each format lands, host routing, uninstall.
- **`thanks.astro`** — post-checkout auto-download.

`Nav.astro` gains an Ekphrasis link beside Seriatim's.

---

## 5. The checksum instruction

Sub-project C emits `SHA256SUMS` naming **both** `Ekphrasis-<version>.dmg` and
`Ekphrasis-latest.dmg` against one hash, so a check works whichever file the
user has. The consequence is that a bare `shasum -c SHA256SUMS` exits non-zero
— it reports the file you have as `OK` and the one you do not as missing.

The working command is:

```
shasum -c --ignore-missing SHA256SUMS
```

That instruction currently exists only in the plugin repo's README, in the
section an operator reads — not the section a downloader reads. **The download
page must carry it**, or the flag is documented only where nobody who needs it
will look.

---

## 6. One change in the other repository

C sets the manifest's `notes_url` to the GitHub release, because Ekphrasis had
no changelog page and the website's `parseManifest` rejects the whole document
if that field is empty.

Once these pages exist it should point at
`https://chaosofzen.com/ekphrasis/changelog#v<major>-<minor>-<patch>`, matching
Seriatim. One line in `scripts/release.sh`'s `cmd_manifest`, plus its covering
assertion.

It is listed here because it is the only part of D that lands in
`gitizenme/ekphrasis`, and because doing it before these pages exist would point
the manifest at a 404.

---

## 7. Testing

`vitest`, following `src/lib/download.test.ts`.

| Claim | How it is tested |
|---|---|
| Every product's URLs point at its own prefix | Assert each `PRODUCTS` entry's `downloadUrl`/`manifestUrl` contain its own slug and not another's |
| Seriatim's aliases still resolve to the same strings | Assert `DOWNLOAD_URL` and `MANIFEST_URL` equal the literals they had before the refactor |
| The placeholder guard refuses | Run it against a record whose `variantId` is the placeholder; expect a non-zero exit naming #28 |
| The guard permits a real id | Run it against a plausible UUID; expect success |
| A changelog entry cannot reach the wrong page | Assert the filter returns only entries whose `product` matches, against a fixture containing both |
| `VersionBadge` uses the URL it was given | Assert the rendered markup carries the passed manifest URL, not Seriatim's |

**Every assertion is proved by mutation** — perturb what it checks, watch it
fail, restore, watch it pass. Across the three preceding sub-projects, thirteen
defects looked correct and failed only under measurement, including several
assertions that could not fail at all.

The site's existing tests must keep passing untouched — that is the evidence for
decision 2.

---

## 8. What blocks shipping

**The Lemon Squeezy product does not exist.** Until
[#28](https://github.com/gitizenme/ekphrasis/issues/28) creates it and its
checkout UUID replaces the placeholder, `npm run build` refuses. That is
deliberate.

**`LICENSE` §3 PRICE is unresolved**
([#39](https://github.com/gitizenme/ekphrasis/issues/39)), so the plugin cannot
be packaged, notarized or published. The pages would link to a 404 today.

**Nothing has been published**, and whether `/ekphrasis/*` resolves on the
custom domain is still unverified — C records it as one `put` and one `curl` to
settle, before a first release rather than during one.

D is buildable and testable now. It ships when those land.

---

## 9. Two questions, both settled before writing this down

**`Base.astro` needs no fallback.** Its props are
`{ title, description, ogImage?: string }` with `ogImage = '/og/default.png'`.
Omitting it is already correct, so the no-media decision costs nothing here and
the Ekphrasis pages simply do not pass one.

**The guard goes in the `build` script.** `package.json` has
`"build": "astro build"` and the site has no pre-build check to extend, so the
guard is a small node script the build runs first. That is simpler than an
`astro:config:setup` integration and directly testable on its own — the plan
specifies which.
