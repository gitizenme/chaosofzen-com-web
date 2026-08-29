import { test, expect } from '@playwright/test';

test('the changelog anchors match the manifest notes_url format', async ({ page }) => {
  await page.goto('/seriatim/changelog');
  // latest.json builds "#v1-5-0" from the version. If the anchor scheme
  // drifts, every release links to the top of the page instead of its notes.
  await expect(page.locator('#v1-5-0')).toHaveCount(1);
});

test('the manual documents an uninstall for all four bundles', async ({ page }) => {
  await page.goto('/seriatim/manual');
  const body = await page.locator('main').innerText();
  for (const p of ['Seriatim.component', 'Seriatim MIDI FX.component', 'Seriatim.vst3', 'Seriatim.app']) {
    expect(body).toContain(p);
  }
});
