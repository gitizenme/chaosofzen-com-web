// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://chaosofzen.com',
  integrations: [sitemap()],

  // Fonts are downloaded at build time and served from this origin. That is not
  // only a performance choice: /privacy says this site "sets no cookies and
  // performs no cross-site tracking -- there is nothing here for a consent
  // banner to disclose", and hotlinking Google Fonts would send every visitor's
  // IP to Google on every page load, which that sentence does not cover.
  //
  // Weights are listed deliberately; Astro fetches only what is named here.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Newsreader',
      cssVariable: '--font-display',
      weights: [300, 400],
      subsets: ['latin'],
      fallbacks: ['Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-body',
      weights: [400, 600],
      styles: ['normal', 'italic'],   // the manual uses <em>
      subsets: ['latin'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-code',
      weights: [400],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'monospace'],
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
