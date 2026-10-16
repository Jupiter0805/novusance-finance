// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';

// Países en borrador (published: false en src/data/countries.ts): fuera del sitemap.
// Al publicar Colombia, quita '/co' de aquí.
const DRAFT_PATHS = ['/co'];
/** @param {string} page */
const isDraft = (page) => {
  const path = new URL(page).pathname.replace(/\/$/, '');
  return DRAFT_PATHS.some((d) => path === d || path.startsWith(`${d}/`));
};

export default defineConfig({
  site: 'https://www.novusance.com',
  // Todo se pre-renderiza salvo /api/contact, que corre como función de Vercel.
  output: 'static',
  adapter: vercel(),
  // Cloudflare Pages sirve /aviso-legal desde aviso-legal.html sin barra final.
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [icon(), sitemap({ filter: (page) => !page.includes('/404') && !isDraft(page) })],
});
