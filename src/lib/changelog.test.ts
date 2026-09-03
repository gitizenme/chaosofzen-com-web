import { describe, it, expect } from 'vitest';
import { entriesFor, type ProductSlug } from './changelog';

const entries: { data: { product: ProductSlug; version: string; title: string; date: string } }[] = [
  { data: { product: 'seriatim', version: '1.5.0', title: 'a', date: '2026-08-28' } },
  { data: { product: 'ekphrasis', version: '0.1.0', title: 'b', date: '2026-09-01' } },
  { data: { product: 'seriatim', version: '1.4.0', title: 'c', date: '2026-08-01' } },
];

describe('entriesFor', () => {
  it('returns only the named product', () => {
    expect(entriesFor(entries, 'seriatim').map(e => e.data.version)).toEqual(['1.5.0', '1.4.0']);
  });

  // The defect this exists to prevent: one product's history on the other's
  // page. Asserting the right entries are present is not enough -- assert the
  // wrong ones are absent. And a check that never sees a non-empty result
  // would pass just as well if entriesFor over-filtered to [] every time, so
  // both slugs in `entries` must actually have entries for this to mean
  // anything.
  it('never leaks another product', () => {
    for (const slug of ['seriatim', 'ekphrasis'] as const) {
      const result = entriesFor(entries, slug);
      expect(result.length).toBeGreaterThan(0);
      for (const e of result) {
        expect(e.data.product).toBe(slug);
      }
    }
  });

  it('sorts newest first', () => {
    expect(entriesFor(entries, 'seriatim').map(e => e.data.date)).toEqual(['2026-08-28', '2026-08-01']);
  });

  // v1-1-1.md and v1-4-0.md carry the same real date (2026-08-16). A same-day
  // tie must resolve by version -- the higher version is genuinely the newer
  // release -- not by whatever order the entries happened to arrive in.
  it('breaks a same-day tie by version, higher first', () => {
    const tied: { data: { product: ProductSlug; version: string; title: string; date: string } }[] = [
      { data: { product: 'seriatim', version: '1.1.1', title: 'grid invalidation fixes', date: '2026-08-16' } },
      { data: { product: 'seriatim', version: '1.4.0', title: 'long-form sync', date: '2026-08-16' } },
    ];
    expect(entriesFor(tied, 'seriatim').map(e => e.data.version)).toEqual(['1.4.0', '1.1.1']);
    // Order-independence: the same tie, fed in the opposite input order,
    // must resolve identically. This is exactly what a comparator that
    // returns -1 for both cmp(A,B) and cmp(B,A) gets wrong.
    expect(entriesFor([...tied].reverse(), 'seriatim').map(e => e.data.version)).toEqual(['1.4.0', '1.1.1']);
  });

  it('returns empty for a product with no matching entries', () => {
    const seriatimOnly: { data: { product: ProductSlug; version: string; title: string; date: string } }[] = [
      { data: { product: 'seriatim', version: '1.0.0', title: 'x', date: '2026-01-01' } },
    ];
    expect(entriesFor(seriatimOnly, 'ekphrasis')).toEqual([]);
  });
});
