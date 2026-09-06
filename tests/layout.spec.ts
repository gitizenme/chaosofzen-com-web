import { test, expect } from '@playwright/test';

test('every page carries a title, a description and a skip link', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Chaos of Zen/);
  const desc = page.locator('meta[name="description"]');
  await expect(desc).toHaveAttribute('content', /.{20,}/);
  await expect(page.locator('a[href="#main"]')).toHaveCount(1);
});

// "Report an issue" has to name one repository, and the footer derives it from
// the path. Nothing else checks that derivation, so pointing every product's
// footer at the other product's tracker -- or reverting the footer to the
// single hardcoded url it had before there was a second product -- is invisible
// to the rest of the suite.
const TRACKER = {
  seriatim: 'https://github.com/gitizenme/seriatim/issues',
  ekphrasis: 'https://github.com/gitizenme/ekphrasis/issues',
};

test('the footer issue tracker follows the product path', async ({ page }) => {
  const CASES: [string, string][] = [
    ['/seriatim', TRACKER.seriatim],
    ['/seriatim/download', TRACKER.seriatim],
    ['/seriatim/manual', TRACKER.seriatim],
    ['/ekphrasis', TRACKER.ekphrasis],
    ['/ekphrasis/download', TRACKER.ekphrasis],
    ['/ekphrasis/manual', TRACKER.ekphrasis],
  ];

  for (const [path, expected] of CASES) {
    await page.goto(path);
    const link = page.locator('footer').getByRole('link', { name: /report an issue/i });
    await expect(link, `footer tracker on ${path}`).toHaveAttribute('href', expected);
  }
});

// Both products ship, so a non-product page cannot pick one without sending
// half the reports to the wrong repository. It offers both instead.
//
// This replaces an earlier case asserting these pages kept Seriatim's tracker
// -- correct while Seriatim was the only released product, and recorded there
// precisely so that changing it would be a deliberate edit rather than a side
// effect. This is that edit.
test('a non-product page offers both trackers rather than guessing', async ({ page }) => {
  for (const path of ['/', '/eula', '/privacy']) {
    await page.goto(path);
    const footer = page.locator('footer');

    await expect(footer.getByRole('link', { name: 'Seriatim' }), path)
      .toHaveAttribute('href', TRACKER.seriatim);
    await expect(footer.getByRole('link', { name: 'Ekphrasis' }), path)
      .toHaveAttribute('href', TRACKER.ekphrasis);

    // And no single "Report an issue" link, which is what picking one looks
    // like -- so a revert to either hardcoded url fails here.
    await expect(footer.getByRole('link', { name: /report an issue/i }), path)
      .toHaveCount(0);
  }
});
