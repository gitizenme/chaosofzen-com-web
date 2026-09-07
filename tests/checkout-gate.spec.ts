import { test, expect, type Page, type Request } from '@playwright/test';

// The page-level replacement for scripts/check-products.mjs, the pre-build
// guard that refused to build the site at all while a variantId was the
// placeholder -- which stopped every deploy, Seriatim's included, over a page
// that can simply decline to render a checkout.
//
// The invariant that guard existed for, stated exactly:
//
//   No page may render a purchase control or a checkout url for a product
//   whose variantId is the placeholder.
//
// These assertions run against the BUILT OUTPUT: playwright.config.ts's
// webServer is `astro preview`, which serves dist/. What ships is what is
// graded.
//
// The literals below are written out rather than imported from
// src/lib/products. Importing them would make this suite agree with the pages
// BY CONSTRUCTION -- a mutation of the record would move both sides together
// and nothing here would fail.
const LS_HOST = 'store.chaosofzen.com';
const SERIATIM_VARIANT_ID = 'f623b2eb-4777-407c-aee4-a5f118e609b1';
const EKPHRASIS_VARIANT_ID = '70d8c1fb-f893-4379-abe9-b23eb7680801';
const EKPHRASIS_DMG = 'https://dl.chaosofzen.dev/ekphrasis/Ekphrasis-latest.dmg';
const SERIATIM_DMG = 'https://dl.chaosofzen.dev/seriatim/Seriatim-latest.dmg';

// Every page that renders anything about Ekphrasis, not just the two that
// carry the gate. A checkout control appearing on /ekphrasis or
// /ekphrasis/manual would satisfy a suite that only looked at /download.
const EKPHRASIS_PAGES = [
  '/ekphrasis',
  '/ekphrasis/download',
  '/ekphrasis/changelog',
  '/ekphrasis/manual',
  '/ekphrasis/thanks',
];

// A NOTE ON WHAT CANNOT BE ASSERTED FROM THE HTML ALONE.
//
// `grep '/checkout/buy/' dist/**/*.html` finds nothing on ANY page of this
// site -- including /seriatim/download, which has a working checkout. The url
// is built at runtime by checkoutUrl(), so a string search for it scores zero
// against the shipping implementation and zero against a broken one: it would
// pass no matter what, which is the exact shape of assertion this project has
// been bitten by.
//
// So "renders a checkout url" is measured the only way that distinguishes the
// two: drive the page and watch where it tries to navigate. The structural
// checks below (no form, no button) say the control is absent; the network
// checks say nothing reaches Lemon Squeezy even so.

/** Record every url the page attempts, including ones it navigates to. */
function recordTraffic(page: Page) {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (r: Request) => requests.push(r.url()));
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { requests, errors };
}

// 0.1.0 shipped, so the gate is open and these assertions inverted. What they
// were really protecting survives unchanged: the control appears on the
// download page and NOWHERE ELSE, and no Ekphrasis page ever reaches
// Seriatim's dmg. A copy-paste of Seriatim's page into Ekphrasis still fails
// here -- now on the variant id rather than on the control's absence.
test('the purchase control appears on the Ekphrasis download page and no other', async ({ page }) => {
  for (const path of EKPHRASIS_PAGES) {
    await page.goto(path);
    const main = page.locator('main');
    const isDownload = path === '/ekphrasis/download';
    const expected = isDownload ? 1 : 0;

    await expect(main.getByTestId('price-form'), path).toHaveCount(expected);
    await expect(main.getByTestId('price-input'), path).toHaveCount(expected);
    await expect(main.getByTestId('download-button'), path).toHaveCount(expected);

    // Seriatim's dmg must never appear on an Ekphrasis page, released or not.
    // This is the copy-paste this suite exists to catch and it does not relax.
    await expect(page.locator(`a[href="${SERIATIM_DMG}"]`), path).toHaveCount(0);
  }
});

test('the Ekphrasis download page reaches its OWN checkout, and raises no error doing it', async ({ page }) => {
  // The download page's client script still ships -- Astro bundles a hoisted
  // <script> whether or not its elements rendered -- so this also covers the
  // guard that replaced its non-null assertions. `querySelector(...)!` erases
  // to a plain querySelector, so with the form gone the very next line threw
  // an uncaught TypeError during module evaluation, on every single load. A
  // page that errors while otherwise looking correct is how the next real
  // error gets ignored, so `errors` collects both channels: uncaught
  // exceptions (pageerror) and console errors.
  // VersionBadge fetches the live manifest host cross-origin, and the browser
  // logs a CORS error for it on every load of the download page. That noise is
  // unrelated to this test and would drown the signal it is looking for, so
  // the fetch is answered here. Stubbing it does not weaken anything below:
  // what is being watched for is an error raised by the page's OWN code.
  await page.route('**/dl.chaosofzen.dev/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  let checkout = '';
  await page.route(`**/${LS_HOST}/**`, route => {
    checkout = route.request().url();
    route.fulfill({ status: 200, contentType: 'text/html', body: '<p>checkout</p>' });
  });

  const { requests, errors } = recordTraffic(page);

  await page.goto('/ekphrasis/download');
  await page.getByTestId('price-input').fill('15');
  await page.getByTestId('download-button').click();

  // Its own variant, never Seriatim's. Asserted on the full url rather than
  // "contains the uuid", so a prefixed value -- /checkout/buy/buy/<uuid>, what
  // the store hands you when you copy the link -- fails here too.
  await expect.poll(() => checkout).toBe(
    `https://${LS_HOST}/checkout/buy/${EKPHRASIS_VARIANT_ID}`
  );
  expect(
    requests.filter(u => u.includes(SERIATIM_VARIANT_ID)),
    'reached Seriatim’s checkout',
  ).toEqual([]);

  // The error channels stay watched. The download page's client script guards
  // its querySelector calls, and a page that throws while otherwise looking
  // correct is how the next real error gets ignored.
  expect(errors, 'page errors').toEqual([]);
});

// THE OTHER DIRECTION. Everything above passes on a page that renders nothing
// at all, so on its own it cannot tell a working gate from a broken page. This
// is the same suite pointed at the product whose variantId is real: it must
// find the control, and following it must land on that product's checkout.
//
// Together the two say the assertions measure the gate rather than the
// absence of markup -- flipping Ekphrasis's variantId to a real uuid turns
// the tests above red, and this one is what they turn red INTO.
test('the Seriatim download page, whose product exists, still renders its control and its checkout', async ({ page }) => {
  let checkout = '';
  await page.route(`**/${LS_HOST}/**`, route => {
    checkout = route.request().url();
    route.fulfill({ status: 200, contentType: 'text/html', body: '<p>checkout</p>' });
  });

  await page.goto('/seriatim/download');
  await expect(page.getByTestId('price-form')).toHaveCount(1);
  await expect(page.getByTestId('price-input')).toBeVisible();
  await expect(page.getByTestId('download-button')).toBeVisible();

  await page.getByTestId('price-input').fill('15');
  await page.getByTestId('download-button').click();

  await expect.poll(() => checkout).toBe(
    `https://${LS_HOST}/checkout/buy/${SERIATIM_VARIANT_ID}`
  );
});
