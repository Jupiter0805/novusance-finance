// POST /api/contact: se ejecuta como función de Vercel (no se pre-renderiza). La lógica está en src/lib/contact-handler.ts.
import type { APIRoute } from 'astro';
import {
  CONTACT_DRY_RUN,
  CONTACT_FROM,
  CONTACT_TO,
  CONTACT_TO_CO,
  RESEND_API_KEY,
  TURNSTILE_SECRET_KEY,
} from 'astro:env/server';
import { handleContact } from '../../lib/contact-handler';

export const prerender = false;

export const POST: APIRoute = ({ request, clientAddress }) =>
  handleContact(
    request,
    {
      RESEND_API_KEY: RESEND_API_KEY ?? '',
      CONTACT_TO: CONTACT_TO ?? '',
      CONTACT_TO_CO,
      CONTACT_FROM: CONTACT_FROM ?? '',
      TURNSTILE_SECRET_KEY: TURNSTILE_SECRET_KEY ?? '',
      CONTACT_DRY_RUN,
    },
    clientAddress ?? null,
  );
