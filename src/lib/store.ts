// Lemon Squeezy checkout configuration.
//
// SERIATIM_VARIANT_ID is the variant's checkout UUID from the product's
// "Share / Buy" link -- NOT the numeric variant id. The UUID is stable across
// the store's test and live modes, so switching the store out of test mode
// needs no code change here.
export const LS_STORE_DOMAIN = 'store.chaosofzen.com';
// PLACEHOLDER (2026-08-28): no Lemon Squeezy product exists yet. Replace with
// the real variant UUID before Task 12's checkout rehearsal -- see Task 3
// Step 3 in docs/superpowers/plans/2026-08-21-chaosofzen-com-web.md.
export const SERIATIM_VARIANT_ID = '00000000-0000-4000-8000-000000000000';

// What the price field is pre-filled with. Not a floor -- 0 is accepted and
// bypasses checkout entirely.
export const SUGGESTED_PRICE_CENTS = 1200;

export interface CheckoutOptions {
  embed?: boolean;
  customPriceCents?: number;
}

export function checkoutUrl(variantId: string, opts: CheckoutOptions = {}): string {
  const url = new URL(`https://${LS_STORE_DOMAIN}/checkout/buy/${variantId}`);
  if (opts.embed) url.searchParams.set('embed', '1');
  if (opts.customPriceCents !== undefined) {
    const cents = opts.customPriceCents;
    if (!Number.isInteger(cents) || cents <= 0) {
      // The $0 path is handled before this function is reached. Sending 0 to
      // Lemon Squeezy would create a zero-value order, which is a different
      // and much more confusing thing than a free download.
      throw new RangeError(`customPriceCents must be a positive integer, got ${cents}`);
    }
    url.searchParams.set('checkout[custom_price]', String(cents));
  }
  return url.toString();
}
