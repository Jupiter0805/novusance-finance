import type { ImageMetadata } from 'astro';

// Imágenes opcionales: si el archivo existe se optimiza con <Image>; si no, se muestra un marcador.
const files = import.meta.glob<{ default: ImageMetadata }>('/public/{trabajos/*,jupiter}.{webp,png,jpg,jpeg}', {
  eager: true,
});

export function optionalImage(path: string): ImageMetadata | undefined {
  return files[`/public/${path}`]?.default;
}
