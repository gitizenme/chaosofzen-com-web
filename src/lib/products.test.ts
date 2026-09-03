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
  it.each(['seriatim', 'ekphrasis'] as const)('%s urls point at its own prefix', slug => {
    const p = PRODUCTS[slug];
    const other = slug === 'seriatim' ? 'ekphrasis' : 'seriatim';
    for (const url of [p.downloadUrl, p.manifestUrl]) {
      expect(url).toContain(`/${slug}/`);
      expect(url).not.toContain(`/${other}/`);
    }
  });

  // The download url is a STABLE ALIAS. A versioned url here would work for
  // exactly one release and then pin the site to it silently.
  it.each(['seriatim', 'ekphrasis'] as const)('%s download url is the stable alias', slug => {
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
  // toBe is value equality on strings/numbers, so this cannot distinguish a
  // genuine alias from a coincidentally-equal literal -- the four literal
  // assertions above already pin both sides independently. What this checks
  // is that the alias and the record agree.
  it('the alias and the record agree', () => {
    expect(DOWNLOAD_URL).toBe(PRODUCTS.seriatim.downloadUrl);
    expect(MANIFEST_URL).toBe(PRODUCTS.seriatim.manifestUrl);
    expect(SERIATIM_VARIANT_ID).toBe(PRODUCTS.seriatim.variantId);
    expect(SUGGESTED_PRICE_CENTS).toBe(PRODUCTS.seriatim.suggestedPriceCents);
  });
});
