// Which products a changelog entry can belong to is not a fact about the
// changelog: it is PRODUCT_SLUGS, defined beside the product record itself, so
// that a slug cannot exist here without a product behind it.
import type { ProductSlug } from './products';

// Splits a version like "1.4.0-rc2" into its numeric components ([1, 4, 0])
// and its pre-release identifiers (["rc2"]), which semver defines as the
// dot-separated fields after the first "-". A component that still isn't
// numeric once the suffix is stripped is treated as 0, not NaN: a comparator
// must never return NaN -- V8 treats that as "equal" and silently corrupts
// the sort, which is exactly what plain `.split('.').map(Number)` did here
// on a version like "1.4.0-rc1" (its last component, "0-rc1", is NaN).
//
// Build metadata ("+sha") is NOT split out, so it would fold into the
// pre-release identifiers and rank the version below its plain form. Nothing
// in either repository emits it -- release.sh's parse_version accepts
// X.Y.Z[-rcN] and nothing more -- so this is a known limit, not a claim of
// full semver parsing.
function parseVersion(version: string): { parts: number[]; prerelease: string[] } {
  const dashIndex = version.indexOf('-');
  const hasSuffix = dashIndex !== -1;
  const numeric = hasSuffix ? version.slice(0, dashIndex) : version;
  const parts = numeric.split('.').map(part => {
    const n = Number(part);
    return Number.isFinite(n) ? n : 0;
  });
  const prerelease = hasSuffix ? version.slice(dashIndex + 1).split('.') : [];
  return { parts, prerelease };
}

// Compares two pre-release identifiers ascending, splitting each into runs of
// digits and non-digits so the digits compare as numbers: rc2 < rc10.
//
// This is a DELIBERATE departure from semver, which classes "rc10" as an
// alphanumeric identifier and compares it ASCII-lexically -- putting rc10
// BELOW rc2. Semver's own escape hatch is to write the number as its own
// dot-separated field ("rc.10"), which this project does not do: release.sh
// emits X.Y.Z-rcN, unseparated. Following semver to the letter here would
// therefore mis-order the only pre-release format we actually ship, which is
// the trap issue #17 named. Dot-separated numeric fields still compare
// numerically, so "rc.2" < "rc.10" too; the departure only adds a case
// semver leaves lexical.
//
// The semver rule that a numeric identifier ranks below an alphanumeric one
// is kept, applied per run.
function compareIdentifierAscending(a: string, b: string): number {
  const runsA = a.match(/\d+|\D+/g) ?? [];
  const runsB = b.match(/\d+|\D+/g) ?? [];
  const shared = Math.min(runsA.length, runsB.length);
  for (let i = 0; i < shared; i++) {
    const numericA = /^\d/.test(runsA[i]);
    const numericB = /^\d/.test(runsB[i]);
    if (numericA !== numericB) return numericA ? -1 : 1;
    if (numericA) {
      const diff = Number(runsA[i]) - Number(runsB[i]);
      if (diff !== 0) return diff;
    } else if (runsA[i] !== runsB[i]) {
      return runsA[i] < runsB[i] ? -1 : 1;
    }
  }
  if (runsA.length !== runsB.length) return runsA.length - runsB.length;
  // Everything above compared equal but the strings differ -- "rc01" against
  // "rc1", say. Fall back to the raw string so distinct identifiers never tie,
  // because a tie is the defect this whole path exists to remove.
  return a < b ? -1 : a > b ? 1 : 0;
}

// Compares pre-release identifier lists ascending, per semver rule 11: a
// version WITHOUT a pre-release outranks the same version with one, fields
// are compared left to right, and a longer list outranks its own prefix
// (1.4.0-rc.1 < 1.4.0-rc.1.1).
function comparePrereleaseAscending(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) {
    if (a.length === b.length) return 0;
    return a.length === 0 ? 1 : -1;
  }
  const shared = Math.min(a.length, b.length);
  for (let i = 0; i < shared; i++) {
    const diff = compareIdentifierAscending(a[i], b[i]);
    if (diff !== 0) return diff;
  }
  return a.length - b.length;
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
  return -comparePrereleaseAscending(va.prerelease, vb.prerelease);
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
