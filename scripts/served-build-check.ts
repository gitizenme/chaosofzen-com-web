import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Playwright's `reuseExistingServer` adopts whatever is already listening on
// the port. It does not warn, and it does not check that the server is
// serving THIS tree -- so the whole suite can grade a different build and
// report a confident pass or fail about code that was never run. It has
// happened twice in review (issue #16), both times against a server nobody
// deliberately started.
//
// This runs as Playwright's globalSetup, which fires AFTER webServer is up
// (measured, not assumed), so by here the port is serving something. Compare
// it against the build on disk: `astro preview` is a static file server over
// dist/, so a server started from this tree returns dist/index.html byte for
// byte. Anything else is a server for some other directory.
//
// It lives in scripts/ rather than tests/ so that its own unit test is picked
// up by vitest (which already covers scripts/**/*.test.ts) without Playwright
// also trying to run it as a spec.
const HOME = 'http://localhost:4321/';

// Only the homepage is compared. A whole-tree comparison would cost a request
// per page for a hazard that is all-or-nothing -- a foreign server serves a
// foreign dist/ for every path, not just one.
export async function assertServedBuildMatchesTree(
  home: string,
  onDiskPath: string,
): Promise<void> {
  const [onDisk, response] = await Promise.all([readFile(onDiskPath, 'utf8'), fetch(home)]);
  const served = await response.text();
  if (served === onDisk) return;

  throw new Error(
    [
      `The server on ${home} is not serving this working tree.`,
      '',
      `  served ${home}  ${served.length} bytes`,
      `  built  ${onDiskPath}  ${onDisk.length} bytes`,
      '',
      'Playwright reused a server that was already listening, so every test',
      'below would have graded a build that is not the one in this directory.',
      '',
      'Find it:  lsof -nP -iTCP:4321 -sTCP:LISTEN',
      '          npx astro preview status',
      'Clear it: npx astro preview stop   (or kill the pid lsof reports)',
      '',
      'If the port is free and this still fires, dist/ is stale relative to',
      'the running server -- rebuild with `npx astro build` and retry.',
    ].join('\n'),
  );
}

// Playwright calls globalSetup with its FullConfig. The wrapper takes no
// arguments on purpose: passing that object straight into the function above
// would silently become the `home` url.
export default async function globalSetup(): Promise<void> {
  await assertServedBuildMatchesTree(
    HOME,
    fileURLToPath(new URL('../dist/index.html', import.meta.url)),
  );
}
