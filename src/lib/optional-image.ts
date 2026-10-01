import type { ImageMetadata } from 'astro';

// Imágenes opcionales de public/: si el archivo existe se optimiza con <Image>; si no, se muestra un marcador.
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/public/{mcprimehome_landing,sirrux_landing,Ova_landing,Juanignacio}.{webp,png,jpg,jpeg}',
  { eager: true },
);

export function optionalImage(name: string): ImageMetadata | undefined {
  const key = Object.keys(files).find((k) => k.replace(/\.[^.]+$/, '') === `/public/${name}`);
  return key ? files[key].default : undefined;
}
