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

test('a positive amount routes through checkout with the price attached', async ({ page }) => {
  let checkoutUrl = '';
  await page.route('**/store.chaosofzen.com/**', route => {
    checkoutUrl = route.request().url();
    route.fulfill({ status: 200, contentType: 'text/html', body: '<p>checkout</p>' });
  });
  await page.goto('/seriatim/download');
  await page.getByTestId('price-input').fill('15');
  await page.getByTestId('download-button').click();
  await expect.poll(() => checkoutUrl).toContain('custom_price');
  expect(new URL(checkoutUrl).searchParams.get('checkout[custom_price]')).toBe('1500');
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
