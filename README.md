# novusance.com

Web de Novusance: diseño, renovación y mantenimiento de webs para clínicas veterinarias en España y Colombia.

- **Astro** + **Vercel** (`@astrojs/vercel`). Cada push a `main` se publica. Todo se pre-renderiza salvo el formulario,
  `src/pages/api/contact.ts`, que corre como función de Vercel.
- Una portada por país: `/es` (Jupiter) y `/co` (Carlos). La raíz `/` redirige a `/es` (`vercel.json`).
- Sin frameworks de UI. Fuentes autoalojadas (Fontsource), iconos Phosphor (`astro-icon`), sin cookies propias.

## Estructura

```
vercel.json                  Redirección de / a /es, URLs limpias y cabeceras de seguridad
public/                      Archivos servidos tal cual
  Novusance-Logo.png         Logo original (no renombrar)
  favicon.svg / .ico, apple-touch-icon.png, og.png   Generados con `npm run assets`
  *_landing.png, Juanignacio.png, Carlos.png         Capturas de trabajos y fotos (ver más abajo)
scripts/generate-assets.mjs  Genera favicons y la imagen Open Graph a partir del logo
src/
  components/                Secciones de la portada, cabecera, pie, banner de cookies, plantilla legal
  content/legal/*.md         Textos legales de España (/aviso-legal, /privacidad, /cookies, /condiciones)
  content/legal-co/*.md      Textos legales de Colombia (/co/aviso-legal...)
  data/countries.ts          Precios, moneda, persona y email de cada país
  data/consent.ts            Herramientas con cookies no esenciales (hoy, ninguna)
  data/logo.ts               Logo en vectorial (trazado de Novusance-Logo.png)
  lib/contact-handler.ts     Lógica del formulario: valida, verifica Turnstile y envía el email con Resend
  lib/contact-validation.ts  Reglas del formulario, compartidas por navegador y servidor
  pages/                     [country] (/es, /co), [legal] (España), co/[legal] (Colombia), api/contact, 404
  scripts/contact-form.ts    Lógica del formulario en el navegador
  styles/global.css          Tokens de diseño (claro/oscuro) y estilos base
```

## Países

Todo lo que cambia entre países (precios, moneda, persona, email, alguna palabra como "móvil" o "celular") está en
`src/data/countries.ts`. Los textos comunes viven en los componentes.

Un país con `published: false` se genera como **borrador**: aviso amarillo, `noindex`, fuera del sitemap (añade su ruta
a `DRAFT_PATHS` en `astro.config.mjs`) y sin enlace en el selector de país.

## Cookies

La web solo usa almacenamiento técnico (Turnstile, en el formulario), que no requiere consentimiento, así que no muestra
banner. El gestor de consentimiento ya está montado y se activa solo:

1. Añade la herramienta a `CONSENT_TOOLS` en `src/data/consent.ts`: su script (`src` y/o `inline`), su categoría
   (analítica o publicidad) y los nombres de sus cookies.
2. Desde ese momento aparece el banner (Aceptar y Rechazar igual de visibles, opción de elegir por categorías) y el enlace
   "Configurar cookies" en el pie. El script **no se carga** hasta que la persona acepta su categoría; si retira el
   consentimiento, se borran sus cookies y se recarga la página.
3. Añade sus cookies a la tabla de `src/content/legal/cookies.md` y `src/content/legal-co/cookies.md`.
4. Si cambias herramientas o finalidades más adelante, sube `CONSENT_VERSION` para volver a preguntar.

Para medir visitas sin cookies (y sin banner), la opción es Vercel Web Analytics: `vercel({ webAnalytics: { enabled: true } })`
en `astro.config.mjs` y activarlo en el panel de Vercel.

## Desarrollo

Requiere Node 22 o superior.

```sh
npm install
npm run dev          # http://localhost:4321, formulario incluido
npm run build
npm run check        # comprobación de tipos
```

Para probar el formulario en local, crea `.env` (está en `.gitignore`) a partir de `.env.example` con las claves de
prueba de Turnstile y `CONTACT_DRY_RUN=1`, que valida todo y verifica Turnstile pero no envía el email:

```
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
RESEND_API_KEY=re_xxx
CONTACT_TO=hola@novusance.com
CONTACT_FROM=Novusance <web@novusance.com>
CONTACT_DRY_RUN=1
```

Claves de prueba de Turnstile: la pública `1x00000000000000000000AA` siempre pasa; `2x00000000000000000000AB` siempre
falla; `3x00000000000000000000FF` fuerza el desafío interactivo.

## Variables de entorno

En Vercel > Project > Settings > Environment Variables (Production y Preview).

| Variable | Para qué |
| --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Clave pública del widget de Turnstile. Se incrusta en el build: tras cambiarla, vuelve a desplegar |
| `TURNSTILE_SECRET_KEY` | Verificar el token de Turnstile en el servidor |
| `RESEND_API_KEY` | Enviar el email con la API de Resend |
| `CONTACT_TO` | Destinatario(s) de las solicitudes, separados por comas |
| `CONTACT_TO_CO` | Destinatario(s) de las solicitudes enviadas desde `/co`. Si falta, van a `CONTACT_TO` |
| `CONTACT_FROM` | Remitente, p. ej. `Novusance <web@novusance.com>` (dominio verificado en Resend) |
| `CONTACT_DRY_RUN` | Solo en local: `1` = no envía el email. **Nunca en producción** |

En Cloudflare > Turnstile, el widget debe incluir `novusance.com` y `www.novusance.com` como hostnames (Turnstile es
solo el antispam; la web está en Vercel).

## Formulario de contacto

- Validación en el navegador (mensajes en español bajo cada campo) y la misma validación en el servidor.
- Antispam: Turnstile (modo gestionado, invisible salvo que haga falta comprobar algo) y un campo trampa oculto. El
  script de Turnstile solo se carga cuando el visitante se acerca al formulario.
- Envío con `fetch` sin recargar; el endpoint responde `{ ok: true }` o `{ ok: false, error }`.
- Sin JavaScript, el formulario hace un POST normal y el endpoint redirige a `/<país>?enviado=1#contacto`
  (o `/<país>?error=<código>#contacto`). Turnstile necesita JavaScript, así que sin JS se muestra el email como alternativa.
- El campo oculto `pais` decide el destinatario (`CONTACT_TO` o `CONTACT_TO_CO`).
- No se guardan los datos en ninguna base de datos. Los logs no incluyen datos personales.

## Capturas de trabajos y fotos

Están en `public/` y se optimizan solas al compilar. Para cambiarlas, sustituye el archivo manteniendo el nombre (vale
.png, .jpg o .webp). Si falta alguna, se muestra un marcador.

- `public/mcprimehome_landing.png`: va a todo el ancho; mejor en panorámica (unos 2:1).
- `public/sirrux_landing.png` y `public/Ova_landing.png`: se recortan a 16:9 desde arriba.
- `public/Juanignacio.png`: foto de "Sobre mí" en España, cuadrada.
- `public/Carlos.png`: foto de "Sobre mí" en Colombia, cuadrada. Si falta, se muestran sus iniciales.

## Correo del dominio (Resend)

Resend > Domains > `novusance.com` (región `eu-west-1`). Crea en el DNS de Vercel los registros que indica Resend
(MX y TXT SPF en el subdominio `send`, TXT DKIM en `resend._domainkey`, y recomendado un TXT `_dmarc` con
`v=DMARC1; p=none;`). Van en el subdominio `send`, así que no interfieren con el correo de `hola@`.
