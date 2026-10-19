import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { SECTOR_SLUGS } from './data/sectors';

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

// Guías (/guias): artículos para dueños de negocios locales, agrupados por sector (ver src/data/sectors.ts).
const guias = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guias' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Slug de un sector de src/data/sectors.ts. */
    sector: z.enum(SECTOR_SLUGS as [string, ...string[]]),
    /** Fechas en formato AAAA-MM-DD. */
    published: z.string(),
    updated: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { legal, legalCo, guias };
