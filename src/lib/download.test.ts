import { describe, it, expect } from 'vitest';
import { parseManifest, DOWNLOAD_URL } from './download';

const valid = {
  version: '1.5.0',
  url: 'https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg',
  sha256: 'a'.repeat(64),
  notes_url: 'https://chaosofzen.com/seriatim/changelog#v1-5-0',
  min_macos: '11.0',
  size_bytes: 29123456,
};

describe('parseManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(parseManifest(valid)?.version).toBe('1.5.0');
  });

  it('returns null rather than throwing on garbage', () => {
    // The manifest is fetched at runtime from a different system. If it is
    // malformed the page must degrade to "download works, version unknown",
    // never to an exception that blanks the button.
    expect(parseManifest(null)).toBeNull();
    expect(parseManifest('nope')).toBeNull();
    expect(parseManifest({})).toBeNull();
  });

  it('rejects a manifest whose sha256 is not 64 hex characters', () => {
    expect(parseManifest({ ...valid, sha256: 'short' })).toBeNull();
  });

  it('rejects a non-numeric size', () => {
    expect(parseManifest({ ...valid, size_bytes: 'big' })).toBeNull();
  });

  it('points the download at the stable alias, never a versioned file', () => {
    expect(DOWNLOAD_URL).toBe('https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg');
    expect(DOWNLOAD_URL).not.toMatch(/\d+\.\d+\.\d+/);
  });
});
