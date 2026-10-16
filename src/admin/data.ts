// Acceso a Supabase. La clave anon es pública; lo que protege los datos son las políticas RLS de la migración.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';
import type { Admin, Client, Movement, Settings } from './model';

export const configured = Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY);

/**
 * Si se llega desde un enlace de invitación o de recuperación, la URL trae type=invite|recovery.
 * Se lee ANTES de crear el cliente, porque Supabase limpia la URL al procesar la sesión.
 */
export const arrivedToSetPassword =
  typeof location !== 'undefined' && /type=(invite|recovery)/.test(`${location.hash}${location.search}`);

export const supabase: SupabaseClient | null = configured
  ? createClient(PUBLIC_SUPABASE_URL!, PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

const db = () => {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
};

const BUCKET = 'documentos';

/** Mensaje legible a partir de un error de Supabase. */
export const errorText = (e: unknown) => {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e);
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'Falta confirmar el email: revisa tu bandeja de entrada.';
  if (/row-level security/i.test(msg)) return 'Tu usuario no tiene permiso para hacer esto.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'No hay conexión con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (/Password should be at least/i.test(msg)) return 'La contraseña es demasiado corta.';
  return msg;
};

const check = <T>(r: { data: T; error: unknown }): T => {
  if (r.error) throw r.error;
  return r.data;
};

const num = (v: unknown) => (v === null || v === undefined ? v : Number(v));

// PostgREST devuelve los numeric como texto: se convierten a número al leer.
const normMovement = (m: Movement): Movement => ({
  ...m,
  base_amount: Number(m.base_amount),
  tax_rate: Number(m.tax_rate),
  tax_amount: Number(m.tax_amount),
  withholding_rate: Number(m.withholding_rate),
  withholding_amount: Number(m.withholding_amount),
});

const normClient = (c: Client): Client => ({ ...c, fee_amount: num(c.fee_amount) as number | null });

export interface AllData {
  admins: Admin[];
  me: Admin | null;
  settings: Settings;
  clients: Client[];
  movements: Movement[];
}

export const loadAll = async (userId: string): Promise<AllData> => {
  const s = db();
  const [admins, settings, clients, movements] = await Promise.all([
    s.from('admins').select('user_id, name, country'),
    s.from('settings').select('sirrux_pct').maybeSingle(),
    s.from('clients').select('*').order('name'),
    s.from('movements').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
  ]);
  const a = check(admins) as Admin[];
  const st = check(settings) as Settings | null;
  return {
    admins: a,
    me: a.find((x) => x.user_id === userId) ?? null,
    settings: { sirrux_pct: Number(st?.sirrux_pct ?? 30) },
    clients: (check(clients) as Client[]).map(normClient),
    movements: (check(movements) as Movement[]).map(normMovement),
  };
};

type Editable<T> = Omit<T, 'id' | 'created_by' | 'created_at'>;

export const saveMovement = async (m: Editable<Movement>, id?: string) => {
  const q = id ? db().from('movements').update(m).eq('id', id) : db().from('movements').insert(m);
  check(await q);
};

export const deleteMovement = async (m: Movement) => {
  check(await db().from('movements').delete().eq('id', m.id));
  if (m.document_path) await db().storage.from(BUCKET).remove([m.document_path]);
};

export const saveClient = async (c: Editable<Client>, id?: string) => {
  const q = id ? db().from('clients').update(c).eq('id', id) : db().from('clients').insert(c);
  check(await q);
};

export const deleteClient = async (id: string) => {
  check(await db().from('clients').delete().eq('id', id));
};

export const saveSettings = async (s: Settings, userId: string) => {
  check(await db().from('settings').update({ ...s, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', 1));
};

const safeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(-80);

/** Sube un documento a documentos/<país>/<año>/<uuid>-<nombre> y devuelve su ruta. */
export const uploadDocument = async (file: File, country: string, date: string) => {
  const path = `${country}/${date.slice(0, 4)}/${crypto.randomUUID()}-${safeName(file.name)}`;
  check(await db().storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false }));
  return path;
};

export const removeDocument = async (path: string) => {
  check(await db().storage.from(BUCKET).remove([path]));
};

/** Enlace temporal (10 minutos) para ver o descargar un documento privado. */
export const documentUrl = async (path: string, download = false) => {
  const r = await db().storage.from(BUCKET).createSignedUrl(path, 600, download ? { download: true } : undefined);
  return check(r)!.signedUrl;
};

export const downloadDocument = async (path: string) => check(await db().storage.from(BUCKET).download(path)) as Blob;

export const documentName = (path: string) => path.split('/').pop()!.replace(/^[0-9a-f-]{36}-/, '');
