// Genera los iconos y la imagen para redes sociales a partir del logo.
// Uso: npm run assets   (los resultados se guardan en public/ y se versionan en git)
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const out = (p) => new URL(`public/${p}`, root);

// Mismo trazado que src/data/logo.ts (vectorización de public/Novusance-Logo.png).
const logoSrc = await readFile(new URL('src/data/logo.ts', root), 'utf8');
const VIEWBOX = logoSrc.match(/LOGO_VIEWBOX = '([^']+)'/)[1];
const PATH = logoSrc.match(/'(M[^']+)'/)[1];

const COLORS = {
  bg: '#F4F5F2',
  ink: '#111413',
  muted: '#525854',
  soft: '#DEE9E5', // acento al 9,4 % sobre el fondo (el --accent-soft de la web)
  logo: '#1FA187',
  grad: ['#2DB06F', '#1F94A3'],
};

const logoSvg = (fill, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}">${defs}<path d="${PATH}" fill="${fill}"/></svg>`;
const flatSvg = logoSvg(COLORS.logo);
const gradSvg = logoSvg(
  'url(#g)',
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.grad[0]}"/><stop offset="1" stop-color="${COLORS.grad[1]}"/></linearGradient></defs>`,
);

const raster = (svg, size) => sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toBuffer();

/* ── favicon.svg ─────────────────────────────────────────────────── */
await writeFile(out('favicon.svg'), flatSvg + '\n');

/* ── favicon.ico (16, 32 y 48 px, PNG dentro de ICO) ─────────────── */
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map((s) => raster(flatSvg, s)));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(icoSizes[i], 0);
  e.writeUInt8(icoSizes[i], 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
await writeFile(out('favicon.ico'), Buffer.concat([header, ...entries, ...pngs]));

/* ── apple-touch-icon.png (180 px, fondo opaco) ──────────────────── */
const touchLogo = await raster(gradSvg, 120);
const touch = await sharp({ create: { width: 180, height: 180, channels: 4, background: COLORS.bg } })
  .composite([{ input: touchLogo, left: 30, top: 30 }])
  .png()
  .toBuffer();
await writeFile(out("apple-touch-icon.png"), touch);

/* ── og.png (1200×630) ───────────────────────────────────────────── */
const font = (p) => readFile(require.resolve(p));
const fonts = [
  { name: 'Archivo', data: await font('@fontsource/archivo/files/archivo-latin-700-normal.woff'), weight: 700 },
  { name: 'Host Grotesk', data: await font('@fontsource/host-grotesk/files/host-grotesk-latin-500-normal.woff'), weight: 500 },
];
const dataUri = async (svg, size) => `data:image/png;base64,${(await raster(svg, size)).toString('base64')}`;
const smallLogo = await dataUri(flatSvg, 112);
const bigLogo = await dataUri(gradSvg, 520);

const h = (type, style, children) => ({ type, props: { style, children } });
const img = (src, size) => ({ type: 'img', props: { src, width: size, height: size } });

const tree = h(
  'div',
  {
    width: 1200,
    height: 630,
    display: 'flex',
    background: COLORS.bg,
    padding: 56,
    gap: 48,
    fontFamily: 'Host Grotesk',
    color: COLORS.ink,
  },
  [
    h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingLeft: 16 }, [
      h('div', { display: 'flex', alignItems: 'center', gap: 16 }, [
        img(smallLogo, 56),
        h('div', { fontFamily: 'Archivo', fontWeight: 700, fontSize: 40, letterSpacing: '-0.03em' }, 'novusance'),
      ]),
      h('div', { display: 'flex', flexDirection: 'column', fontFamily: 'Archivo', fontWeight: 700, fontSize: 66, lineHeight: 1.04, letterSpacing: '-0.035em' }, [
        h('div', {}, 'La web de tu negocio,'),
        h('div', { color: COLORS.muted }, 'a la altura de tu trabajo.'),
      ]),
      h('div', { fontSize: 25, color: COLORS.muted }, 'Webs para negocios con cita en España y Colombia'),
    ]),
    h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 300, borderRadius: 32, background: COLORS.soft }, [
      img(bigLogo, 200),
    ]),
  ],
);

const svg = await satori(tree, { width: 1200, height: 630, fonts });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
await writeFile(out('og.png'), await sharp(png).png({ compressionLevel: 9, palette: true, quality: 95 }).toBuffer());

console.log('Generados: favicon.svg, favicon.ico, apple-touch-icon.png, og.png');
