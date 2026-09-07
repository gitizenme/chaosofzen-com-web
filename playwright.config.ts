import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Runs after webServer is up. Fails loudly if the port is serving some other
  // tree, which `reuseExistingServer` below would otherwise adopt in silence.
  globalSetup: './scripts/served-build-check.ts',
  webServer: {
    command: 'pnpm preview --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    env: {
      // `astro preview` daemonises ITSELF when it detects an agent harness --
      // am-i-vibing matches CLAUDECODE, CURSOR_AGENT, GEMINI_CLI and a dozen
      // more. The process Playwright spawned then returns immediately and the
      // run dies with "Process from config.webServer exited early", while the
      // daemon it forked keeps holding 4321 for every later run to adopt. So
      // the tooling MANUFACTURES the stale server that reuseExistingServer
      // then trusts; the two behaviours compound (issue #16).
      //
      // ASTRO_PREVIEW_BACKGROUND is astro's own opt-out of that detection:
      // `!process.env.ASTRO_PREVIEW_BACKGROUND && isRunByAgent()` in
      // astro/dist/cli/preview/index.js. Its name reads backwards here -- it
      // means "the decision is mine, not yours", and with no `--background`
      // flag passed the decision is foreground. The server stays a child
      // Playwright owns and kills when the run ends.
      ASTRO_PREVIEW_BACKGROUND: '1',
    },
  },
  use: { baseURL: 'http://localhost:4321' },
  projects: [
    { name: 'light', use: { ...devices['Desktop Chrome'] } },
    { name: 'dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
  ],
});
