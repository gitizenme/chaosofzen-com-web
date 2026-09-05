import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/seriatim', '/seriatim/download', '/seriatim/thanks',
                '/seriatim/manual', '/seriatim/changelog',
                '/ekphrasis', '/ekphrasis/download', '/ekphrasis/thanks',
                '/ekphrasis/manual', '/ekphrasis/changelog',
                '/eula', '/privacy'];

for (const path of PAGES) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
