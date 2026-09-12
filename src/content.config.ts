import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { PRODUCT_SLUGS } from './lib/products';

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/changelog' }),
  schema: z.object({
    // Same list entriesFor's slug parameter accepts, and the same list
    // PRODUCTS is keyed by (src/lib/products.ts) -- one definition, so the
    // schema, the helper and the record cannot drift apart.
    product: z.enum(PRODUCT_SLUGS),
    version: z.string(),
    title: z.string(),
    date: z.string(),
  }),
});

const cut = z.object({
  url: z.string().url(),
  poster: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

// One file per post kit, written by media-shorts-toolkit's `web publish` (a
// product's runbook Stage 5b; this schema is the toolkit README's "site
// contract") on a branch of this repo; the PR it opens is the
// publish gate. Media stays on R2 -- this site is fully static and the repo is
// not a media store.
const shorts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/shorts' }),
  schema: z.object({
    product: z.enum(PRODUCT_SLUGS),
    asset_id: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/),
    episode: z.string(),
    title: z.string(),
    hook: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    media: z
      .object({ landscape: cut.optional(), vertical: cut.optional() })
      .refine(m => Boolean(m.landscape || m.vertical), { message: 'a short needs at least one cut' }),
  }),
});

export const collections = { changelog, shorts };
