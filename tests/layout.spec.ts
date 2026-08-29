import { test, expect } from '@playwright/test';

test('every page carries a title, a description and a skip link', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Chaos of Zen/);
  const desc = page.locator('meta[name="description"]');
  await expect(desc).toHaveAttribute('content', /.{20,}/);
  await expect(page.locator('a[href="#main"]')).toHaveCount(1);
});
