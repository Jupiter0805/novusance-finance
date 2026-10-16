/**
 * POST /api/contact
 *
 * Recibe el formulario de contacto, lo valida, verifica Turnstile y envía un email con Resend.
 * No guarda los datos en ninguna base de datos y no escribe datos personales en los logs.
 *
 * - Con `Accept: application/json` (envío con fetch) responde { ok: true } o { ok: false, error }.
 * - Sin JS (envío normal del formulario) redirige a /<país>?enviado=1#contacto o /<país>?error=<código>#contacto.
 * - El campo oculto "pais" (es | co) decide a quién llega el email: CONTACT_TO o, para Colombia, CONTACT_TO_CO.
 */
import { readContact, validateContact, type ContactInput } from '../../src/lib/contact-validation';

interface Env {
  RESEND_API_KEY: string;
  CONTACT_TO: string;
  /** Destinatario(s) de las solicitudes de Colombia. Si no está, van a CONTACT_TO. */
  CONTACT_TO_CO?: string;
  CONTACT_FROM: string;
  TURNSTILE_SECRET_KEY: string;
  /** Solo para pruebas en local: "1" valida todo pero no envía el email. Nunca en producción. */
  CONTACT_DRY_RUN?: string;
}

type Country = 'es' | 'co';

type ErrorCode = 'validation' | 'turnstile' | 'bad_request' | 'too_large' | 'config' | 'send';

const MAX_BODY_BYTES = 32 * 1024;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const wantsJson = (request.headers.get('Accept') ?? '').includes('application/json');

  // Hasta leer el formulario no se sabe el país; mientras, las respuestas sin JS vuelven a España.
  let country: Country = 'es';
  const fail = (status: number, error: ErrorCode, extra: Record<string, unknown> = {}) =>
    wantsJson ? json(status, { ok: false, error, ...extra }) : redirect(request, `/${country}?error=${error}#contacto`);
  const done = () => (wantsJson ? json(200, { ok: true }) : redirect(request, `/${country}?enviado=1#contacto`));

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM || !env.TURNSTILE_SECRET_KEY) {
    console.error('[contact] Faltan variables de entorno');
    return fail(500, 'config');
  }

  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BODY_BYTES) return fail(413, 'too_large');

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return fail(400, 'bad_request');
  }

  country = data.get('pais') === 'co' ? 'co' : 'es';

  // Campo trampa relleno: es un bot. Respondemos como si todo fuera bien y no enviamos nada.
  const honeypot = data.get('website');
  if (typeof honeypot === 'string' && honeypot.trim() !== '') return done();

  const input = readContact(data);
  const fields = validateContact(input);
  if (Object.keys(fields).length > 0) return fail(400, 'validation', { fields });

  const token = data.get('cf-turnstile-response');
  if (typeof token !== 'string' || token === '' || token.length > 2048) return fail(403, 'turnstile');

  const human = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP'));
  if (!human) return fail(403, 'turnstile');

  if (env.CONTACT_DRY_RUN === '1') {
    console.log('[contact] Modo prueba: email no enviado');
    return done();
  }

  const sent = await sendEmail(env, input, country);
  if (!sent) return fail(502, 'send');

  return done();
};

async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<boolean> {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const result = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!result.success) console.warn('[contact] Turnstile rechazado', result['error-codes'] ?? []);
    return result.success === true;
  } catch {
    console.error('[contact] Error al verificar Turnstile');
    return false;
  }
}

async function sendEmail(env: Env, c: ContactInput, country: Country): Promise<boolean> {
  const to = country === 'co' && env.CONTACT_TO_CO ? env.CONTACT_TO_CO : env.CONTACT_TO;
  const rows: Array<[string, string]> = [
    ['País', country === 'co' ? 'Colombia' : 'España'],
    ['Nombre', c.nombre],
    ['Clínica', c.clinica],
    ['Email', c.email],
    ['Teléfono', c.telefono || '(no indicado)'],
    ['Mensaje', c.mensaje || '(sin mensaje)'],
  ];

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n\n');
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111413">
<h2 style="font-size:18px;margin:0 0 16px">Nueva solicitud de propuesta</h2>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;vertical-align:top;color:#525854;white-space:nowrap">${k}</td><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
    )
    .join('')}</table>
<p style="margin:20px 0 0;font-size:13px;color:#525854">Enviado desde el formulario de novusance.com. Responde a este email para contestar directamente.</p>
</div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        reply_to: c.email,
        subject: `Solicitud de propuesta (${country.toUpperCase()}): ${oneLine(c.clinica)}`,
        text,
        html,
      }),
    });
    if (!res.ok) {
      // Solo el código de estado: la respuesta de Resend puede incluir direcciones de email.
      console.error('[contact] Resend respondió', res.status);
      return false;
    }
    return true;
  } catch {
    console.error('[contact] Error de red al llamar a Resend');
    return false;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function redirect(request: Request, path: string): Response {
  return Response.redirect(new URL(path, request.url).toString(), 303);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

function oneLine(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').slice(0, 120);
}
