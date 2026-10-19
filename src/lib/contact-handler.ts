/**
 * Lógica del formulario de contacto, independiente de la plataforma.
 * La usa el endpoint src/pages/api/contact.ts, que en Vercel corre como función.
 *
 * Recibe el formulario de contacto y lo valida. Antispam sin servicios externos: campo trampa oculto y tiempo mínimo
 * entre abrir la página y enviar (los bots rellenan y envían al instante). Si parece un bot, responde "ok" sin guardar.
 * Después:
 *   - lo guarda en la tabla `messages` de Supabase (si hay SUPABASE_SECRET_KEY), para verlo en el panel /admin;
 *   - y envía un aviso por email con Resend (si hay RESEND_API_KEY, CONTACT_TO y CONTACT_FROM).
 * Basta con que funcione uno de los dos. No escribe datos personales en los logs.
 *
 * - Con `Accept: application/json` (envío con fetch) responde { ok: true } o { ok: false, error }.
 * - Sin JS (envío normal del formulario) redirige a /<país>?enviado=1#contacto o /<país>?error=<código>#contacto.
 * - El campo oculto "pais" (es | co) decide a quién llega el email: CONTACT_TO o, para Colombia, CONTACT_TO_CO.
 */
import { readContact, validateContact, type ContactInput } from './contact-validation';
import { sectorBySlug, type Sector } from '../data/sectors';

export interface ContactEnv {
  /** Supabase: URL del proyecto y clave secreta (solo servidor) para guardar el mensaje. */
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  /** Email de aviso (opcional si se guardan en Supabase). */
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  /** Destinatario(s) de las solicitudes de Colombia. Si no está, van a CONTACT_TO. */
  CONTACT_TO_CO?: string;
  CONTACT_FROM?: string;
  /** Solo para pruebas en local: "1" valida todo pero no envía el email. Nunca en producción. */
  CONTACT_DRY_RUN?: string;
}

type Country = 'es' | 'co';

type ErrorCode = 'validation' | 'bad_request' | 'too_large' | 'config' | 'send';

/** Tiempo mínimo entre abrir la página y enviar el formulario. */
const MIN_FILL_MS = 3000;

const MAX_BODY_BYTES = 32 * 1024;

export async function handleContact(request: Request, env: ContactEnv): Promise<Response> {
  const wantsJson = (request.headers.get('Accept') ?? '').includes('application/json');

  // Hasta leer el formulario no se sabe el país; mientras, las respuestas sin JS vuelven a España.
  let country: Country = 'es';
  let sector: Sector | undefined;
  const page = () => `/${country}${sector ? `/${sector.slug}` : ''}`;
  const fail = (status: number, error: ErrorCode, extra: Record<string, unknown> = {}) =>
    wantsJson ? json(status, { ok: false, error, ...extra }) : redirect(request, `${page()}?error=${error}#contacto`);
  const done = () => (wantsJson ? json(200, { ok: true }) : redirect(request, `${page()}?enviado=1#contacto`));

  const canStore = Boolean(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);
  const canEmail = Boolean(env.RESEND_API_KEY && env.CONTACT_TO && env.CONTACT_FROM);
  if (!canStore && !canEmail) {
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
  // Solo se aceptan sectores de la lista; cualquier otro valor se ignora.
  const rawSector = data.get('sector');
  sector = typeof rawSector === 'string' ? sectorBySlug(rawSector) : undefined;

  // Campo trampa relleno: es un bot. Respondemos como si todo fuera bien y no enviamos nada.
  const honeypot = data.get('website');
  if (typeof honeypot === 'string' && honeypot.trim() !== '') return done();

  // Demasiado rápido para una persona: bot. Sin JS el campo llega vacío y no se aplica.
  const started = Number(data.get('t'));
  if (started > 0 && Date.now() - started < MIN_FILL_MS) return done();

  const input = readContact(data);
  const fields = validateContact(input);
  if (Object.keys(fields).length > 0) return fail(400, 'validation', { fields });

  if (env.CONTACT_DRY_RUN === '1') {
    console.log('[contact] Modo prueba: ni se guarda ni se envía');
    return done();
  }

  const stored = canStore ? await storeMessage(env, input, country, sector) : false;
  const emailed = canEmail ? await sendEmail(env, input, country, stored, sector) : false;
  if (!stored && !emailed) return fail(502, 'send');

  return done();
}

/** Guarda el mensaje en Supabase con la clave secreta (solo servidor; se salta RLS). */
async function storeMessage(env: ContactEnv, c: ContactInput, country: Country, sector?: Sector): Promise<boolean> {
  try {
    const res = await fetch(`${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SECRET_KEY!,
        Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        country,
        sector: sector?.slug ?? null,
        name: c.nombre,
        clinic: c.clinica,
        email: c.email,
        phone: c.telefono || null,
        message: c.mensaje || null,
      }),
    });
    if (!res.ok) {
      console.error('[contact] Supabase respondió', res.status);
      return false;
    }
    return true;
  } catch {
    console.error('[contact] Error de red al llamar a Supabase');
    return false;
  }
}

async function sendEmail(
  env: ContactEnv,
  c: ContactInput,
  country: Country,
  stored: boolean,
  sector?: Sector,
): Promise<boolean> {
  const to = country === 'co' && env.CONTACT_TO_CO ? env.CONTACT_TO_CO : env.CONTACT_TO;
  const rows: Array<[string, string]> = [
    ['País', country === 'co' ? 'Colombia' : 'España'],
    ['Sector', sector?.label ?? '(portada general)'],
    ['Nombre', c.nombre],
    ['Negocio', c.clinica],
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
<p style="margin:20px 0 0;font-size:13px;color:#525854">Enviado desde el formulario de novusance.com. Responde a este email para contestar directamente.${
    stored ? ' También está en el panel: <a href="https://www.novusance.com/admin#/mensajes">novusance.com/admin</a>.' : ''
  }</p>
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
        to: to!.split(',').map((s) => s.trim()).filter(Boolean),
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
