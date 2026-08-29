import { test, expect } from '@playwright/test';

test('the thank-you page offers the download without needing another click path', async ({ page }) => {
  await page.goto('/seriatim/thanks');
  const link = page.getByTestId('thanks-download');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', /Seriatim-latest\.dmg$/);
});
