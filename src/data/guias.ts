// Sectores de /guias. Para abrir uno nuevo (fisioterapia, odontología...): añádelo aquí y al enum `sector`
// de src/content.config.ts, y escribe sus artículos en src/content/guias/ con ese `sector`.
import type { CollectionEntry } from 'astro:content';

export const SECTORS = {
  veterinarias: {
    label: 'Clínicas veterinarias',
    intro: 'Qué buscan los dueños de mascotas antes de elegir clínica y cómo debe responder tu web.',
  },
} as const;

export type Sector = keyof typeof SECTORS;
export type Guia = CollectionEntry<'guias'>;

const dateFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "2026-10-18" → "18 de octubre de 2026". */
export const formatDate = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));

/** Minutos de lectura a 200 palabras por minuto. */
export const readingTime = (body = '') => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

/** Más recientes primero. */
export const byDate = (a: Guia, b: Guia) => b.data.published.localeCompare(a.data.published);
