// POST /api/contact en Vercel: se ejecuta como función (no se pre-renderiza). La lógica está en src/lib/contact-handler.ts.
import type { APIRoute } from 'astro';
import { handleContact } from '../../lib/contact-handler';

export const prerender = false;

export const POST: APIRoute = ({ request, clientAddress }) =>
  handleContact(
    request,
    {
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
      CONTACT_TO: process.env.CONTACT_TO ?? '',
      CONTACT_TO_CO: process.env.CONTACT_TO_CO,
      CONTACT_FROM: process.env.CONTACT_FROM ?? '',
      TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY ?? '',
      CONTACT_DRY_RUN: process.env.CONTACT_DRY_RUN,
    },
    clientAddress ?? null,
  );
