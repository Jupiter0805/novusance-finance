-- Mensajes del formulario de contacto de la web, para verlos en el panel /admin.
-- Requiere 0001_admin.sql. Se puede ejecutar más de una vez.
--
-- Los mensajes los inserta SOLO el servidor (endpoint /api/contact, con la clave secreta de Supabase, que se salta RLS)
-- después de verificar el antispam. Desde el navegador nadie puede insertar: no hay política ni permiso de INSERT.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country in ('es', 'co')),
  name text not null,
  clinic text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'nuevo' check (status in ('nuevo', 'en_curso', 'cerrado')),
  notes text,
  client_id uuid references public.clients (id) on delete set null,
  handled_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists messages_status_created on public.messages (status, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages: lectura" on public.messages;
create policy "messages: lectura" on public.messages
  for select to authenticated using (public.is_admin());
drop policy if exists "messages: cambio" on public.messages;
create policy "messages: cambio" on public.messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "messages: borrado" on public.messages;
create policy "messages: borrado" on public.messages
  for delete to authenticated using (public.is_admin());

drop trigger if exists messages_touch on public.messages;
create trigger messages_touch before update on public.messages
  for each row execute function public.touch_updated_at();

revoke all on public.messages from anon;
revoke all on public.messages from authenticated;
grant select, update, delete on public.messages to authenticated;
-- El servidor inserta con la clave secreta (rol service_role).
grant select, insert, update, delete on public.messages to service_role;
