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
