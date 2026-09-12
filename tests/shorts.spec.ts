import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The entries the built site was produced from. Read from disk rather than
// fixed here so this spec stays true as the pipeline adds entries: the count
// on the page must equal the count on disk, whatever that is.
const DIR = join(process.cwd(), 'src/content/shorts');
const entries = readdirSync(DIR)
  .filter(f => f.endsWith('.md'))
  .map(f => readFileSync(join(DIR, f), 'utf8'))
  .filter(text => /^product:\s*['"]?seriatim['"]?\s*$/m.test(text));
const cutCount = entries.reduce((n, text) => n + (text.match(/^\s+(landscape|vertical):\s*$/mg)?.length ?? 0), 0);

test('the shorts section is absent when there are no entries, and lists every entry when there are', async ({ page }) => {
  await page.goto('/seriatim');
  const section = page.locator('section[aria-labelledby="shorts"]');
  if (entries.length === 0) {
    await expect(section).toHaveCount(0);
    return;
  }
  await expect(section).toHaveCount(1);
  await expect(section.getByRole('heading', { level: 2, name: 'Shorts' })).toBeVisible();
  await expect(section.locator('li')).toHaveCount(entries.length);
  await expect(section.locator('video')).toHaveCount(cutCount);
});

test('every short obeys the video policy and is served from media.chaosofzen.com', async ({ page }) => {
  test.skip(entries.length === 0, 'no entries committed yet');
  await page.goto('/seriatim');
  const videos = page.locator('section[aria-labelledby="shorts"] video');
  const n = await videos.count();
  for (let i = 0; i < n; i++) {
    const v = videos.nth(i);
    await expect(v).toHaveAttribute('controls', /.*/);
    await expect(v).toHaveAttribute('playsinline', /.*/);
    await expect(v).toHaveAttribute('preload', 'none');
    await expect(v).toHaveAttribute('poster', /^https:\/\/media\.chaosofzen\.com\/social\//);
    await expect(v).not.toHaveAttribute('autoplay', /.*/);
    await expect(v).not.toHaveAttribute('muted', /.*/);
    await expect(v.locator('source')).toHaveAttribute('src', /^https:\/\/media\.chaosofzen\.com\/social\/.+\.mp4$/);
    // Shape on screen, not class names: a landscape cut is wider than tall, a
    // vertical cut taller than wide. Both are asserted from the box the
    // browser actually laid out.
    const width = Number(await v.getAttribute('width'));
    const height = Number(await v.getAttribute('height'));
    const box = await v.boundingBox();
    expect(box, 'video is laid out').not.toBeNull();
    if (width > height) expect(box!.width).toBeGreaterThan(box!.height);
    else expect(box!.height).toBeGreaterThan(box!.width);
  }
});
