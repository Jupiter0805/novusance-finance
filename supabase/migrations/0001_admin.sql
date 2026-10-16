-- Panel de administración de Novusance (/admin).
-- Pégalo entero en Supabase > SQL Editor y ejecútalo una vez.
--
-- Seguridad: la web usa la clave pública (anon) de Supabase, así que TODO el control de acceso está aquí, en RLS.
-- Solo los usuarios que estén en public.admins pueden leer o escribir algo. Cualquier otro usuario autenticado
-- (si alguien llegara a registrarse) no ve nada.

-- ── Administradores ──────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  country text not null check (country in ('es', 'co')),
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- security definer: consulta admins saltándose su propia RLS, para no entrar en bucle.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admins: lectura" on public.admins;
create policy "admins: lectura" on public.admins
  for select to authenticated using (public.is_admin());
-- Altas y bajas de admins solo desde el panel de Supabase (no hay políticas de escritura).

-- ── Ajustes ──────────────────────────────────────────────────────────
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  -- Porcentaje del beneficio que va al fondo Sirrux (propuesta inicial: 30 %).
  sirrux_pct numeric(5, 2) not null default 30 check (sirrux_pct between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

alter table public.settings enable row level security;

drop policy if exists "settings: lectura" on public.settings;
create policy "settings: lectura" on public.settings
  for select to authenticated using (public.is_admin());
drop policy if exists "settings: cambio" on public.settings;
create policy "settings: cambio" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Clientes y cuotas ────────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country in ('es', 'co')),
  name text not null,
  city text,
  contact_name text,
  email text,
  phone text,
  tax_id text, -- NIF o NIT del cliente, para facturar
  fee_amount numeric(14, 2) check (fee_amount is null or fee_amount >= 0), -- cuota mensual sin impuestos
  fee_start date, -- inicio de la cuota (publicación de la web)
  fee_end date,   -- baja de la cuota; vacío = activa
  min_months int not null default 12 check (min_months >= 0),
  notes text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fee_end is null or fee_start is null or fee_end >= fee_start)
);

alter table public.clients enable row level security;

drop policy if exists "clients: admins" on public.clients;
create policy "clients: admins" on public.clients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Movimientos (ingresos y gastos) ──────────────────────────────────
create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country in ('es', 'co')),
  currency text not null check (currency in ('EUR', 'COP')),
  kind text not null check (kind in ('ingreso', 'gasto')),
  date date not null,
  category text not null,
  concept text not null,
  counterparty text,     -- cliente o proveedor
  invoice_number text,
  client_id uuid references public.clients (id) on delete set null,
  base_amount numeric(14, 2) not null check (base_amount >= 0), -- importe sin impuestos
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0),
  tax_amount numeric(14, 2) not null default 0 check (tax_amount >= 0), -- IVA (repercutido o soportado)
  withholding_rate numeric(5, 2) not null default 0 check (withholding_rate >= 0),
  withholding_amount numeric(14, 2) not null default 0 check (withholding_amount >= 0), -- retención de IRPF
  -- Gasto directo de un cliente (dominio, hosting, fotos...): resta del beneficio que se reparte con Sirrux.
  direct_cost boolean not null default false,
  -- Gasto de Sirrux pagado con el fondo (herramientas, publicidad...): resta del saldo del fondo.
  sirrux boolean not null default false,
  -- Gasto deducible en impuestos (España: IVA soportado y gasto de IRPF).
  deductible boolean not null default true,
  document_path text, -- ruta en el bucket "documentos"
  notes text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((country = 'es' and currency = 'EUR') or (country = 'co' and currency = 'COP')),
  check (kind = 'gasto' or (direct_cost = false and sirrux = false))
);

create index if not exists movements_country_date on public.movements (country, date);
create index if not exists movements_client on public.movements (client_id);

alter table public.movements enable row level security;

drop policy if exists "movements: admins" on public.movements;
create policy "movements: admins" on public.movements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();
drop trigger if exists movements_touch on public.movements;
create trigger movements_touch before update on public.movements
  for each row execute function public.touch_updated_at();

-- ── Permisos de la API ───────────────────────────────────────────────
-- El proyecto se crea sin exponer tablas automáticamente: aquí se da acceso explícito y mínimo.
-- Los anónimos no tienen ningún permiso; los usuarios con sesión, solo lo que usa el panel (y RLS filtra a los admins).
revoke all on public.admins, public.settings, public.clients, public.movements from anon;
grant usage on schema public to authenticated;
grant select on public.admins to authenticated;
grant select, update on public.settings to authenticated;
grant select, insert, update, delete on public.clients, public.movements to authenticated;
-- Por si el proyecto los concede por defecto: TRUNCATE se salta RLS y los demás no hacen falta.
revoke truncate, references, trigger on public.admins, public.settings, public.clients, public.movements from authenticated;
-- Función que crea Supabase con «Enable automatic RLS»: no debe poder llamarse por la API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- ── Documentos (facturas y tickets) ──────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "documentos: lectura" on storage.objects;
create policy "documentos: lectura" on storage.objects
  for select to authenticated using (bucket_id = 'documentos' and public.is_admin());
drop policy if exists "documentos: subida" on storage.objects;
create policy "documentos: subida" on storage.objects
  for insert to authenticated with check (bucket_id = 'documentos' and public.is_admin());
drop policy if exists "documentos: cambio" on storage.objects;
create policy "documentos: cambio" on storage.objects
  for update to authenticated using (bucket_id = 'documentos' and public.is_admin());
drop policy if exists "documentos: borrado" on storage.objects;
create policy "documentos: borrado" on storage.objects
  for delete to authenticated using (bucket_id = 'documentos' and public.is_admin());
