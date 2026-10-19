// Los sectores de /guias son los de src/data/sectors.ts: cada guía lleva en `sector` el slug de uno de ellos.
import type { CollectionEntry } from 'astro:content';
import { SECTORS as SECTOR_LIST } from './sectors';

export const SECTORS = Object.fromEntries(
  SECTOR_LIST.map((s) => [s.slug, { label: s.label, intro: s.guidesIntro, noun: s.noun }]),
) as Record<string, { label: string; intro: string; noun: string }>;

export type Sector = string;
export type Guia = CollectionEntry<'guias'>;

const dateFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "2026-10-18" → "18 de octubre de 2026". */
export const formatDate = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));

/** Minutos de lectura a 200 palabras por minuto. */
export const readingTime = (body = '') => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

/** Más recientes primero. */
export const byDate = (a: Guia, b: Guia) => b.data.published.localeCompare(a.data.published);
