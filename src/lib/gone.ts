// Respuesta 410 (Gone) para las URLs de la antigua Novusance Finance (blog, comparador).
// Un 410 le dice a Google que la página se eliminó a propósito y la saca del índice antes que un 404.
import type { APIRoute } from 'astro';

const body = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página eliminada · Novusance</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5"><h1>Esta página ya no existe</h1><p>Novusance ahora diseña webs para clínicas veterinarias.</p><p><a href="/es">Ir a novusance.com</a></p></body></html>`;

export const gone: APIRoute = () =>
  new Response(body, {
    status: 410,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
