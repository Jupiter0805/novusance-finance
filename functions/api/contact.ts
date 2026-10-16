/**
 * POST /api/contact en Cloudflare Pages. La lógica está en src/lib/contact-handler.ts.
 * (La web se sirve hoy desde Vercel, que usa src/pages/api/contact.ts.)
 */
import { handleContact, type ContactEnv } from '../../src/lib/contact-handler';

export const onRequestPost: PagesFunction<ContactEnv> = ({ request, env }) =>
  handleContact(request, env, request.headers.get('CF-Connecting-IP'));
