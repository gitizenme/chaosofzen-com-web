import { test, expect } from '@playwright/test';

// The urls and the placeholder id are written out as literals on purpose.
// Importing them from src/lib/products would make this suite agree with the
// pages BY CONSTRUCTION -- a mutation of the record would move both sides
// together and nothing here would fail. An independent copy of the expected
// values is the whole value of an end-to-end oracle.
const EKPHRASIS_DMG = 'https://dl.chaosofzen.dev/ekphrasis/Ekphrasis-latest.dmg';
const EKPHRASIS_MANIFEST = 'https://dl.chaosofzen.dev/ekphrasis/latest.json';
const SERIATIM_DMG = 'https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg';
const PLACEHOLDER_VARIANT_ID = 'PLACEHOLDER-NO-LEMON-SQUEEZY-PRODUCT-YET';

const EKPHRASIS_PAGES = [
  '/ekphrasis',
  '/ekphrasis/download',
  '/ekphrasis/changelog',
  '/ekphrasis/manual',
  '/ekphrasis/thanks',
];

test('every Ekphrasis route the sitemap advertises is actually served', async ({ page }) => {
  for (const path of EKPHRASIS_PAGES) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should be served`).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('the download page badge points at the Ekphrasis manifest, not Seriatim’s', async ({ page }) => {
  await page.goto('/ekphrasis/download');
  // The badge renders hidden until its fetch resolves, so this reads the
  // attribute the component was given rather than waiting for visibility.
  await expect(page.getByTestId('version-badge')).toHaveAttribute(
    'data-manifest-url',
    EKPHRASIS_MANIFEST
  );
});

test('zero goes to the Ekphrasis dmg, never Seriatim’s, and never to checkout', async ({ page }) => {
  const downloads: string[] = [];
  await page.route('**/*.dmg', route => {
    downloads.push(route.request().url());
    route.fulfill({ status: 200, body: 'dmg' });
  });
  let checkoutHit = false;
  await page.route('**/store.chaosofzen.com/**', route => { checkoutHit = true; route.abort(); });

  await page.goto('/ekphrasis/download');
  await page.getByTestId('price-input').fill('0');
  await page.getByTestId('download-button').click();

  await expect.poll(() => downloads.length).toBe(1);
  expect(downloads[0]).toBe(EKPHRASIS_DMG);
  expect(checkoutHit).toBe(false);
});

test('a positive amount routes to the checkout wired to the placeholder, and downloads nothing', async ({ page }) => {
  // Asserting the PLACEHOLDER, not merely "some checkout": until
  // gitizenme/ekphrasis#28 exists, a real-looking UUID here would be a
  // checkout that takes money for a product with no file behind it. This
  // failing is the correct outcome of filling that UUID in, and points
  // whoever does it at this page's copy.
  let checkout = '';
  await page.route('**/store.chaosofzen.com/**', route => {
    checkout = route.request().url();
    route.fulfill({ status: 200, contentType: 'text/html', body: '<p>checkout</p>' });
  });
  let anyDownload = false;
  await page.route('**/*.dmg', route => { anyDownload = true; route.abort(); });

  await page.goto('/ekphrasis/download');
  await page.getByTestId('price-input').fill('15');
  await page.getByTestId('download-button').click();

  await expect.poll(() => checkout).toContain(`/checkout/buy/${PLACEHOLDER_VARIANT_ID}`);
  expect(anyDownload).toBe(false);
});

test('the thank-you page auto-starts the Ekphrasis dmg, never Seriatim’s', async ({ page }) => {
  const downloads: string[] = [];
  await page.route('**/*.dmg', route => {
    downloads.push(route.request().url());
    route.fulfill({ status: 200, body: 'dmg' });
  });

  await page.goto('/ekphrasis/thanks');
  await expect(page.getByTestId('thanks-download')).toHaveAttribute('href', EKPHRASIS_DMG);
  await expect(page.locator(`a[href="${SERIATIM_DMG}"]`)).toHaveCount(0);

  await expect.poll(() => downloads.length, { timeout: 5000 }).toBe(1);
  expect(downloads[0]).toBe(EKPHRASIS_DMG);
});
