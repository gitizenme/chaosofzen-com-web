import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Shorts from './Shorts.astro';
import type { ShortData } from '../lib/shorts';

const landscape = {
  url: 'https://media.chaosofzen.com/social/2026-09-11-s01-generative-engine/render-horizontal.mp4',
  poster: 'https://media.chaosofzen.com/social/2026-09-11-s01-generative-engine/poster-landscape.jpg',
  width: 1920, height: 1080,
};
const vertical = {
  url: 'https://media.chaosofzen.com/social/2026-09-11-s02-two-instances/render-vertical.mp4',
  poster: 'https://media.chaosofzen.com/social/2026-09-11-s02-two-instances/poster-vertical.jpg',
  width: 1080, height: 1920,
};
const s01: { data: ShortData } = { data: {
  product: 'seriatim', asset_id: '2026-09-11-s01-generative-engine', episode: 'S01',
  title: 'Seriatim — music that does not repeat', hook: 'Four voices, seven series each.',
  date: '2026-09-11', media: { landscape },
} };
const s02: { data: ShortData } = { data: {
  product: 'seriatim', asset_id: '2026-09-11-s02-two-instances', episode: 'S02',
  title: 'Seriatim — two instances, nothing repeats', hook: 'Four instances playing.',
  date: '2026-09-11', media: { vertical },
} };
const both: { data: ShortData } = { data: { ...s01.data, asset_id: '2026-09-11-s03-both', media: { landscape, vertical } } };

async function render(entries: { data: ShortData }[]) {
  const container = await AstroContainer.create();
  return container.renderToString(Shorts, { props: { entries } });
}
const videos = (html: string) => html.match(/<video\b[^>]*>/g) ?? [];

describe('Shorts', () => {
  it('renders nothing at all for no entries', async () => {
    expect((await render([])).trim()).toBe('');
  });

  it('renders one item per entry, in the order given, with title and hook', async () => {
    const html = await render([s02, s01]);
    expect(html.match(/<li\b/g)).toHaveLength(2);
    expect(html.indexOf(s02.data.title)).toBeLessThan(html.indexOf(s01.data.title));
    expect(html).toContain(s01.data.hook);
    expect(html).toContain('<h2 id="shorts">Shorts</h2>');
    expect(html).toContain('aria-labelledby="shorts"');
  });

  // The whole video policy, per tag: a visitor presses play and hears it,
  // and nothing downloads until they do.
  it('gives every video controls, playsinline, preload=none and a poster, and never autoplay or muted', async () => {
    const html = await render([both]);
    const tags = videos(html);
    expect(tags).toHaveLength(2);
    for (const tag of tags) {
      expect(tag).toMatch(/\bcontrols\b/);
      expect(tag).toMatch(/\bplaysinline\b/);
      expect(tag).toMatch(/preload="none"/);
      expect(tag).toMatch(/poster="https:\/\/media\.chaosofzen\.com\/social\//);
      expect(tag).not.toMatch(/\bautoplay\b/);
      expect(tag).not.toMatch(/\bmuted\b/);
    }
    expect(html.match(/<source src="https:\/\/media\.chaosofzen\.com\/social\/[^"]+\.mp4" type="video\/mp4"/g)).toHaveLength(2);
  });

  it('renders landscape before vertical, each with its own dimensions', async () => {
    const html = await render([both]);
    const [first, second] = videos(html);
    expect(first).toMatch(/width="1920"/);
    expect(first).toMatch(/height="1080"/);
    expect(second).toMatch(/width="1080"/);
    expect(second).toMatch(/height="1920"/);
    expect(html.indexOf(landscape.url)).toBeLessThan(html.indexOf(vertical.url));
  });

  it('renders only the cut an entry has', async () => {
    expect(videos(await render([s01]))).toHaveLength(1);
    expect(await render([s01])).toContain(landscape.url);
    expect(await render([s02])).toContain(vertical.url);
    expect(await render([s02])).not.toContain(landscape.url);
  });

  it('marks the date and episode', async () => {
    const html = await render([s01]);
    expect(html).toContain('<time datetime="2026-09-11">');
    expect(html).toContain('S01');
  });
});
