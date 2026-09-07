import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertServedBuildMatchesTree } from './served-build-check';

// A real server on an ephemeral port rather than a mocked fetch. What this
// guard has to get right is the comparison between bytes on the wire and
// bytes on disk; a mock would assert the mock.
let server: Server | undefined;

async function serve(body: string): Promise<string> {
  server = createServer((_req, res) => res.end(body));
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address === 'string' || address === null) throw new Error('no port');
  return `http://127.0.0.1:${address.port}/`;
}

async function build(body: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'served-build-check-'));
  const path = join(dir, 'index.html');
  await writeFile(path, body, 'utf8');
  return path;
}

afterEach(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  server = undefined;
});

describe('assertServedBuildMatchesTree', () => {
  it('accepts a server serving the build on disk', async () => {
    const html = '<html><body>a page</body></html>';
    await expect(assertServedBuildMatchesTree(await serve(html), await build(html))).resolves
      .toBeUndefined();
  });

  // The PR #11 scenario: a stray server serving a build with the Ekphrasis
  // card deleted. Without this guard the suite ran against it and reported
  // two confident failures about a working tree that was fine.
  it('rejects a server serving a different build', async () => {
    const url = await serve('<html><body>the Ekphrasis card is missing</body></html>');
    const path = await build('<html><body><a href="/ekphrasis">Ekphrasis</a></body></html>');
    await expect(assertServedBuildMatchesTree(url, path)).rejects.toThrow(
      /is not serving this working tree/,
    );
  });

  // A one-byte difference is still a different build. The guard compares
  // content, not size, and a length-only check would pass this.
  it('rejects a build differing by a single byte', async () => {
    const url = await serve('<html><body>ab</body></html>');
    const path = await build('<html><body>ba</body></html>');
    await expect(assertServedBuildMatchesTree(url, path)).rejects.toThrow(
      /is not serving this working tree/,
    );
  });
});
