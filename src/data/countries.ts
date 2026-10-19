// Todo lo que cambia entre países vive aquí: precios, moneda, persona de contacto, email y algunas palabras.
// Los textos comunes están en los componentes. Para retocar Colombia, Carlos solo debería tocar el bloque `co`.

export type CountryCode = 'es' | 'co';

export interface Plan {
  id: string;
  name: string;
  /** Precio "desde" de la puesta en marcha, ya formateado. */
  setupFrom: string;
  fee: string;
  forWho: string;
  features: string[];
  featured: boolean;
}

export interface Country {
  code: CountryCode;
  /** Nombre del país, tal como se muestra en el selector. */
  name: string;
  /** Idioma de la página (atributo lang y hreflang). */
  lang: string;
  ogLocale: string;
  /**
   * false = borrador: la página se genera con un aviso visible, "noindex", fuera del sitemap y sin
   * enlazar desde el selector. Cambiar a true cuando estén todos los datos confirmados.
   */
  published: boolean;
  path: string;
  /** Prefijo de las páginas legales de este país. */
  legalBase: string;
  email: string;
  person: { name: string; role: string; photo: string; initials: string };
  /** Zona de servicio para los datos estructurados. */
  areaServed: string;
  /** Palabra para el teléfono móvil ("móvil" en España, "celular" en Colombia). */
  mobile: string;
  taxNote: string;
  plans: Plan[];
  /** Texto de la opción sin cuota. */
  noFee: string;
  /** Forma de pago y permanencia, en una frase. */
  terms: string;
}

const commonFeatures = {
  basic: [
    'Hasta 5 secciones',
    'Diseño con tu logo y tus colores',
    'Textos base y páginas legales',
    'Conexión de tu dominio',
    'Adaptada al móvil y a cualquier pantalla',
  ],
  full: [
    'Todo tu contenido actual, reorganizado',
    'Diseño nuevo con tu logo y tus colores',
    'Textos revisados y páginas legales',
    'Adaptada al móvil y a cualquier pantalla',
  ],
};

export const COUNTRIES: Record<CountryCode, Country> = {
  es: {
    code: 'es',
    name: 'España',
    lang: 'es-ES',
    ogLocale: 'es_ES',
    published: true,
    path: '/es',
    legalBase: '',
    email: 'hola@novusance.com',
    person: { name: 'Juan Ignacio Moreno', role: 'Diseño y desarrollo web · España', photo: 'Juanignacio', initials: 'JM' },
    areaServed: 'ES',
    mobile: 'móvil',
    taxNote: 'Precios sin IVA.',
    plans: [
      {
        id: 'basica',
        name: 'Web básica',
        setupFrom: '599 €',
        fee: '35 €',
        forWho: 'Para negocios nuevos o pequeños.',
        features: commonFeatures.basic,
        featured: false,
      },
      {
        id: 'renovacion',
        name: 'Renovación completa',
        setupFrom: '899 €',
        fee: '35 €',
        forWho: 'Para negocios con años de historia y mucho que contar.',
        features: commonFeatures.full,
        featured: true,
      },
    ],
    noFee: '¿Prefieres no pagar cuota? La puesta en marcha sube un 40 % y los cambios se cobran a 35 € la hora.',
    terms: 'Pagas el 50 % al empezar y el 50 % al publicar. La cuota tiene una permanencia mínima de 12 meses.',
  },
  co: {
    code: 'co',
    name: 'Colombia',
    lang: 'es-CO',
    ogLocale: 'es_CO',
    published: true,
    path: '/co',
    legalBase: '/co',
    // Buzón común hasta que Carlos tenga uno propio. Las solicitudes del formulario van a CONTACT_TO_CO (Vercel).
    email: 'hola@novusance.com',
    // PENDIENTE (Carlos): ciudad en el rol y foto en public/Carlos.png (cuadrada). Sin foto se ven sus iniciales.
    person: { name: 'Carlos Alberto Leamus', role: 'Diseño y desarrollo web · Colombia', photo: 'Carlos', initials: 'CL' },
    areaServed: 'CO',
    mobile: 'celular',
    // PENDIENTE (Carlos y su contador): confirmar si factura con IVA.
    taxNote: 'Precios antes de impuestos.',
    plans: [
      {
        id: 'basica',
        name: 'Web básica',
        setupFrom: '$1.200.000',
        fee: '$70.000',
        forWho: 'Para negocios nuevos o pequeños.',
        features: commonFeatures.basic,
        featured: false,
      },
      {
        id: 'renovacion',
        name: 'Renovación completa',
        setupFrom: '$2.000.000',
        fee: '$100.000',
        forWho: 'Para negocios con años de historia y mucho que contar.',
        features: commonFeatures.full,
        featured: true,
      },
    ],
    // PENDIENTE (Carlos): precio por hora de los cambios sin cuota.
    noFee: '¿Prefieres no pagar cuota? La puesta en marcha sube un 40 % y los cambios se cobran por hora.',
    terms: 'Pagas el 50 % al empezar y el 50 % al publicar. La cuota tiene una permanencia mínima de 12 meses.',
  },
};

export const COUNTRY_LIST = Object.values(COUNTRIES);
export const PUBLISHED = COUNTRY_LIST.filter((c) => c.published);

/** Qué incluye la cuota mensual (igual en los dos países). */
export const FEE_INCLUDES = [
  'Alojamiento y dominio conectado',
  'Copias de seguridad',
  'Cambios pequeños: horarios, precios, fotos',
  'Revisión de las páginas legales',
];

/** Lo que se presupuesta aparte (igual en los dos países). */
export const NOT_INCLUDED = 'Fotografía profesional y artículos de blog.';
