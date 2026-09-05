import { describe, it, expect } from 'vitest';
import { checkoutUrl } from './store';
import { PRODUCTS } from './products';

describe('checkoutUrl', () => {
  it('builds a bare checkout url', () => {
    expect(checkoutUrl('abc-123')).toBe('https://store.chaosofzen.com/checkout/buy/abc-123');
  });

  it('adds the embed flag for the overlay', () => {
    expect(checkoutUrl('abc-123', { embed: true })).toContain('embed=1');
  });

  it('never attaches a price -- Lemon Squeezy silently ignores checkout[custom_price] on a buy-link', () => {
    // Confirmed live 2026-08-30: custom_price is a POST /v1/checkouts API
    // attribute, not a buy-link query parameter. The product's own Pay What
    // You Want pricing gives the customer an editable price field on
    // Lemon Squeezy's own checkout page instead.
    const url = new URL(checkoutUrl('abc-123'));
    expect(url.search).toBe('');
  });

  // Was written against store.ts's SERIATIM_VARIANT_ID alias; it now reads the
  // record the alias pointed at, which is the same value and the only copy of
  // it. Seriatim's is a real checkout UUID -- Ekphrasis's deliberately is not,
  // which products.test.ts asserts.
  it('the seriatim variant id is a real checkout uuid, not a placeholder', () => {
    expect(PRODUCTS.seriatim.variantId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
