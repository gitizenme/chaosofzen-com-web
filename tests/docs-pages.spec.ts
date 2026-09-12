import { test, expect } from '@playwright/test';

test('the changelog anchors match the manifest notes_url format', async ({ page }) => {
  await page.goto('/seriatim/changelog');
  // latest.json builds "#v1-5-0" from the version. If the anchor scheme
  // drifts, every release links to the top of the page instead of its notes.
  //
  // Every one of these is a live inbound link: each is what that release's
  // notes_url has pointed at since it shipped. They are listed out rather
  // than derived from the content directory so that a change to the anchor
  // scheme fails here instead of moving the expectation with it.
  for (const anchor of ['#v1-1-0', '#v1-1-1', '#v1-4-0', '#v1-4-1', '#v1-4-2',
                        '#v1-4-3', '#v1-5-0']) {
    await expect(page.locator(anchor), anchor).toHaveCount(1);
  }
});

test('the manual documents an uninstall for all four bundles', async ({ page }) => {
  await page.goto('/seriatim/manual');
  const body = await page.locator('main').innerText();
  for (const p of ['Seriatim.component', 'Seriatim MIDI FX.component', 'Seriatim.vst3', 'Seriatim.app']) {
    expect(body).toContain(p);
  }
});

test('the guide covers the score view and per-voice controls, and links back to the manual', async ({ page }) => {
  await page.goto('/seriatim/guide');
  const body = await page.locator('main').innerText();
  for (const term of ['Score view', 'Row system', 'Tuning', 'MIDI output', 'MIDI FX']) {
    expect(body).toContain(term);
  }
  // Scoped to main: the page also carries the site-wide nav favicon icon
  // (decorative, alt="", outside <main>), which an unscoped locator would
  // count as a fifth image.
  await expect(page.locator('main img')).toHaveCount(4);
  // "Manual" appears twice on this page (the intro paragraph and the footer
  // nav) -- both link to the same place, so .first() is the right check
  // rather than forcing the content to avoid a legitimate repeated link.
  await expect(page.getByRole('link', { name: 'Manual' }).first()).toHaveAttribute('href', '/seriatim/manual');
});

test('the manual and download pages link to the user guide', async ({ page }) => {
  await page.goto('/seriatim/manual');
  await expect(page.getByRole('link', { name: 'User guide' })).toHaveAttribute('href', '/seriatim/guide');

  await page.goto('/seriatim/download');
  await expect(page.getByRole('link', { name: 'User guide' })).toHaveAttribute('href', '/seriatim/guide');
});
