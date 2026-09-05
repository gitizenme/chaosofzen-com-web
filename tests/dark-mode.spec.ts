import { test, expect } from '@playwright/test';

test('the download button has a visible fill', async ({ page }) => {
  await page.goto('/seriatim/download');
  const btn = page.getByTestId('download-button');
  const bg = await btn.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).not.toBe('transparent');
});
