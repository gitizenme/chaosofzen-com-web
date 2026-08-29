import { test, expect } from '@playwright/test';

test('the product page states what it is and links to the download', async ({ page }) => {
  await page.goto('/seriatim');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seriatim');
  await expect(page.getByRole('link', { name: /download/i })).toBeVisible();
  // This video has no autoplay, so it never needs muted -- that attribute
  // exists only to satisfy browser autoplay policy. A visitor presses play
  // and hears the demo, which is the entire point of putting it on this page.
  const video = page.locator('video').first();
  await expect(video).not.toHaveAttribute('autoplay', /.*/);
  await expect(video).not.toHaveAttribute('muted', /.*/);
  await expect(video).toHaveAttribute('controls', /.*/);
});
