// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';

// Países en borrador (published: false en src/data/countries.ts): añade aquí su ruta para dejarlos fuera del sitemap.
/** @type {string[]} */
const DRAFT_PATHS = [];
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
  // URLs sin barra final: /es, /aviso-legal.
  trailingSlash: 'never',
  // Variables del formulario (src/pages/api/contact.ts). En local van en .env; en producción, en Vercel.
  env: {
    schema: {
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_TO_CO: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_FROM: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_DRY_RUN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  integrations: [icon(), sitemap({ filter: (page) => !page.includes('/404') && !isDraft(page) })],
});
