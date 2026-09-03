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
