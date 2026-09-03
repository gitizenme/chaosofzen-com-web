import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/changelog' }),
  schema: z.object({
    product: z.enum(['seriatim', 'ekphrasis']),
    version: z.string(),
    title: z.string(),
    date: z.string(),
  }),
});

export const collections = { changelog };
