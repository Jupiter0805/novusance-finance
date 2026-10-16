# novusance.com

Web de Novusance: diseño, renovación y mantenimiento de webs para clínicas veterinarias en España y Colombia.

- Una portada por país: `/es` (Jupiter) y `/co` (Carlos). La raíz `/` redirige a `/es` (`public/_redirects`).
- Todo lo que cambia entre países (precios, moneda, persona, email) está en `src/data/countries.ts`.
- Un país con `published: false` se genera como **borrador**: aviso visible, `noindex`, fuera del sitemap y sin
  enlace en el selector de país. Para publicar Colombia: completa sus datos y textos legales (`src/content/legal-co/`),
  pon `published: true` y quita `'/co'` de `DRAFT_PATHS` en `astro.config.mjs`.

- **Astro** (salida estática) + una **Cloudflare Pages Function** para el formulario (`functions/api/contact.ts`).
- Sin frameworks de UI. Fuentes autoalojadas (Fontsource), iconos Phosphor (`astro-icon`), sin cookies propias.

## Estructura

```
functions/api/contact.ts     Pages Function: valida, verifica Turnstile y envía el email con Resend
public/                      Archivos servidos tal cual
  Novusance-Logo.png         Logo original (no renombrar)
  favicon.svg / .ico, apple-touch-icon.png, og.png   Generados con `npm run assets`
  *_landing.png, Juanignacio.png   Capturas de trabajos y foto (ver más abajo)
  _headers, _redirects, robots.txt                   Configuración de Cloudflare Pages
scripts/generate-assets.mjs  Genera favicons y la imagen Open Graph a partir del logo
src/
  components/                Secciones de la portada, cabecera, pie, logo, plantilla legal
  content/legal/*.md         Textos legales de España (/aviso-legal, /privacidad...)
  content/legal-co/*.md      Textos legales de Colombia (/co/aviso-legal...), en borrador
  data/countries.ts          Precios, moneda, persona y email de cada país
  data/logo.ts               Logo en vectorial (trazado de Novusance-Logo.png)
  lib/contact-validation.ts  Reglas del formulario, compartidas por navegador y servidor
  pages/                     [country] (/es, /co), [legal] (España), co/[legal] (Colombia), 404
  scripts/contact-form.ts    Lógica del formulario en el navegador
  styles/global.css          Tokens de diseño (claro/oscuro) y estilos base
```

## Desarrollo

Requiere Node 22 o superior.

```sh
npm install
npm run dev          # http://localhost:4321 (sin la Function del formulario)
npm run build        # genera dist/
npm run check        # comprobación de tipos
```

### Probar el formulario en local (con Turnstile en modo prueba)

`astro dev` no ejecuta Pages Functions. Para probar el envío completo se usa Wrangler sobre el build:

1. Crea `.dev.vars` en la raíz (está en `.gitignore`):

   ```
   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
   RESEND_API_KEY=re_xxx
   CONTACT_TO=hola@novusance.com
   CONTACT_FROM=Novusance <web@novusance.com>
   CONTACT_DRY_RUN=1
   ```

   `CONTACT_DRY_RUN=1` valida todo y verifica Turnstile, pero no envía el email. Quítalo (y pon una API key real)
   para recibir el correo de verdad.

2. Compila con la clave pública de prueba y arranca Wrangler:

   ```sh
   PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build
   npm run cf:dev       # http://localhost:8788
   ```

   En PowerShell: `$env:PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"; npm run build`.

Claves de prueba de Turnstile: la pública `1x00000000000000000000AA` siempre pasa;
`2x00000000000000000000AB` siempre falla (para ver el mensaje de error); `3x00000000000000000000FF` fuerza el desafío
interactivo. La secreta `1x0000000000000000000000000000000AA` acepta cualquier token de prueba.

## Variables de entorno

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build (se incrusta en el HTML) | Clave pública del widget de Turnstile |
| `TURNSTILE_SECRET_KEY` | Function (secreto) | Verificar el token de Turnstile en el servidor |
| `RESEND_API_KEY` | Function (secreto) | Enviar el email con la API de Resend |
| `CONTACT_TO` | Function | Destinatario(s) de las solicitudes, separados por comas |
| `CONTACT_TO_CO` | Function | Destinatario(s) de las solicitudes enviadas desde `/co`. Si falta, van a `CONTACT_TO` |
| `CONTACT_FROM` | Function | Remitente, p. ej. `Novusance <web@novusance.com>` (dominio verificado en Resend) |
| `CONTACT_DRY_RUN` | Solo local | `1` = no envía el email. **Nunca en producción** |

Ver `.env.example`.

## Formulario de contacto

- Validación en el navegador (mensajes en español bajo cada campo) y la misma validación en el servidor.
- Antispam: Turnstile (modo gestionado, `interaction-only`: invisible salvo que Cloudflare necesite comprobar algo)
  y un campo trampa oculto. El script de Turnstile solo se carga cuando el visitante se acerca al formulario.
- Envío con `fetch` sin recargar. La Function responde `{ ok: true }` o `{ ok: false, error }`.
- Sin JavaScript, el formulario hace un POST normal y la Function redirige a `/<país>?enviado=1#contacto`
  (o `/<país>?error=<código>#contacto`). **Limitación:** Turnstile necesita JavaScript, así que un envío sin JS no pasa la
  verificación antispam. Por eso el formulario muestra, solo sin JS, un aviso con el email como alternativa.
- No se guardan los datos en ninguna base de datos. Los logs no incluyen datos personales.

## Capturas de trabajos y foto

Están en `public/` y se optimizan solas al compilar (WebP en varios tamaños). Para cambiarlas, sustituye el archivo
manteniendo el nombre (vale .png, .jpg o .webp). Si falta alguna, se muestra un marcador de texto.

- `public/mcprimehome_landing.png`: va a todo el ancho; mejor en panorámica (unos 2:1).
- `public/sirrux_landing.png` y `public/Ova_landing.png`: se recortan a 16:9 desde arriba.
- `public/Juanignacio.png`: foto de "Sobre mí" en España, cuadrada.
- `public/Carlos.png`: foto de "Sobre mí" en Colombia, cuadrada. Si falta, se muestran sus iniciales.

## Analítica

Desactivada. Si se quiere, se usa Cloudflare Web Analytics (no usa cookies): actívala desde el panel de Pages
(Metrics > Web Analytics) o descomenta el script en `src/layouts/BaseLayout.astro` con tu token.

## Despliegue en Cloudflare Pages

1. **Crear el proyecto:** Cloudflare > Workers & Pages > Create > Pages > Connect to Git y elige este repositorio.
   - Rama de producción: `main`.
   - Framework preset: Astro. Build command: `npm run build`. Build output directory: `dist`.
   - Variable `NODE_VERSION` = `22`.
2. **Turnstile:** Cloudflare > Turnstile > Add widget. Modo **Managed**. Hostnames: `novusance.com`,
   `www.novusance.com` y el dominio `*.pages.dev` del proyecto (para las previsualizaciones). Copia las dos claves.
3. **Variables** (Pages > Settings > Variables and Secrets, en Production y Preview):
   `PUBLIC_TURNSTILE_SITE_KEY`, `CONTACT_TO`, `CONTACT_FROM` como texto; `TURNSTILE_SECRET_KEY` y `RESEND_API_KEY`
   como secretos (Encrypt). Tras cambiar `PUBLIC_TURNSTILE_SITE_KEY` hay que volver a desplegar, porque va en el HTML.
4. **Dominio:** Pages > Custom domains > añade `www.novusance.com` y `novusance.com` (como la zona está en
   Cloudflare, los registros DNS se crean solos). La URL canónica es `https://www.novusance.com`, así que redirige
   el dominio raíz: Rules > Redirect Rules > nueva regla "Hostname es igual a novusance.com" →
   redirección dinámica 301 a `concat("https://www.novusance.com", http.request.uri.path)` conservando la query.
5. **Resend (envío de email):**
   - Resend > Domains > Add domain `novusance.com` (región recomendada: `eu-west-1`, Irlanda).
   - Resend muestra los registros a crear en Cloudflare DNS (o usa su botón de configuración automática con
     Cloudflare). Normalmente: un **MX** y un **TXT SPF** (`v=spf1 include:amazonses.com ~all`) en el subdominio
     `send`, y un **TXT DKIM** en `resend._domainkey`. Créalos como **DNS only** (nube gris).
   - Recomendado: un TXT `_dmarc` con `v=DMARC1; p=none;` para empezar.
   - Estos registros van en el subdominio `send`, así que no interfieren con el MX/SPF del correo de `hola@`.
   - Cuando el dominio esté "Verified", crea una API key con permiso de solo envío para ese dominio.
6. **Comprobar:** envía el formulario en producción y revisa que llega a `CONTACT_TO`. Vuelve a auditar las cookies
   en producción (ver abajo).

### Ojo con las cookies de Cloudflare

Esta web no pone cookies propias. Pero algunas funciones de la zona de Cloudflare sí pueden hacerlo (por ejemplo
**Bot Fight Mode** o **Bot Management**, que añaden `__cf_bm`). Déjalas desactivadas o, si las activas, añade la
cookie a la tabla de `src/content/legal/cookies.md`.
