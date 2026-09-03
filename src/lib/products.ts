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

export const PRODUCTS: Record<'seriatim' | 'ekphrasis', Product> = {
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
