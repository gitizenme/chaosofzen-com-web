// Source of truth for which products a changelog entry can belong to.
// src/content.config.ts imports this rather than repeating the literal, so
// the schema and this module cannot silently disagree on what's valid.
export const PRODUCT_SLUGS = ['seriatim', 'ekphrasis'] as const;
export type ProductSlug = (typeof PRODUCT_SLUGS)[number];

// Compares dot-separated version numbers component-by-component, descending
// (higher version first). Used only to break a same-day date tie.
function compareVersionDescending(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const length = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < length; i++) {
    const diff = (partsB[i] ?? 0) - (partsA[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// One product's entries, newest first. Both changelog pages call this rather
// than filtering inline, so the filter cannot drift between them -- and so the
// "never leaks another product" assertion covers both pages at once.
//
// `slug` is typed as ProductSlug, not string, so a call site passing a typo
// like 'ekphrais' is a compile error rather than a silently empty result.
//
// Dates alone can tie (two releases the same day): localeCompare returns 0
// on a tie, and ties then fall back to version, descending, since the higher
// version genuinely is the newer release. A prior version of this comparator
// used `a.data.date < b.data.date ? 1 : -1`, which is not a valid comparator
// -- on a tie it returns -1 for both cmp(A,B) and cmp(B,A), so the result
// order depended on (and was reversed by) input order.
export function entriesFor<
  T extends { data: { product: ProductSlug; date: string; version: string } },
>(entries: readonly T[], slug: ProductSlug): T[] {
  return entries
    .filter(e => e.data.product === slug)
    .sort((a, b) => {
      const dateCmp = b.data.date.localeCompare(a.data.date);
      return dateCmp !== 0 ? dateCmp : compareVersionDescending(a.data.version, b.data.version);
    });
}
