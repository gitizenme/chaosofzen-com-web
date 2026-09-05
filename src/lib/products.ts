// One record per product. Two products is where a shape either generalises or
// ossifies -- a record makes a third additive, where parallel constant sets
// make every consumer grow a conditional.
//
// download.ts and store.ts keep their existing exports as aliases onto this,
// so Seriatim's live pages import the same names and cannot be broken by the
// refactor that introduced this file.

// There is deliberately no `slug` and no `name` field. The record's KEY is the
// slug -- a `slug` property beside it is a second copy of the same fact that
// nothing reads, so nothing can notice when the two disagree (both products
// carrying slug: 'seriatim' type-checked and passed the whole suite). `name`
// had no reader at all. A field only this file writes is not data, it is a
// comment that lies when it rots.
export interface Product {
  /** The STABLE ALIAS, never a versioned object. See download.ts's comment. */
  downloadUrl: string;
  manifestUrl: string;
  /** Lemon Squeezy checkout UUID -- not the numeric variant id. */
  variantId: string;
  suggestedPriceCents: number;
}

// Ekphrasis has no Lemon Squeezy product yet. A checkout wired to a product
// that does not exist would take payment and deliver nothing, so this literal
// stands in until one exists.
//
// TO REPLACE THIS: create the Lemon Squeezy product -- gitizenme/ekphrasis#28
// -- and put its checkout UUID (from the variant's "Share / Buy" link, not the
// numeric variant id) in PRODUCTS.ekphrasis.variantId below. A checkout
// existing is not the same as the dmg existing (gitizenme/ekphrasis#39 and the
// /ekphrasis/* publish); check that too before shipping the id.
//
// This pointer used to live in scripts/check-products.mjs, a pre-build guard
// that refused to build at all while any variantId was this value. That guard
// blocked EVERY deploy of the whole site, Seriatim's included, over a page
// that could simply decline to render a checkout -- so the refusal moved from
// the build to the page. isPurchasable() below is what enforces it now, and
// tests/checkout-gate.spec.ts asserts the built output obeys it.
export const PLACEHOLDER_VARIANT_ID = 'PLACEHOLDER-NO-LEMON-SQUEEZY-PRODUCT-YET';

// The products this site ships. ONE definition, used two ways: as the type of
// PRODUCTS' keys, and as the changelog collection's `product` enum
// (src/content.config.ts). They were previously independent -- a slug could be
// added to the enum with no product and no pages behind it, and it validated,
// type-checked, built clean and rendered nowhere. Now each is a compile error
// in both directions: a slug here with no entry in PRODUCTS is a missing
// property, and a product in PRODUCTS that is not listed here is an unknown
// one.
export const PRODUCT_SLUGS = ['seriatim', 'ekphrasis'] as const;
export type ProductSlug = (typeof PRODUCT_SLUGS)[number];

export const PRODUCTS: Record<ProductSlug, Product> = {
  seriatim: {
    downloadUrl: 'https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg',
    manifestUrl: 'https://dl.chaosofzen.dev/seriatim/latest.json',
    variantId: 'b6654c01-a0a8-473b-a260-bbb84d08b9ba',
    suggestedPriceCents: 1200,
  },
  ekphrasis: {
    downloadUrl: 'https://dl.chaosofzen.dev/ekphrasis/Ekphrasis-latest.dmg',
    manifestUrl: 'https://dl.chaosofzen.dev/ekphrasis/latest.json',
    variantId: PLACEHOLDER_VARIANT_ID,
    suggestedPriceCents: 1200,
  },
};

// The single answer to "may a page offer to sell this?". ONE definition,
// because the interesting failure is two of them: /ekphrasis/thanks carried
// its own copy of `variantId !== PLACEHOLDER_VARIANT_ID` while
// /ekphrasis/download had no check at all, and nothing could notice that the
// two pages disagreed about the same product.
//
// A page that renders a purchase control or a checkout url for a product this
// returns false for is a bug -- tests/checkout-gate.spec.ts asserts against
// the built output that none does.
export function isPurchasable(product: Product): boolean {
  return product.variantId !== PLACEHOLDER_VARIANT_ID;
}
