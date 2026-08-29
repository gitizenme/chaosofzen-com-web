import { test, expect } from '@playwright/test';

test('shows the version when the manifest resolves', async ({ page }) => {
  await page.route('**/latest.json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: '1.5.0',
      url: 'https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg',
      sha256: 'b'.repeat(64),
      notes_url: 'https://chaosofzen.com/seriatim/changelog#v1-5-0',
      min_macos: '11.0',
      size_bytes: 29123456,
    }),
  }));
  await page.goto('/seriatim/download');
  await expect(page.getByTestId('version-badge')).toContainText('1.5.0');
  await expect(page.getByTestId('version-badge')).toContainText('29.1 MB');
});

test('the download button still works when the manifest 500s', async ({ page }) => {
  // This is the case that matters. A dead manifest must not take the
  // download with it.
  await page.route('**/latest.json', route => route.fulfill({ status: 500, body: '' }));
  await page.goto('/seriatim/download');
  await expect(page.getByTestId('version-badge')).toBeHidden();
  await expect(page.getByTestId('download-button')).toBeVisible();
});
