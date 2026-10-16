// Registro de herramientas que usan cookies (o almacenamiento) no esenciales.
//
// Mientras la lista esté vacía, la web no muestra banner: solo usa tecnologías técnicas, que no requieren consentimiento.
// Al añadir una herramienta aquí:
//   1. Aparece el banner (Aceptar y Rechazar igual de visibles) y el enlace "Configurar cookies" en el pie.
//   2. Su script NO se carga hasta que la persona acepta su categoría.
//   3. Añade sus cookies a la tabla de src/content/legal/cookies.md y src/content/legal-co/cookies.md.
//   4. Sube CONSENT_VERSION para volver a pedir el consentimiento a todo el mundo.

export type ConsentCategory = 'analytics' | 'marketing';

export interface ConsentTool {
  id: string;
  /** Nombre visible, p. ej. "Google Analytics". */
  name: string;
  category: ConsentCategory;
  /** Script externo que se carga solo tras aceptar. */
  src?: string;
  /** Código que se ejecuta solo tras aceptar (p. ej. la configuración de la herramienta). */
  inline?: string;
  /** Nombres o prefijos de sus cookies, para borrarlas si se retira el consentimiento. */
  cookies: string[];
}

export const CONSENT_TOOLS: ConsentTool[] = [];

export const CATEGORIES: Record<ConsentCategory, { label: string; text: string }> = {
  analytics: {
    label: 'Analítica',
    text: 'Para saber cuántas personas visitan la web y qué páginas leen, y así mejorarla.',
  },
  marketing: {
    label: 'Publicidad',
    text: 'Para medir campañas de publicidad y mostrarte anuncios relacionados.',
  },
};

/** Al cambiar las herramientas o sus finalidades, súbelo: se vuelve a pedir el consentimiento. */
export const CONSENT_VERSION = 1;

/** Cada cuánto se vuelve a preguntar, en días (la AEPD recomienda no más de 24 meses). */
export const CONSENT_MAX_AGE_DAYS = 365;

export const CONSENT_STORAGE_KEY = 'nv-consent';

/** Categorías que se usan de verdad, en el orden en que se muestran. */
export const usedCategories = (): ConsentCategory[] =>
  (Object.keys(CATEGORIES) as ConsentCategory[]).filter((c) => CONSENT_TOOLS.some((t) => t.category === c));
