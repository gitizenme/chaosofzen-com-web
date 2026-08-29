import { test, expect } from '@playwright/test';

test('the product page states what it is and links to the download', async ({ page }) => {
  await page.goto('/seriatim');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seriatim');
  await expect(page.getByRole('link', { name: /download/i })).toBeVisible();
  // A silent autoplaying video is fine; one with sound is not.
  const video = page.locator('video').first();
  await expect(video).toHaveAttribute('muted', /.*/);
  await expect(video).toHaveAttribute('controls', /.*/);
});
