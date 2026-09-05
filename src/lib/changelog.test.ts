import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { entriesFor, changelogAnchor } from './changelog';
import type { ProductSlug } from './products';

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

  // A version can carry a pre-release suffix (this project's own
  // parse_version and publish pipeline treat "-rcN" as first-class), and
  // .split('.').map(Number) on "1.4.0-rc1" produces NaN in its last
  // component. A comparator that returns NaN is invalid -- V8 silently
  // treats it as 0 -- so this must never happen. Same-day, so the ordering
  // comes entirely from the version comparator.
  it('ranks a release candidate below its same-day final release, consistently in both input orders', () => {
    const rc: { data: { product: ProductSlug; version: string; title: string; date: string } } =
      { data: { product: 'seriatim', version: '1.4.0-rc1', title: 'rc', date: '2026-08-16' } };
    const final: { data: { product: ProductSlug; version: string; title: string; date: string } } =
      { data: { product: 'seriatim', version: '1.4.0', title: 'final', date: '2026-08-16' } };

    expect(entriesFor([rc, final], 'seriatim').map(e => e.data.version)).toEqual(['1.4.0', '1.4.0-rc1']);
    expect(entriesFor([final, rc], 'seriatim').map(e => e.data.version)).toEqual(['1.4.0', '1.4.0-rc1']);
  });

  // The coordinator's own measurement: with the NaN-producing comparator,
  // sort(['1.4.0-rc1', '1.4.0', '1.4.1']) misplaces 1.4.0 -- it lands last
  // instead of second. This test pins the correct three-way order.
  it('sorts a release candidate to the end of its same-day numeric siblings', () => {
    const tied: { data: { product: ProductSlug; version: string; title: string; date: string } }[] = [
      { data: { product: 'seriatim', version: '1.4.0-rc1', title: 'rc', date: '2026-08-16' } },
      { data: { product: 'seriatim', version: '1.4.0', title: 'final', date: '2026-08-16' } },
      { data: { product: 'seriatim', version: '1.4.1', title: 'patch', date: '2026-08-16' } },
    ];
    expect(entriesFor(tied, 'seriatim').map(e => e.data.version)).toEqual(['1.4.1', '1.4.0', '1.4.0-rc1']);
  });

  // The numeric comparator must still be correct now that it also has to
  // handle suffixes: a double-digit component doesn't become a lexical
  // comparison (1.10.0 sorts above 1.9.0, not below it), and versions with a
  // trailing zero component tie with their shorter, equal form.
  it('still compares plain numeric versions correctly', () => {
    const doubleDigit: { data: { product: ProductSlug; version: string; title: string; date: string } }[] = [
      { data: { product: 'seriatim', version: '1.9.0', title: 'nine', date: '2026-08-16' } },
      { data: { product: 'seriatim', version: '1.10.0', title: 'ten', date: '2026-08-16' } },
    ];
    expect(entriesFor(doubleDigit, 'seriatim').map(e => e.data.version)).toEqual(['1.10.0', '1.9.0']);

    // A genuine tie (0 diff, not NaN) is stable: whichever order the tied
    // entries arrive in is the order they come out in.
    const short: { data: { product: ProductSlug; version: string; title: string; date: string } } =
      { data: { product: 'seriatim', version: '1.4', title: 'short form', date: '2026-08-16' } };
    const long: { data: { product: ProductSlug; version: string; title: string; date: string } } =
      { data: { product: 'seriatim', version: '1.4.0', title: 'long form', date: '2026-08-16' } };
    expect(entriesFor([short, long], 'seriatim').map(e => e.data.version)).toEqual(['1.4', '1.4.0']);
    expect(entriesFor([long, short], 'seriatim').map(e => e.data.version)).toEqual(['1.4.0', '1.4']);
  });

  // parseVersion's `Number.isFinite(n) ? n : 0` fallback is the only thing
  // stopping a non-numeric component (e.g. a version string that isn't a
  // version at all) from producing NaN and corrupting the sort the way
  // round 2's rc suffix did. This pins the fallback's actual behavior: junk
  // sorts below every real version, not above or interleaved with one.
  it('sorts a non-numeric version below every valid version', () => {
    const junk: { data: { product: ProductSlug; version: string; title: string; date: string } }[] = [
      { data: { product: 'seriatim', version: 'abc', title: 'junk', date: '2026-08-16' } },
      { data: { product: 'seriatim', version: '1.0.0', title: 'one', date: '2026-08-16' } },
      { data: { product: 'seriatim', version: '2.0.0', title: 'two', date: '2026-08-16' } },
    ];
    expect(entriesFor(junk, 'seriatim').map(e => e.data.version)).toEqual(['2.0.0', '1.0.0', 'abc']);
    expect(entriesFor([...junk].reverse(), 'seriatim').map(e => e.data.version)).toEqual(['2.0.0', '1.0.0', 'abc']);
  });
});

describe('changelogAnchor', () => {
  // The literal on the right is the plugin's `${version//./-}` written out by
  // hand. Deriving it here from the same expression the implementation uses
  // would assert nothing.
  it.each([
    ['1.5.0', 'v1-5-0'],
    ['0.1.0', 'v0-1-0'],
    ['1.4.0-rc1', 'v1-4-0-rc1'],
    ['2.0', 'v2-0'],
  ])('%s -> %s', (version, expected) => {
    expect(changelogAnchor(version)).toBe(expected);
  });

  // The live-inbound-link guarantee, and ONLY that. Every anchor Seriatim has
  // published so far was the entry's FILENAME; the anchor now comes from the
  // entry's version instead, so each of those anchors must still resolve or an
  // existing link breaks.
  //
  // This list is deliberately frozen rather than globbed. Globbing the content
  // directory would assert filename === anchor for every entry that ever
  // exists, which is the opposite of what deriving the anchor from the version
  // was for: both products share this one flat directory, so the first
  // Ekphrasis entry for a version Seriatim already used CANNOT reuse the
  // filename -- it will be named something else, and its anchor will rightly
  // disagree with its filename. A globbed assertion would fail on precisely
  // the case this change exists to make safe.
  //
  // Add to this list when an anchor becomes publicly linked, not when a file
  // appears.
  const PUBLISHED_ANCHORS = [
    'v1-1-0', 'v1-1-1', 'v1-4-0', 'v1-4-1', 'v1-4-2', 'v1-4-3', 'v1-5-0',
  ];

  it.each(PUBLISHED_ANCHORS)('%s still resolves to the same anchor', anchor => {
    const dir = new URL('../content/changelog/', import.meta.url);
    const front = readFileSync(new URL(`${anchor}.md`, dir), 'utf8');
    const version = front.match(/^version:\s*['"]?([^'"\n]+?)['"]?\s*$/m)?.[1];
    expect(version, `${anchor}.md has a version`).toBeTruthy();
    expect(changelogAnchor(version!)).toBe(anchor);
  });
});
