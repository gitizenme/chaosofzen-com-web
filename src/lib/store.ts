import { PRODUCTS } from './products';

// Lemon Squeezy checkout configuration.
//
// SERIATIM_VARIANT_ID is the variant's checkout UUID from the product's
// "Share / Buy" link -- NOT the numeric variant id. The UUID is stable across
// the store's test and live modes, so switching the store out of test mode
// needs no code change here.
export const LS_STORE_DOMAIN = 'store.chaosofzen.com';
export const SERIATIM_VARIANT_ID = PRODUCTS.seriatim.variantId;

// What the price field is pre-filled with. Not a floor -- 0 is accepted and
// bypasses checkout entirely.
export const SUGGESTED_PRICE_CENTS = PRODUCTS.seriatim.suggestedPriceCents;

export interface CheckoutOptions {
  embed?: boolean;
}

// There is deliberately no way to pass a price here. `checkout[custom_price]`
// is not a supported query parameter on a shareable buy-link -- Lemon
// Squeezy silently ignores it (confirmed live, 2026-08-30) since custom_price
// is documented only as a POST /v1/checkouts API attribute, which needs a
// server holding a secret API key. The product's own Pay What You Want
// pricing already gives the customer an editable "Suggest a price" field on
// Lemon Squeezy's own checkout page, defaulting to SUGGESTED_PRICE_CENTS --
// so the amount they typed on our page doesn't need to travel anywhere; they
// just enter it again there.
export function checkoutUrl(variantId: string, opts: CheckoutOptions = {}): string {
  const url = new URL(`https://${LS_STORE_DOMAIN}/checkout/buy/${variantId}`);
  if (opts.embed) url.searchParams.set('embed', '1');
  return url.toString();
}
