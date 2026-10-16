import { useState } from 'preact/hooks';
import type { Scope } from './App';
import { ClientForm } from './Clients';
import { deleteMessage, errorText, updateMessage, type AllData } from './data';
import { COUNTRY_NAME, MESSAGE_STATUS, scopeCountries, type Message, type MessageStatus } from './model';
import { Empty, Field, Modal, Notice } from './ui';

const when = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Enlace de WhatsApp a partir del teléfono; si no trae prefijo, se usa el del país. */
const whatsapp = (m: Message) => {
  if (!m.phone) return null;
  let digits = m.phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else digits = (m.country === 'es' ? '34' : '57') + digits;
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
};

export function Messages({
  data,
  scope,
  reload,
  userId,
}: {
  data: AllData;
  scope: Scope;
  reload: () => Promise<void>;
  userId: string;
}) {
  const countries = scopeCountries(scope);
  const [filter, setFilter] = useState<'abiertos' | MessageStatus | 'todos'>('abiertos');
  const [open, setOpen] = useState<Message | null>(null);
  const names = Object.fromEntries(data.admins.map((a) => [a.user_id, a.name]));

  const own = data.messages.filter((m) => countries.includes(m.country));
  const list = own.filter((m) =>
    filter === 'todos' ? true : filter === 'abiertos' ? m.status !== 'cerrado' : m.status === filter,
  );
  const count = (s: MessageStatus) => own.filter((m) => m.status === s).length;

  return (
    <div class="stack">
      <div class="page-head">
        <h1 class="page-title">Mensajes</h1>
      </div>
      <p class="muted lead">
        Las solicitudes del formulario de la web llegan aquí. Márcalas en curso cuando contactes y cerradas cuando acaben.
      </p>

      <div class="filters">
        <div class="seg" role="group" aria-label="Estado">
          <button type="button" aria-pressed={filter === 'abiertos'} onClick={() => setFilter('abiertos')}>
            Pendientes ({count('nuevo') + count('en_curso')})
          </button>
          <button type="button" aria-pressed={filter === 'nuevo'} onClick={() => setFilter('nuevo')}>
            Nuevos ({count('nuevo')})
          </button>
          <button type="button" aria-pressed={filter === 'cerrado'} onClick={() => setFilter('cerrado')}>
            Cerrados
          </button>
          <button type="button" aria-pressed={filter === 'todos'} onClick={() => setFilter('todos')}>
            Todos
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <Empty>
          {own.length === 0
            ? 'Todavía no ha llegado ningún mensaje desde la web.'
            : 'No hay mensajes con este filtro.'}
        </Empty>
      ) : (
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Recibido</th>
                <th>Clínica</th>
                <th class="hide-sm">Mensaje</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr class={m.status === 'nuevo' ? 'unread' : ''}>
                  <td class="nowrap">{when(m.created_at)}</td>
                  <td>
                    <button type="button" class="row-link" onClick={() => setOpen(m)}>
                      {m.clinic}
                    </button>
                    <div class="muted small">
                      {m.country.toUpperCase()} · {m.name}
                    </div>
                  </td>
                  <td class="hide-sm muted">
                    <div class="clamp">{m.message || '—'}</div>
                  </td>
                  <td>
                    <span class={`tag ${m.status === 'nuevo' ? 'warn' : m.status === 'en_curso' ? 'accent' : ''}`}>
                      {MESSAGE_STATUS[m.status]}
                    </span>
                    {m.handled_by && <div class="muted small">{names[m.handled_by] ?? ''}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <MessageDetail
          data={data}
          message={open}
          userId={userId}
          onClose={() => setOpen(null)}
          onSaved={async () => {
            setOpen(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function MessageDetail({
  data,
  message: m,
  userId,
  onClose,
  onSaved,
}: {
  data: AllData;
  message: Message;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<MessageStatus>(m.status === 'nuevo' ? 'en_curso' : m.status);
  const [notes, setNotes] = useState(m.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const wa = whatsapp(m);
  const client = data.clients.find((c) => c.id === m.client_id);

  const save = async (patch: Parameters<typeof updateMessage>[1]) => {
    setBusy(true);
    setError('');
    try {
      await updateMessage(m.id, patch, userId);
      onSaved();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`¿Borrar el mensaje de ${m.clinic}? No se puede deshacer.`)) return;
    setBusy(true);
    try {
      await deleteMessage(m.id);
      onSaved();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  if (creating) {
    return (
      <ClientForm
        client={null}
        prefill={{ country: m.country, name: m.clinic, contact_name: m.name, email: m.email, phone: m.phone }}
        defaultCountry={m.country}
        hasMovements={false}
        onClose={() => setCreating(false)}
        onSaved={() => save({ status: 'cerrado', notes: notes.trim() || null })}
      />
    );
  }

  return (
    <Modal title={m.clinic} onClose={onClose}>
      <div class="form">
        {error && <Notice kind="error">{error}</Notice>}
        <div class="kv">
          <span>Persona</span>
          <span>{m.name}</span>
          <span>País</span>
          <span>{COUNTRY_NAME[m.country]}</span>
          <span>Recibido</span>
          <span>{when(m.created_at)}</span>
          {client && (
            <>
              <span>Cliente</span>
              <span>{client.name}</span>
            </>
          )}
        </div>
        {m.message && <blockquote class="quote">{m.message}</blockquote>}
        <div class="actions">
          <a class="btn small" href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Tu web · ${m.clinic}`)}`}>
            Escribir a {m.email}
          </a>
          {m.phone && (
            <a class="btn small" href={`tel:${m.phone.replace(/[^\d+]/g, '')}`}>
              Llamar · {m.phone}
            </a>
          )}
          {wa && (
            <a class="btn small" href={wa} target="_blank" rel="noopener">
              WhatsApp
            </a>
          )}
        </div>

        <div class="seg big" role="group" aria-label="Estado">
          {(Object.keys(MESSAGE_STATUS) as MessageStatus[]).map((s) => (
            <button type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {MESSAGE_STATUS[s]}
            </button>
          ))}
        </div>
        <Field label="Notas internas" hint="Solo las veis Carlos y tú." wide>
          <textarea rows={3} maxLength={2000} value={notes} onInput={(e) => setNotes(e.currentTarget.value)} />
        </Field>

        <div class="form-actions">
          <button type="button" class="btn danger" onClick={remove} disabled={busy}>
            Borrar
          </button>
          {!client && (
            <button type="button" class="btn" onClick={() => setCreating(true)} disabled={busy}>
              Crear cliente
            </button>
          )}
          <span class="spacer" />
          <button type="button" class="btn" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            class="btn primary"
            disabled={busy}
            onClick={() => save({ status, notes: notes.trim() || null })}
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
