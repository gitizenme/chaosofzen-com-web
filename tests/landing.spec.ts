import { test, expect } from '@playwright/test';

test('the landing page introduces the studio and both projects', async ({ page }) => {
  await page.goto('/');
  // Scoped to <main>: the persistent Nav (Task 2) also carries a "Seriatim"
  // link on every page, which otherwise makes this an ambiguous, two-match
  // locator rather than a check on the landing page's own content.
  const main = page.locator('main');
  await expect(main.getByRole('link', { name: /seriatim/i })).toBeVisible();
  const attractors = main.getByRole('link', { name: /365 strange attractors/i });
  await expect(attractors).toHaveAttribute('href', /chaosofzen\.dev/);
});

test('the legal pages are reachable and not placeholders', async ({ page }) => {
  for (const path of ['/eula', '/privacy']) {
    await page.goto(path);
    const text = await page.locator('main').innerText();
    expect(text.length).toBeGreaterThan(500);
    expect(text).not.toMatch(/lorem|TODO|TBD|Vibrai/i);
  }
});

// The nav is the only route to Ekphrasis from most of the site, and the
// homepage card is the only one from the landing page. Both are one deleted
// line away from a site that builds, type-checks and tests clean while the
// second product is unreachable by anything but a typed url.
test('the nav offers both products on every page', async ({ page }) => {
  for (const path of ['/', '/seriatim/download', '/ekphrasis/manual', '/eula']) {
    await page.goto(path);
    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Seriatim', exact: true }), path)
      .toHaveAttribute('href', '/seriatim');
    await expect(nav.getByRole('link', { name: 'Ekphrasis', exact: true }), path)
      .toHaveAttribute('href', '/ekphrasis');
  }
});

test('the landing page cards link to both products', async ({ page }) => {
  await page.goto('/');
  const main = page.locator('main');
  await expect(main.getByRole('link', { name: /^seriatim/i })).toHaveAttribute('href', '/seriatim');
  await expect(main.getByRole('link', { name: /^ekphrasis/i })).toHaveAttribute('href', '/ekphrasis');
});
