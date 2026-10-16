// POST /api/contact: se ejecuta como función de Vercel (no se pre-renderiza). La lógica está en src/lib/contact-handler.ts.
import type { APIRoute } from 'astro';
import {
  CONTACT_DRY_RUN,
  CONTACT_FROM,
  CONTACT_TO,
  CONTACT_TO_CO,
  RESEND_API_KEY,
  SUPABASE_SECRET_KEY,
  TURNSTILE_SECRET_KEY,
} from 'astro:env/server';
import { PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { handleContact } from '../../lib/contact-handler';

export const prerender = false;

export const POST: APIRoute = ({ request, clientAddress }) =>
  handleContact(
    request,
    {
      TURNSTILE_SECRET_KEY: TURNSTILE_SECRET_KEY ?? '',
      SUPABASE_URL: PUBLIC_SUPABASE_URL,
      SUPABASE_SECRET_KEY,
      RESEND_API_KEY,
      CONTACT_TO,
      CONTACT_TO_CO,
      CONTACT_FROM,
      CONTACT_DRY_RUN,
    },
    clientAddress ?? null,
  );
