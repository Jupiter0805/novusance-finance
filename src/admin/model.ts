// Tipos y catálogos del panel. Deben coincidir con supabase/migrations/0001_admin.sql.

export type Country = 'es' | 'co';
export type Currency = 'EUR' | 'COP';
export type Kind = 'ingreso' | 'gasto';

export const COUNTRY_NAME: Record<Country, string> = { es: 'España', co: 'Colombia' };
export const CURRENCY: Record<Country, Currency> = { es: 'EUR', co: 'COP' };

export interface Admin {
  user_id: string;
  name: string;
  country: Country;
}

export interface Settings {
  sirrux_pct: number;
}

export interface Client {
  id: string;
  country: Country;
  name: string;
  city: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  fee_amount: number | null;
  fee_start: string | null;
  fee_end: string | null;
  min_months: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Movement {
  id: string;
  country: Country;
  currency: Currency;
  kind: Kind;
  date: string; // AAAA-MM-DD
  category: string;
  concept: string;
  counterparty: string | null;
  invoice_number: string | null;
  client_id: string | null;
  base_amount: number;
  tax_rate: number;
  tax_amount: number;
  withholding_rate: number;
  withholding_amount: number;
  direct_cost: boolean;
  sirrux: boolean;
  deductible: boolean;
  document_path: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const INCOME_CATEGORIES: Record<string, string> = {
  puesta_en_marcha: 'Puesta en marcha',
  cuota: 'Cuota mensual',
  cambios: 'Cambios y trabajos extra',
  otros_ingresos: 'Otros ingresos',
};

export const EXPENSE_CATEGORIES: Record<string, string> = {
  dominio: 'Dominio',
  hosting: 'Alojamiento',
  herramientas: 'Herramientas y software',
  fotografia: 'Fotografía',
  publicidad: 'Publicidad',
  gestoria: 'Gestoría o contador',
  seguridad_social: 'Cuota de autónomo / seguridad social',
  equipo: 'Equipo (ordenador, móvil...)',
  desplazamientos: 'Desplazamientos',
  formacion: 'Formación',
  comisiones: 'Comisiones bancarias',
  otros_gastos: 'Otros gastos',
};

export const categoryLabel = (c: string) => INCOME_CATEGORIES[c] ?? EXPENSE_CATEGORIES[c] ?? c;

/** Tipos de IVA habituales por país, para el selector (se puede escribir otro). */
export const TAX_RATES: Record<Country, number[]> = { es: [21, 10, 4, 0], co: [19, 5, 0] };

/** Países que se muestran según el filtro de la barra superior. */
export const scopeCountries = (scope: 'all' | Country): Country[] => (scope === 'all' ? ['es', 'co'] : [scope]);

/** Plazos de presentación de los modelos 303 y 130 en España (trimestre → fecha límite). */
export const SPAIN_DEADLINES: Record<number, (year: number) => string> = {
  1: (y) => `${y}-04-20`,
  2: (y) => `${y}-07-20`,
  3: (y) => `${y}-10-20`,
  4: (y) => `${y + 1}-01-30`,
};
