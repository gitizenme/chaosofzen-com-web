import { PRODUCTS } from './products';

// SERIATIM's download url, and only Seriatim's. This bare export exists for one
// reason: /seriatim/thanks still imports it, from before there was a second
// product. It is not a general "the download url" -- reusing it on another
// product's page is the copy-paste that sells one product and ships another,
// so anything new reads PRODUCTS[<slug>].downloadUrl by key instead. An alias
// lives here only while a page still imports it; MANIFEST_URL was removed when
// the last page stopped.
//
// The url itself is a STABLE ALIAS, hardcoded. The release pipeline overwrites
// the object behind it on every release, which is what lets a plugin release
// ship without redeploying this site. Never substitute a versioned url here --
// that reintroduces the coupling this avoids.
export const DOWNLOAD_URL = PRODUCTS.seriatim.downloadUrl;

export interface Manifest {
  version: string;
  url: string;
  sha256: string;
  notes_url: string;
  min_macos: string;
  size_bytes: number;
}

// Written to return null rather than throw: this parses data fetched at
// runtime from the release pipeline, and a schema drift there must degrade
// the version badge, not break the download button.
export function parseManifest(raw: unknown): Manifest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const m = raw as Record<string, unknown>;
  const str = (k: string) => (typeof m[k] === 'string' ? (m[k] as string) : null);

  const version = str('version');
  const url = str('url');
  const sha256 = str('sha256');
  const notes_url = str('notes_url');
  const min_macos = str('min_macos');
  const size_bytes = m.size_bytes;

  if (!version || !url || !notes_url || !min_macos) return null;
  if (!sha256 || !/^[0-9a-f]{64}$/.test(sha256)) return null;
  if (typeof size_bytes !== 'number' || !Number.isFinite(size_bytes)) return null;

  return { version, url, sha256, notes_url, min_macos, size_bytes };
}

export function formatBytes(n: number): string {
  return `${(n / 1_000_000).toFixed(1)} MB`;
}
