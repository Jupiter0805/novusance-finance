// Prueba del endpoint del formulario (npm test): guarda en Supabase, envía email, o ambos; y qué pasa si falla uno.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleContact } from './contact-handler';

const calls: { url: string; body: any; headers: any }[] = [];
let supabaseStatus = 201;
let resendStatus = 200;
globalThis.fetch = (async (url: string, init: any) => {
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : null;
  calls.push({ url: String(url), body, headers: init.headers });
  if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: true }));
  if (String(url).includes('/rest/v1/messages')) return new Response('', { status: supabaseStatus });
  if (String(url).includes('resend')) return new Response('{}', { status: resendStatus });
  throw new Error('url inesperada ' + url);
}) as any;

const form = () => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ pais: 'co', nombre: 'Ana', clinica: 'Huellitas', email: 'a@h.co', telefono: '300 1234567', mensaje: 'Hola', privacidad: 'on', 'cf-turnstile-response': 'tok' }))
    f.append(k, v);
  return new Request('https://www.novusance.com/api/contact', { method: 'POST', body: f, headers: { Accept: 'application/json' } });
};
const store = { TURNSTILE_SECRET_KEY: 's', SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_SECRET_KEY: 'sb_secret_x' };
const mail = { RESEND_API_KEY: 'r', CONTACT_TO: 'yo@n.com', CONTACT_FROM: 'web@n.com', CONTACT_TO_CO: 'carlos@n.com' };

test('solo Supabase: guarda el mensaje con la clave secreta y sin email', async () => {
  calls.length = 0;
  const r = await handleContact(form(), store, null);
  assert.equal(r.status, 200);
  const s = calls.find((c) => c.url.includes('/rest/v1/messages'))!;
  assert.equal(s.url, 'https://x.supabase.co/rest/v1/messages');
  assert.equal(s.headers.apikey, 'sb_secret_x');
  assert.deepEqual(s.body, { country: 'co', name: 'Ana', clinic: 'Huellitas', email: 'a@h.co', phone: '300 1234567', message: 'Hola' });
  assert.ok(!calls.some((c) => c.url.includes('resend')));
});

test('ambos: guarda y avisa por email a Carlos con enlace al panel', async () => {
  calls.length = 0;
  const r = await handleContact(form(), { ...store, ...mail }, null);
  assert.equal(r.status, 200);
  const m = calls.find((c) => c.url.includes('resend'))!;
  assert.deepEqual(m.body.to, ['carlos@n.com']);
  assert.match(m.body.html, /novusance\.com\/admin/);
});

test('si Supabase falla pero el email sale, el visitante ve éxito', async () => {
  supabaseStatus = 500;
  const r = await handleContact(form(), { ...store, ...mail }, null);
  assert.equal(r.status, 200);
  supabaseStatus = 201;
});

test('si falla todo, error de envío', async () => {
  supabaseStatus = 500;
  resendStatus = 500;
  const r = await handleContact(form(), { ...store, ...mail }, null);
  assert.equal(r.status, 502);
  supabaseStatus = 201;
  resendStatus = 200;
});

test('sin ningún destino configurado, error de configuración', async () => {
  const r = await handleContact(form(), { TURNSTILE_SECRET_KEY: 's' }, null);
  assert.equal(r.status, 500);
});
