import type { TargetedEvent } from 'preact';
import { useState } from 'preact/hooks';
import type { Scope } from './App';
import { commitmentEnd, feeStatus, mrr, round2, totals, type FeeStatus } from './calc';
import { deleteClient, errorText, saveClient, type AllData } from './data';
import { COUNTRY_NAME, CURRENCY, scopeCountries, type Client, type Country } from './model';
import { Empty, Field, Modal, Money, Notice, dateText, today } from './ui';

const STATUS: Record<FeeStatus, string> = {
  activa: 'Cuota activa',
  pendiente: 'Cuota por empezar',
  baja: 'Baja',
  sin_cuota: 'Sin cuota',
};

export function Clients({ data, scope, reload }: { data: AllData; scope: Scope; reload: () => Promise<void> }) {
  const countries = scopeCountries(scope);
  const now = today();
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);
  const list = data.clients.filter((c) => countries.includes(c.country));

  return (
    <div class="stack">
      <div class="page-head">
        <h1 class="page-title">Clientes</h1>
        <button type="button" class="btn primary" onClick={() => setEditing(null)}>
          Añadir cliente
        </button>
      </div>

      <div class="sums">
        {countries.map((c) => (
          <div>
            {COUNTRY_NAME[c]}: {data.clients.filter((x) => x.country === c && feeStatus(x, now) === 'activa').length} cuotas
            activas · <Money country={c} value={mrr(data.clients, c, now)} strong /> al mes
          </div>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty>Aún no hay clientes. Añade la primera clínica cuando acepte el presupuesto.</Empty>
      ) : (
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Clínica</th>
                <th>Estado</th>
                <th class="num">Cuota</th>
                <th>Desde</th>
                <th>Fin de permanencia</th>
                <th class="num">Facturado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const st = feeStatus(c, now);
                const end = commitmentEnd(c);
                const billed = totals(data.movements.filter((m) => m.client_id === c.id)).income;
                return (
                  <tr>
                    <td>
                      <button type="button" class="row-link" onClick={() => setEditing(c)}>
                        {c.name}
                      </button>
                      <div class="muted small">
                        {c.country.toUpperCase()}
                        {c.city && ` · ${c.city}`}
                        {c.contact_name && ` · ${c.contact_name}`}
                      </div>
                    </td>
                    <td>
                      <span class={`tag ${st === 'activa' ? 'ok' : st === 'baja' ? '' : 'accent'}`}>{STATUS[st]}</span>
                    </td>
                    <td class="num">{c.fee_amount ? <Money country={c.country} value={c.fee_amount} /> : '—'}</td>
                    <td class="nowrap">{c.fee_start ? dateText(c.fee_start) : '—'}</td>
                    <td class="nowrap">
                      {end ? (
                        <span class={st === 'activa' && end > now ? '' : 'muted'}>{dateText(end)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td class="num">
                      <Money country={c.country} value={billed} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && (
        <ClientForm
          client={editing}
          defaultCountry={scope === 'all' ? (data.me?.country ?? 'es') : scope}
          hasMovements={Boolean(editing && data.movements.some((m) => m.client_id === editing.id))}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            setEditing(undefined);
            await reload();
          }}
        />
      )}
    </div>
  );
}

export function ClientForm({
  client,
  prefill,
  defaultCountry,
  hasMovements,
  onClose,
  onSaved,
}: {
  client: Client | null;
  /** Datos de partida para un cliente nuevo (p. ej. desde un mensaje de la web). */
  prefill?: Partial<Client>;
  defaultCountry: Country;
  hasMovements: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = client;
  const p = prefill ?? {};
  const [country, setCountry] = useState<Country>(c?.country ?? p.country ?? defaultCountry);
  const [name, setName] = useState(c?.name ?? p.name ?? '');
  const [city, setCity] = useState(c?.city ?? p.city ?? '');
  const [contact, setContact] = useState(c?.contact_name ?? p.contact_name ?? '');
  const [email, setEmail] = useState(c?.email ?? p.email ?? '');
  const [phone, setPhone] = useState(c?.phone ?? p.phone ?? '');
  const [taxId, setTaxId] = useState(c?.tax_id ?? '');
  const [fee, setFee] = useState(c?.fee_amount != null ? String(c.fee_amount) : '');
  const [feeStart, setFeeStart] = useState(c?.fee_start ?? '');
  const [feeEnd, setFeeEnd] = useState(c?.fee_end ?? '');
  const [minMonths, setMinMonths] = useState(String(c?.min_months ?? 12));
  const [notes, setNotes] = useState(c?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const feeN = fee.trim() ? Number(fee.replace(',', '.')) : null;
    if (feeN !== null && !(feeN >= 0)) return setError('Revisa la cuota: tiene que ser un número.');
    if (feeN && !feeStart) return setError('Indica desde cuándo se cobra la cuota.');
    if (feeEnd && feeStart && feeEnd < feeStart) return setError('La baja no puede ser anterior al inicio de la cuota.');
    setBusy(true);
    try {
      await saveClient(
        {
          country,
          name: name.trim(),
          city: city.trim() || null,
          contact_name: contact.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          tax_id: taxId.trim() || null,
          fee_amount: feeN === null ? null : round2(feeN),
          fee_start: feeStart || null,
          fee_end: feeEnd || null,
          min_months: Number(minMonths) || 0,
          notes: notes.trim() || null,
        },
        c?.id,
      );
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!c) return;
    const msg = hasMovements
      ? `¿Borrar «${c.name}»? Sus movimientos se conservan, pero dejarán de estar asociados a este cliente.`
      : `¿Borrar «${c.name}»?`;
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      await deleteClient(c.id);
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={c ? c.name : 'Añadir cliente'} onClose={onClose}>
      <form class="form" onSubmit={submit}>
        {error && <Notice kind="error">{error}</Notice>}
        <div class="seg big" role="group" aria-label="País">
          {(['es', 'co'] as Country[]).map((k) => (
            <button type="button" aria-pressed={country === k} onClick={() => setCountry(k)}>
              {COUNTRY_NAME[k]}
            </button>
          ))}
        </div>
        <div class="grid2">
          <Field label="Nombre de la clínica" wide>
            <input required maxLength={200} value={name} onInput={(e) => setName(e.currentTarget.value)} />
          </Field>
          <Field label="Ciudad">
            <input maxLength={100} value={city} onInput={(e) => setCity(e.currentTarget.value)} />
          </Field>
          <Field label={country === 'es' ? 'NIF / CIF' : 'NIT'}>
            <input maxLength={40} value={taxId} onInput={(e) => setTaxId(e.currentTarget.value)} />
          </Field>
          <Field label="Persona de contacto">
            <input maxLength={120} value={contact} onInput={(e) => setContact(e.currentTarget.value)} />
          </Field>
          <Field label="Teléfono">
            <input type="tel" maxLength={40} value={phone} onInput={(e) => setPhone(e.currentTarget.value)} />
          </Field>
          <Field label="Email" wide>
            <input type="email" maxLength={200} value={email} onInput={(e) => setEmail(e.currentTarget.value)} />
          </Field>
        </div>
        <fieldset class="group">
          <legend>Cuota de mantenimiento</legend>
          <div class="grid2">
            <Field label={`Cuota mensual sin impuestos (${CURRENCY[country]})`} hint="Vacío si no paga cuota.">
              <input inputMode="decimal" value={fee} onInput={(e) => setFee(e.currentTarget.value)} />
            </Field>
            <Field label="Permanencia (meses)">
              <input type="number" min={0} max={60} value={minMonths} onInput={(e) => setMinMonths(e.currentTarget.value)} />
            </Field>
            <Field label="Inicio" hint="Normalmente, el día que se publica la web.">
              <input type="date" value={feeStart} onInput={(e) => setFeeStart(e.currentTarget.value)} />
            </Field>
            <Field label="Baja" hint="Vacío mientras siga activa.">
              <input type="date" value={feeEnd} onInput={(e) => setFeeEnd(e.currentTarget.value)} />
            </Field>
          </div>
        </fieldset>
        <Field label="Notas" wide>
          <textarea rows={2} maxLength={2000} value={notes} onInput={(e) => setNotes(e.currentTarget.value)} />
        </Field>
        <div class="form-actions">
          {c && (
            <button type="button" class="btn danger" onClick={remove} disabled={busy}>
              Borrar
            </button>
          )}
          <span class="spacer" />
          <button type="button" class="btn" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" class="btn primary" disabled={busy}>
            {busy ? 'Guardando…' : c ? 'Guardar cambios' : 'Añadir'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
