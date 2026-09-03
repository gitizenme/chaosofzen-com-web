import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { PRODUCT_SLUGS } from './lib/changelog';

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/changelog' }),
  schema: z.object({
    // Same list entriesFor's slug parameter accepts (src/lib/changelog.ts) --
    // one definition, so the schema and the helper cannot drift apart.
    product: z.enum(PRODUCT_SLUGS),
    version: z.string(),
    title: z.string(),
    date: z.string(),
  }),
});

export const collections = { changelog };
