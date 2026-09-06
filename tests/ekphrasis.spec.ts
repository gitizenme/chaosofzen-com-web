import { test, expect } from '@playwright/test';

// The urls are written out as literals on purpose.
// Importing them from src/lib/products would make this suite agree with the
// pages BY CONSTRUCTION -- a mutation of the record would move both sides
// together and nothing here would fail. An independent copy of the expected
// values is the whole value of an end-to-end oracle.
const EKPHRASIS_DMG = 'https://dl.chaosofzen.dev/ekphrasis/Ekphrasis-latest.dmg';
const EKPHRASIS_MANIFEST = 'https://dl.chaosofzen.dev/ekphrasis/latest.json';
const SERIATIM_DMG = 'https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg';

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

// The two tests that stood here drove /ekphrasis/download's price form: one
// asserted that 0 fetched the Ekphrasis dmg, the other that a positive amount
// routed to a checkout wired to the PLACEHOLDER variant id. Both described a
// page that offered to sell, and hand over, a product that does not exist --
// they passed because the page did exactly that, guarded only by a build
// script that refused to build the whole site.
//
// The gate is on the page now (src/lib/products.ts's isPurchasable), so there
// is no form to drive. What those tests were really protecting -- that this
// page never reaches Seriatim's dmg or Seriatim's checkout by copy-paste --
// is asserted below and, from both directions, in tests/checkout-gate.spec.ts.
test('the download page’s free path reaches the Ekphrasis dmg, never Seriatim’s', async ({ page }) => {
  const reached: string[] = [];
  await page.route('**/*.dmg', route => {
    reached.push(route.request().url());
    route.fulfill({ status: 200, body: 'dmg' });
  });

  await page.goto('/ekphrasis/download');
  await expect(page.getByTestId('download-button')).toBeVisible();
  await expect(page.locator(`a[href="${SERIATIM_DMG}"]`)).toHaveCount(0);

  // Zero is the free path: it hands over the dmg directly rather than routing
  // to a checkout. Which dmg is the whole question -- the copy-paste this
  // suite exists to catch would serve Seriatim's.
  await page.getByTestId('price-input').fill('0');
  await page.getByTestId('download-button').click();

  await expect.poll(() => reached).toEqual([EKPHRASIS_DMG]);
});

// Until there is a checkout, nobody can have arrived at the thank-you page from
// a purchase, and the dmg it used to auto-navigate to does not exist -- so the
// page must not navigate anywhere. This is the assertion that has to change the
// day gitizenme/ekphrasis#28 lands, and its replacement is the one above it in
// git history: auto-starts, and to the Ekphrasis dmg rather than Seriatim's.
test('the thank-you page auto-starts the Ekphrasis dmg, not Seriatim’s', async ({ page }) => {
  const downloads: string[] = [];
  await page.route('**/*.dmg', route => {
    downloads.push(route.request().url());
    route.fulfill({ status: 200, body: 'dmg' });
  });

  await page.goto('/ekphrasis/thanks');
  await expect(page.getByTestId('thanks-download')).toBeVisible();
  await expect(page.locator(`a[href="${SERIATIM_DMG}"]`)).toHaveCount(0);

  // The auto-start fires at 1200ms. Wait past it, then assert what it fetched:
  // an assertion made before the timer would pass on a page that never starts
  // one at all.
  await expect.poll(() => downloads, { timeout: 5000 }).toEqual([EKPHRASIS_DMG]);
});

// Every one of the five pages is in the sitemap, so search lands people
// directly on any of them. Three of them used to read as documentation for a
// shipping product: the manual said "Open the downloaded .dmg", the thank-you
// page said "your download should start in a moment", and the changelog said
// nothing either way. One sentence, checked verbatim on all five, so deleting
// it from any one of them fails here.
// 0.1.0 shipped, so the sentence this used to require on all five pages is now
// FALSE and must appear on none of them. The hazard reverses with the release
// rather than disappearing: before, a page that failed to say "not released"
// oversold; now, a page that still says it undersells a product people can
// buy, and stale copy on a page nobody re-reads is exactly what survives a
// launch.
test('no Ekphrasis page still claims the product is unreleased', async ({ page }) => {
  for (const path of EKPHRASIS_PAGES) {
    await page.goto(path);
    const body = await page.locator('main').innerText();
    expect(body, path).not.toContain('not released yet');
    expect(body, path).not.toContain('nothing to buy');
  }
});

// The metadata is what a search result and a social card render, and it is the
// copy least likely to be re-read after a launch -- it is not visible on the
// page. It used to be required to say "not released yet"; now it must not, on
// any of the five, and must still describe the product rather than going blank.
test('no Ekphrasis page’s metadata still says the product is unreleased', async ({ page }) => {
  for (const path of EKPHRASIS_PAGES) {
    await page.goto(path);
    const description = page.locator('meta[name="description"]');
    await expect(description, path).toHaveAttribute('content', /\S/);
    await expect(description, path).not.toHaveAttribute('content', /not released yet/i);
  }
});
