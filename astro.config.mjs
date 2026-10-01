// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://www.novusance.com',
  output: 'static',
  // Cloudflare Pages sirve /aviso-legal desde aviso-legal.html sin barra final.
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [icon(), sitemap({ filter: (page) => !page.includes('/404') })],
});
