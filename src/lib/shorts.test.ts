import { describe, it, expect } from 'vitest';
import { shortsFor, cutsOf, type ShortData } from './shorts';

const cut = (w: number, h: number) => ({
  url: `https://media.chaosofzen.com/social/x/render-${w > h ? 'horizontal' : 'vertical'}.mp4`,
  poster: `https://media.chaosofzen.com/social/x/poster-${w > h ? 'landscape' : 'vertical'}.jpg`,
  width: w, height: h,
});
const short = (over: Partial<ShortData>): { data: ShortData } => ({
  data: {
    product: 'seriatim', asset_id: '2026-09-11-s01-generative-engine', episode: 'S01',
    title: 't', hook: 'h', date: '2026-09-11', media: { landscape: cut(1920, 1080) }, ...over,
  },
});

describe('shortsFor', () => {
  const entries = [
    short({ asset_id: '2026-09-11-s01-generative-engine', date: '2026-09-11' }),
    short({ product: 'ekphrasis', asset_id: '2026-09-12-e01-first', date: '2026-09-12' }),
    short({ asset_id: '2026-09-13-s02-two-instances', date: '2026-09-13', media: { vertical: cut(1080, 1920) } }),
  ];

  it('returns only the named product', () => {
    expect(shortsFor(entries, 'seriatim').map(e => e.data.asset_id))
      .toEqual(['2026-09-13-s02-two-instances', '2026-09-11-s01-generative-engine']);
  });

  // Same defect the changelog guards against: one product's shorts on the
  // other's page. Both slugs must have entries for the check to mean anything.
  it('never leaks another product', () => {
    for (const slug of ['seriatim', 'ekphrasis'] as const) {
      const result = shortsFor(entries, slug);
      expect(result.length).toBeGreaterThan(0);
      for (const e of result) expect(e.data.product).toBe(slug);
    }
  });

  it('sorts newest first, and breaks a same-day tie by asset_id descending, in both input orders', () => {
    const tied = [
      short({ asset_id: '2026-09-11-s01-generative-engine', date: '2026-09-11' }),
      short({ asset_id: '2026-09-11-s02-two-instances', date: '2026-09-11' }),
    ];
    const want = ['2026-09-11-s02-two-instances', '2026-09-11-s01-generative-engine'];
    expect(shortsFor(tied, 'seriatim').map(e => e.data.asset_id)).toEqual(want);
    expect(shortsFor([...tied].reverse(), 'seriatim').map(e => e.data.asset_id)).toEqual(want);
  });

  it('returns empty for a product with no shorts', () => {
    expect(shortsFor([entries[0]], 'ekphrasis')).toEqual([]);
  });
});

describe('cutsOf', () => {
  it('lists landscape before vertical when both exist', () => {
    expect(cutsOf({ vertical: cut(1080, 1920), landscape: cut(1920, 1080) }).map(c => c.kind))
      .toEqual(['landscape', 'vertical']);
  });
  it('lists only the cut that exists', () => {
    expect(cutsOf({ vertical: cut(1080, 1920) }).map(c => c.kind)).toEqual(['vertical']);
    expect(cutsOf({ landscape: cut(1920, 1080) }).map(c => c.kind)).toEqual(['landscape']);
  });
  it('is empty for no cuts (the schema forbids it, but the function must not throw)', () => {
    expect(cutsOf({})).toEqual([]);
  });
});
