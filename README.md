# novusance.com

Web de Novusance: diseño, renovación y mantenimiento de webs para clínicas veterinarias en España y Colombia.

- **Astro** + **Vercel** (`@astrojs/vercel`). Cada push a `main` se publica. Todo se pre-renderiza salvo el formulario,
  `src/pages/api/contact.ts`, que corre como función de Vercel.
- Una portada por país: `/es` (Jupiter) y `/co` (Carlos). La raíz `/` redirige a `/es` (`vercel.json`).
- Sin frameworks de UI. Fuentes autoalojadas (Fontsource), iconos Phosphor (`astro-icon`), sin cookies propias.

## Estructura

```
vercel.json                  Redirección de / a /es, URLs limpias y cabeceras de seguridad
supabase/migrations/         Base de datos y permisos del panel /admin
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
  admin/                     Panel /admin (Preact): vistas, acceso a Supabase y cálculos con sus pruebas
  lib/contact-handler.ts     Lógica del formulario: valida, filtra bots, guarda en Supabase y avisa por email
  lib/contact-validation.ts  Reglas del formulario, compartidas por navegador y servidor
  pages/                     [country] (/es, /co), [legal] (España), co/[legal] (Colombia), admin, api/contact, 404
  scripts/contact-form.ts    Lógica del formulario en el navegador
  styles/global.css          Tokens de diseño (claro/oscuro) y estilos base
```

## Países

Todo lo que cambia entre países (precios, moneda, persona, email, alguna palabra como "móvil" o "celular") está en
`src/data/countries.ts`. Los textos comunes viven en los componentes.

Un país con `published: false` se genera como **borrador**: aviso amarillo, `noindex`, fuera del sitemap (añade su ruta
a `DRAFT_PATHS` en `astro.config.mjs`) y sin enlace en el selector de país.

## Cookies

La web pública no usa cookies ni almacenamiento del navegador, así que no muestra banner. El gestor de consentimiento ya está montado y se activa solo:

1. Añade la herramienta a `CONSENT_TOOLS` en `src/data/consent.ts`: su script (`src` y/o `inline`), su categoría
   (analítica o publicidad) y los nombres de sus cookies.
2. Desde ese momento aparece el banner (Aceptar y Rechazar igual de visibles, opción de elegir por categorías) y el enlace
   "Configurar cookies" en el pie. El script **no se carga** hasta que la persona acepta su categoría; si retira el
   consentimiento, se borran sus cookies y se recarga la página.
3. Añade sus cookies a la tabla de `src/content/legal/cookies.md` y `src/content/legal-co/cookies.md`.
4. Si cambias herramientas o finalidades más adelante, sube `CONSENT_VERSION` para volver a preguntar.

Para medir visitas sin cookies (y sin banner), la opción es Vercel Web Analytics: `vercel({ webAnalytics: { enabled: true } })`
en `astro.config.mjs` y activarlo en el panel de Vercel.

## Panel de administración (`/admin`)

Panel privado para Jupiter y Carlos: movimientos (ingresos y gastos con su factura), clientes y cuotas, fondo Sirrux y
resumen de impuestos con exportación CSV y ZIP de facturas. Es una app en Preact (`src/admin/`) que habla directamente con
Supabase desde el navegador. La clave `anon` es pública por diseño: lo que protege los datos son las políticas RLS de
`supabase/migrations/0001_admin.sql`, que solo dejan pasar a los usuarios de la tabla `admins`. `/admin` no se indexa.

### Puesta en marcha (una vez)

1. **Crear el proyecto** en Supabase, región `eu-west` (Irlanda o Fráncfort).
2. **Base de datos:** SQL Editor → pega `supabase/migrations/0001_admin.sql` y después `0002_messages.sql` → Run. Crea las tablas, las políticas y
   el bucket privado `documentos`. Se puede volver a ejecutar sin problema.
3. **Cerrar el registro:** Authentication → Sign In / Providers → desactiva «Allow new users to sign up». Solo entra quien
   invitéis.
4. **URLs de vuelta:** Authentication → URL Configuration → Site URL `https://www.novusance.com/admin` y añade
   `https://www.novusance.com/admin` en Redirect URLs (para invitaciones y recuperar contraseña).
5. **Usuarios:** Authentication → Users → «Invite user» con el email de cada uno. Al abrir el enlace, el panel pide elegir
   contraseña. Después, en el SQL Editor:

   ```sql
   insert into public.admins (user_id, name, country)
   select id, 'Jupiter', 'es' from auth.users where email = 'EMAIL_DE_JUPITER'
   union all
   select id, 'Carlos', 'co' from auth.users where email = 'EMAIL_DE_CARLOS';
   ```

6. **Vercel:** añade `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings → API) y vuelve a
   desplegar. La clave `service_role` **nunca** va en Vercel ni en el código.

### Cómo se calcula

Todo está en `src/admin/calc.ts`, con pruebas en `calc.test.ts` (`npm test`).

- **Fondo Sirrux:** cada mes y país, el porcentaje de Ajustes (30 % por defecto) del beneficio = ingresos − gastos
  marcados como «gasto directo de un cliente». Los meses con pérdidas no aportan. Los gastos marcados como «Pagado con el
  fondo Sirrux» restan del saldo. No se convierte de moneda.
- **España, modelo 303:** IVA de ingresos − IVA de gastos deducibles del trimestre.
- **España, modelo 130:** 20 % del rendimiento acumulado del año (ingresos − gastos deducibles) − retenciones − pagos de
  trimestres anteriores; nunca negativo.
- **Colombia:** resumen mensual y anual; las declaraciones las decide su contador.

Son cifras orientativas para preparar pagos y pasar a la gestoría; no sustituyen su revisión.

## Desarrollo

Requiere Node 22 o superior.

```sh
npm install
npm run dev          # http://localhost:4321, formulario incluido
npm run build
npm run check        # comprobación de tipos
npm test             # pruebas de los cálculos del panel y del formulario
```

Para probar el formulario en local, crea `.env` (está en `.gitignore`) a partir de `.env.example`. Con
`CONTACT_DRY_RUN=1` valida todo pero ni guarda ni envía nada.

## Variables de entorno

En Vercel > Project > Settings > Environment Variables (Production y Preview).

| Variable | Para qué |
| --- | --- |
| `RESEND_API_KEY` | Enviar el email con la API de Resend |
| `CONTACT_TO` | Destinatario(s) de las solicitudes, separados por comas |
| `CONTACT_TO_CO` | Destinatario(s) de las solicitudes enviadas desde `/co`. Si falta, van a `CONTACT_TO` |
| `CONTACT_FROM` | Remitente, p. ej. `Novusance <web@novusance.com>` (dominio verificado en Resend) |
| `CONTACT_DRY_RUN` | Solo en local: `1` = no envía el email. **Nunca en producción** |
| `PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase del panel `/admin` |
| `PUBLIC_SUPABASE_ANON_KEY` | Clave publicable (`sb_publishable_…`) de Supabase, para el panel |
| `SUPABASE_SECRET_KEY` | Clave secreta (`sb_secret_…`), **solo servidor y como Secret**: guarda los mensajes del formulario |


## Formulario de contacto

- Validación en el navegador (mensajes en español bajo cada campo) y la misma validación en el servidor.
- Antispam sin servicios externos: un campo trampa oculto y un tiempo mínimo de 3 segundos entre abrir la página y
  enviar. Si parece un bot, el servidor responde como si todo fuera bien y no guarda nada. Si algún día entra spam,
  la opción es añadir Cloudflare Turnstile.
- Envío con `fetch` sin recargar; el endpoint responde `{ ok: true }` o `{ ok: false, error }`.
- Sin JavaScript, el formulario hace un POST normal y el endpoint redirige a `/<país>?enviado=1#contacto`
  (o `/<país>?error=<código>#contacto`). Funciona también sin JavaScript.
- El campo oculto `pais` decide el destinatario (`CONTACT_TO` o `CONTACT_TO_CO`).
- Cada solicitud se guarda en la tabla `messages` de Supabase (si hay `SUPABASE_SECRET_KEY`) y aparece en el panel,
  pestaña Mensajes. Si además están `RESEND_API_KEY`, `CONTACT_TO` y `CONTACT_FROM`, llega un aviso por email. Basta con
  que funcione uno de los dos para que el visitante vea el envío como correcto. Los logs no incluyen datos personales.

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
