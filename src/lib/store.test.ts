import { describe, it, expect } from 'vitest';
import { checkoutUrl, SERIATIM_VARIANT_ID } from './store';

describe('checkoutUrl', () => {
  it('builds a bare checkout url', () => {
    expect(checkoutUrl('abc-123')).toBe('https://store.chaosofzen.com/checkout/buy/abc-123');
  });

  it('adds the embed flag for the overlay', () => {
    expect(checkoutUrl('abc-123', { embed: true })).toContain('embed=1');
  });

  it('passes a custom price in cents', () => {
    const url = new URL(checkoutUrl('abc-123', { customPriceCents: 1500 }));
    expect(url.searchParams.get('checkout[custom_price]')).toBe('1500');
  });

  it('combines embed and custom price', () => {
    const url = new URL(checkoutUrl('abc-123', { embed: true, customPriceCents: 700 }));
    expect(url.searchParams.get('embed')).toBe('1');
    expect(url.searchParams.get('checkout[custom_price]')).toBe('700');
  });

  it('rejects a zero or negative price rather than sending it to Lemon Squeezy', () => {
    // The $0 path must never reach checkout. Throwing here turns a silent
    // "free order" into a test failure at the boundary that owns the rule.
    expect(() => checkoutUrl('abc-123', { customPriceCents: 0 })).toThrow();
    expect(() => checkoutUrl('abc-123', { customPriceCents: -1 })).toThrow();
  });

  it('rejects a non-integer price', () => {
    expect(() => checkoutUrl('abc-123', { customPriceCents: 12.5 })).toThrow();
  });

  it('exports a variant id that is not a placeholder', () => {
    expect(SERIATIM_VARIANT_ID).toMatch(/^[0-9a-f-]{36}$/);
  });
});
