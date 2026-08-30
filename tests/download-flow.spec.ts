import { test, expect } from '@playwright/test';

test('typing 0 goes straight to the file, with no checkout', async ({ page }) => {
  let checkoutHit = false;
  await page.route('**/store.chaosofzen.com/**', route => { checkoutHit = true; route.abort(); });
  const downloads: string[] = [];
  await page.route('**/Seriatim-latest.dmg', route => {
    downloads.push(route.request().url());
    route.fulfill({ status: 200, body: 'dmg' });
  });

  await page.goto('/seriatim/download');
  await page.getByTestId('price-input').fill('0');
  await page.getByTestId('download-button').click();

  await expect.poll(() => downloads.length).toBe(1);
  expect(checkoutHit).toBe(false);
});

test('an empty field also downloads free', async ({ page }) => {
  const downloads: string[] = [];
  await page.route('**/Seriatim-latest.dmg', route => {
    downloads.push(route.request().url());
    route.fulfill({ status: 200, body: 'dmg' });
  });
  await page.goto('/seriatim/download');
  await page.getByTestId('price-input').fill('');
  await page.getByTestId('download-button').click();
  await expect.poll(() => downloads.length).toBe(1);
});

test('a positive amount routes to checkout, with no download and no price attached', async ({ page }) => {
  // Lemon Squeezy silently ignores a custom_price query parameter on a
  // buy-link (confirmed live, 2026-08-30) -- the amount the customer typed
  // here isn't sent anywhere; they re-enter it on Lemon Squeezy's own
  // Pay-What-You-Want price field. This test only proves we route to the
  // plain checkout link and never fall through to a free download.
  let checkoutUrl = '';
  await page.route('**/store.chaosofzen.com/**', route => {
    checkoutUrl = route.request().url();
    route.fulfill({ status: 200, contentType: 'text/html', body: '<p>checkout</p>' });
  });
  let anyDownload = false;
  await page.route('**/Seriatim-latest.dmg', route => { anyDownload = true; route.abort(); });

  await page.goto('/seriatim/download');
  await page.getByTestId('price-input').fill('15');
  await page.getByTestId('download-button').click();
  await expect.poll(() => checkoutUrl).toContain('/checkout/buy/');
  expect(new URL(checkoutUrl).search).toBe('');
  expect(anyDownload).toBe(false);
});

test('an invalid amount shows an error and downloads nothing', async ({ page }) => {
  let anyDownload = false;
  await page.route('**/Seriatim-latest.dmg', route => { anyDownload = true; route.abort(); });
  await page.goto('/seriatim/download');
  await page.getByTestId('price-input').fill('-5');
  await page.getByTestId('download-button').click();
  await expect(page.getByTestId('price-error')).toBeVisible();
  expect(anyDownload).toBe(false);
});
