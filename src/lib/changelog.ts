// One product's entries, newest first. Both changelog pages call this rather
// than filtering inline, so the filter cannot drift between them -- and so the
// "never leaks another product" assertion covers both pages at once.
export function entriesFor<T extends { data: { product: string; date: string } }>(
  entries: readonly T[],
  slug: string,
): T[] {
  return entries
    .filter(e => e.data.product === slug)
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
}
