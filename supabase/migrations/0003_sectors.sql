-- Sector de cada mensaje y de cada cliente (slug de src/data/sectors.ts, p. ej. 'fisioterapeutas-y-osteopatas').
-- Vacío = sin sector (mensajes enviados desde la portada general). Se puede ejecutar más de una vez.
-- Sin restricción de valores: la lista de sectores vive en el código y puede crecer.

alter table public.messages add column if not exists sector text;
alter table public.clients add column if not exists sector text;
