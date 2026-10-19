// Prueba del endpoint del formulario (npm test): guarda en Supabase, envía email, o ambos; antispam; y fallos.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleContact } from './contact-handler';

const calls: { url: string; body: any; headers: any }[] = [];
let supabaseStatus = 201;
let resendStatus = 200;
globalThis.fetch = (async (url: string, init: any) => {
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : null;
  calls.push({ url: String(url), body, headers: init.headers });
  if (String(url).includes('/rest/v1/messages')) return new Response('', { status: supabaseStatus });
  if (String(url).includes('resend')) return new Response('{}', { status: resendStatus });
  throw new Error('url inesperada ' + url);
}) as any;

const form = (extra: Record<string, string> = {}) => {
  const f = new FormData();
  const fields = {
    pais: 'co',
    nombre: 'Ana',
    clinica: 'Huellitas',
    email: 'a@h.co',
    telefono: '300 1234567',
    mensaje: 'Hola',
    privacidad: 'on',
    t: String(Date.now() - 10_000),
    ...extra,
  };
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return new Request('https://www.novusance.com/api/contact', {
    method: 'POST',
    body: f,
    headers: { Accept: 'application/json' },
  });
};
const store = { SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_SECRET_KEY: 'sb_secret_x' };
const mail = { RESEND_API_KEY: 'r', CONTACT_TO: 'yo@n.com', CONTACT_FROM: 'web@n.com', CONTACT_TO_CO: 'carlos@n.com' };

test('solo Supabase: guarda el mensaje con la clave secreta y sin email', async () => {
  calls.length = 0;
  const r = await handleContact(form(), store);
  assert.equal(r.status, 200);
  const s = calls.find((c) => c.url.includes('/rest/v1/messages'))!;
  assert.equal(s.url, 'https://x.supabase.co/rest/v1/messages');
  assert.equal(s.headers.apikey, 'sb_secret_x');
  assert.deepEqual(s.body, {
    country: 'co',
    sector: null,
    name: 'Ana',
    clinic: 'Huellitas',
    email: 'a@h.co',
    phone: '300 1234567',
    message: 'Hola',
  });
  assert.ok(!calls.some((c) => c.url.includes('resend')));
});

test('ambos: guarda y avisa por email a Carlos con enlace al panel', async () => {
  calls.length = 0;
  const r = await handleContact(form(), { ...store, ...mail });
  assert.equal(r.status, 200);
  const m = calls.find((c) => c.url.includes('resend'))!;
  assert.deepEqual(m.body.to, ['carlos@n.com']);
  assert.match(m.body.html, /novusance\.com\/admin/);
});

test('antispam: envío en menos de 3 segundos o con el campo trampa → "ok" sin guardar nada', async () => {
  calls.length = 0;
  assert.equal((await handleContact(form({ t: String(Date.now() - 500) }), store)).status, 200);
  assert.equal((await handleContact(form({ website: 'http://spam' }), store)).status, 200);
  assert.equal(calls.length, 0);
});

test('sin JavaScript (sin hora de apertura) se acepta y vuelve a la página del país', async () => {
  calls.length = 0;
  const f = new FormData();
  for (const [k, v] of Object.entries({ pais: 'co', nombre: 'A', clinica: 'B', email: 'a@b.co', privacidad: 'on', t: '' }))
    f.append(k, v);
  const r = await handleContact(new Request('https://www.novusance.com/api/contact', { method: 'POST', body: f }), store);
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), 'https://www.novusance.com/co?enviado=1#contacto');
  assert.equal(calls.length, 1);
});

test('sector: se guarda si es de la lista, se ignora si no, y sin JS vuelve a la página del sector', async () => {
  calls.length = 0;
  await handleContact(form({ sector: 'peluquerias-caninas' }), store);
  await handleContact(form({ sector: 'inventado' }), store);
  const bodies = calls.filter((c) => c.url.includes('/rest/v1/messages')).map((c) => c.body.sector);
  assert.deepEqual(bodies, ['peluquerias-caninas', null]);

  const f = new FormData();
  for (const [k, v] of Object.entries({ pais: 'es', sector: 'clinicas-dentales', nombre: 'A', clinica: 'B', email: 'a@b.es', privacidad: 'on' }))
    f.append(k, v);
  const r = await handleContact(new Request('https://www.novusance.com/api/contact', { method: 'POST', body: f }), store);
  assert.equal(r.headers.get('location'), 'https://www.novusance.com/es/clinicas-dentales?enviado=1#contacto');
});

test('email: incluye el sector', async () => {
  calls.length = 0;
  await handleContact(form({ sector: 'centros-de-estetica' }), { ...store, ...mail });
  const m = calls.find((c) => c.url.includes('resend'))!;
  assert.match(m.body.text, /Sector: Centros de estética/);
});

test('si Supabase falla pero el email sale, el visitante ve éxito', async () => {
  supabaseStatus = 500;
  const r = await handleContact(form(), { ...store, ...mail });
  assert.equal(r.status, 200);
  supabaseStatus = 201;
});

test('si falla todo, error de envío', async () => {
  supabaseStatus = 500;
  resendStatus = 500;
  const r = await handleContact(form(), { ...store, ...mail });
  assert.equal(r.status, 502);
  supabaseStatus = 201;
  resendStatus = 200;
});

test('sin ningún destino configurado, error de configuración', async () => {
  const r = await handleContact(form(), {});
  assert.equal(r.status, 500);
});
