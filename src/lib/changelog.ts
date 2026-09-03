// Source of truth for which products a changelog entry can belong to.
// src/content.config.ts imports this rather than repeating the literal, so
// the schema and this module cannot silently disagree on what's valid.
export const PRODUCT_SLUGS = ['seriatim', 'ekphrasis'] as const;
export type ProductSlug = (typeof PRODUCT_SLUGS)[number];

// Splits a version like "1.4.0-rc1" into its numeric components ([1, 4, 0])
// and whether it carries a pre-release suffix. A component that still isn't
// numeric once the suffix is stripped is treated as 0, not NaN: a comparator
// must never return NaN -- V8 treats that as "equal" and silently corrupts
// the sort, which is exactly what plain `.split('.').map(Number)` did here
// on a version like "1.4.0-rc1" (its last component, "0-rc1", is NaN).
function parseVersion(version: string): { parts: number[]; hasSuffix: boolean } {
  const dashIndex = version.indexOf('-');
  const hasSuffix = dashIndex !== -1;
  const numeric = hasSuffix ? version.slice(0, dashIndex) : version;
  const parts = numeric.split('.').map(part => {
    const n = Number(part);
    return Number.isFinite(n) ? n : 0;
  });
  return { parts, hasSuffix };
}

// Compares dot-separated version numbers component-by-component, descending
// (higher version first). A pre-release suffix (e.g. "-rc1") ranks below the
// same numeric version without one -- 1.4.0-rc1 precedes 1.4.0, matching
// semver precedence and this project's own release process (parse_version
// and the publish pipeline both treat "-rcN" as a first-class, pre-final
// version, so an rc changelog entry is expected, not exotic). Used only to
// break a same-day date tie.
function compareVersionDescending(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  const length = Math.max(va.parts.length, vb.parts.length);
  for (let i = 0; i < length; i++) {
    const diff = (vb.parts[i] ?? 0) - (va.parts[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (va.hasSuffix !== vb.hasSuffix) return va.hasSuffix ? 1 : -1;
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

// The heading id a release's notes link points at. Derived from the VERSION,
// never from the entry's filename.
//
// This is one half of a contract that spans two repositories: the plugin's
// release script emits `notes_url` as `.../changelog#v${version//./-}`. The
// other half used to be `entry.id`, i.e. the markdown file's name -- which
// agrees with the version only for as long as every file happens to be named
// after it. Both products' entries share ONE flat src/content/changelog/
// directory (the collection discriminates on a `product` field, deliberately,
// rather than on a filename convention), so the first Ekphrasis release of a
// version Seriatim already shipped cannot use the name it wants. Renaming it
// would move a filename-derived anchor to something notes_url does not
// mention -- while the id notes_url DOES mention still exists, on the other
// product's page. The release would land silently at the top of the page.
//
// The transform is `${version//./-}` exactly, case included, so the two
// repositories cannot disagree about an anchor for a version like 1.0.0-RC1.
export function changelogAnchor(version: string): string {
  return `v${version.replaceAll('.', '-')}`;
}
