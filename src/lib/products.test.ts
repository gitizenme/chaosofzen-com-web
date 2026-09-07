import { describe, it, expect } from 'vitest';
import { PRODUCTS, PLACEHOLDER_VARIANT_ID } from './products';

describe('PRODUCTS', () => {
  it('has exactly the two products the site ships', () => {
    expect(Object.keys(PRODUCTS).sort()).toEqual(['ekphrasis', 'seriatim']);
  });

  // Each product's urls must point at ITS OWN prefix. Asserting only that a
  // url contains the right slug would pass if it also contained the other's,
  // so both halves are checked: the right one present, the wrong one absent.
  //
  // `slug` here is the RECORD KEY, which is the only place the slug lives --
  // the interface deliberately carries no `slug` field for this identifier to
  // be confused with. Read this as "the url under key `k` contains `/k/`".
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

  // Both products now have real Lemon Squeezy variants, so the placeholder
  // should appear nowhere. Asserted per-product rather than only on ekphrasis:
  // the interesting failure is a THIRD product being added and shipped with the
  // placeholder still in it, which an ekphrasis-only assertion cannot see.
  it.each(['seriatim', 'ekphrasis'] as const)('%s has a real variant id', slug => {
    expect(PRODUCTS[slug].variantId).not.toBe(PLACEHOLDER_VARIANT_ID);
    // The bare uuid Lemon Squeezy issues, with no "buy/" prefix: checkoutUrl()
    // builds /checkout/buy/<variantId>, so a prefixed value here yields
    // /checkout/buy/buy/<uuid> and a checkout that 404s. That is exactly what
    // the store hands you when you copy the link, so it is worth pinning.
    expect(PRODUCTS[slug].variantId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

// Seriatim is live. These are the literals its pages resolved to BEFORE the
// record existed, so equality against them is what proves the refactor that
// introduced PRODUCTS -- and the migration that has since retired most of the
// aliases -- cannot have changed a url, a price or a checkout id under a
// shipping product.
//
// They are asserted on the record itself rather than through an alias. Every
// alias is now gone -- the pages that imported them read PRODUCTS.seriatim by
// key instead -- because an alias that no page imports pins a value nothing
// uses, and a bare name like DOWNLOAD_URL is Seriatim's only by convention,
// which is the copy-paste that would hand an Ekphrasis buyer Seriatim's dmg.
describe('seriatim resolves to the same values it did before the record existed', () => {
  it('download url', () => {
    expect(PRODUCTS.seriatim.downloadUrl).toBe('https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg');
  });
  it('manifest url', () => {
    expect(PRODUCTS.seriatim.manifestUrl).toBe('https://dl.chaosofzen.dev/seriatim/latest.json');
  });
  it('checkout variant id', () => {
    expect(PRODUCTS.seriatim.variantId).toBe('f623b2eb-4777-407c-aee4-a5f118e609b1');
  });
  it('suggested price', () => {
    expect(PRODUCTS.seriatim.suggestedPriceCents).toBe(1200);
  });
  // The one alias with a live consumer left (/seriatim/thanks). toBe is value
  // equality on strings, so this cannot distinguish a genuine alias from a
  // coincidentally-equal literal; what it checks is that the two agree.
});
