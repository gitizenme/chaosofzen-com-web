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

// Until there is a checkout, nobody can have arrived at the thank-you page from
// a purchase, and the dmg it used to auto-navigate to does not exist -- so the
// page must not navigate anywhere. This is the assertion that has to change the
// day gitizenme/ekphrasis#28 lands, and its replacement is the one above it in
// git history: auto-starts, and to the Ekphrasis dmg rather than Seriatim's.
test('the thank-you page starts no download while there is nothing to have bought', async ({ page }) => {
  const downloads: string[] = [];
  await page.route('**/*.dmg', route => {
    downloads.push(route.request().url());
    route.fulfill({ status: 200, body: 'dmg' });
  });

  await page.goto('/ekphrasis/thanks');
  await expect(page.getByTestId('thanks-unreleased')).toBeVisible();
  await expect(page.getByTestId('thanks-download')).toHaveCount(0);
  await expect(page.locator(`a[href="${SERIATIM_DMG}"]`)).toHaveCount(0);
  await expect(page.locator(`a[href="${EKPHRASIS_DMG}"]`)).toHaveCount(0);

  // The auto-start it used to do fired at 1200ms. Wait past that, then assert
  // the page is still the page.
  await page.waitForTimeout(2500);
  expect(downloads).toEqual([]);
  expect(new URL(page.url()).pathname.replace(/\/$/, '')).toBe('/ekphrasis/thanks');
});

// Every one of the five pages is in the sitemap, so search lands people
// directly on any of them. Three of them used to read as documentation for a
// shipping product: the manual said "Open the downloaded .dmg", the thank-you
// page said "your download should start in a moment", and the changelog said
// nothing either way. One sentence, checked verbatim on all five, so deleting
// it from any one of them fails here.
test('every Ekphrasis page states the release status', async ({ page }) => {
  for (const path of EKPHRASIS_PAGES) {
    await page.goto(path);
    const body = await page.locator('main').innerText();
    expect(body, path).toContain('Ekphrasis is not released yet.');
  }
});

test('the download page metadata does not promise a product that does not exist', async ({ page }) => {
  // What a search result and a social card render. The page body was already
  // scrupulous; these two strings were not.
  await page.goto('/ekphrasis/download');
  await expect(page.locator('meta[name="description"]'))
    .toHaveAttribute('content', /not released yet/i);
});
