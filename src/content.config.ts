import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const schema = z.object({
  title: z.string(),
  description: z.string(),
  updated: z.string(),
});

// Textos legales de España (/aviso-legal, /privacidad...).
const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' }),
  schema,
});

// Textos legales de Colombia (/co/aviso-legal, /co/privacidad...).
const legalCo = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal-co' }),
  schema,
});

export const collections = { legal, legalCo };
