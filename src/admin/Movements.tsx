import { useMemo, useState } from 'preact/hooks';
import type { Scope } from './App';
import { quarterOf, totals, yearOf } from './calc';
import { documentUrl, errorText, type AllData } from './data';
import { MovementForm } from './MovementForm';
import { CURRENCY, EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryLabel, scopeCountries, type Movement } from './model';
import { Empty, Money, Notice, dateText, today } from './ui';

export function Movements({ data, scope, reload }: { data: AllData; scope: Scope; reload: () => Promise<void> }) {
  const countries = scopeCountries(scope);
  const thisYear = Number(today().slice(0, 4));
  const years = useMemo(
    () => [...new Set([thisYear, ...data.movements.map((m) => yearOf(m.date))])].sort((a, b) => b - a),
    [data.movements],
  );
  const [kind, setKind] = useState<'all' | 'ingreso' | 'gasto'>('all');
  const [year, setYear] = useState(String(thisYear));
  const [quarter, setQuarter] = useState('all');
  const [category, setCategory] = useState('all');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Movement | null | undefined>(undefined);
  const [error, setError] = useState('');

  const names = Object.fromEntries(data.admins.map((a) => [a.user_id, a.name]));
  const clientName = Object.fromEntries(data.clients.map((c) => [c.id, c.name]));

  const list = data.movements.filter((m) => {
    if (!countries.includes(m.country)) return false;
    if (kind !== 'all' && m.kind !== kind) return false;
    if (year !== 'all' && yearOf(m.date) !== Number(year)) return false;
    if (quarter !== 'all' && quarterOf(m.date) !== Number(quarter)) return false;
    if (category !== 'all' && m.category !== category) return false;
    if (onlyMissing && m.document_path) return false;
    if (q) {
      const hay = `${m.concept} ${m.counterparty ?? ''} ${m.invoice_number ?? ''} ${m.notes ?? ''} ${clientName[m.client_id ?? ''] ?? ''}`;
      if (!hay.toLowerCase().includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const openDoc = async (m: Movement) => {
    try {
      window.open(await documentUrl(m.document_path!), '_blank', 'noopener');
    } catch (e) {
      setError(errorText(e));
    }
  };

  const defaultCountry = scope === 'all' ? (data.me?.country ?? 'es') : scope;

  return (
    <div class="stack">
      <div class="page-head">
        <h1 class="page-title">Movimientos</h1>
        <button type="button" class="btn primary" onClick={() => setEditing(null)}>
          Añadir movimiento
        </button>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      <div class="filters">
        <div class="seg" role="group" aria-label="Tipo">
          {(
            [
              ['all', 'Todo'],
              ['ingreso', 'Ingresos'],
              ['gasto', 'Gastos'],
            ] as const
          ).map(([k, l]) => (
            <button type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {l}
            </button>
          ))}
        </div>
        <select aria-label="Año" value={year} onChange={(e) => setYear(e.currentTarget.value)}>
          <option value="all">Todos los años</option>
          {years.map((y) => (
            <option value={String(y)}>{y}</option>
          ))}
        </select>
        <select aria-label="Trimestre" value={quarter} onChange={(e) => setQuarter(e.currentTarget.value)}>
          <option value="all">Todo el año</option>
          {[1, 2, 3, 4].map((t) => (
            <option value={String(t)}>T{t}</option>
          ))}
        </select>
        <select aria-label="Categoría" value={category} onChange={(e) => setCategory(e.currentTarget.value)}>
          <option value="all">Todas las categorías</option>
          <optgroup label="Ingresos">
            {Object.entries(INCOME_CATEGORIES).map(([k, v]) => (
              <option value={k}>{v}</option>
            ))}
          </optgroup>
          <optgroup label="Gastos">
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
              <option value={k}>{v}</option>
            ))}
          </optgroup>
        </select>
        <label class="check-inline">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.currentTarget.checked)} />
          Solo sin factura
        </label>
        <input type="search" placeholder="Buscar…" aria-label="Buscar" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
      </div>

      <div class="sums">
        {countries.map((c) => {
          const t = totals(list.filter((m) => m.country === c));
          return (
            <div>
              <span class="muted">{CURRENCY[c]}</span> Ingresos <Money country={c} value={t.income} /> · Gastos{' '}
              <Money country={c} value={t.expenses} /> · Resultado <Money country={c} value={t.result} strong />
            </div>
          );
        })}
      </div>

      {list.length === 0 ? (
        <Empty>
          {data.movements.length === 0
            ? 'Aún no hay movimientos. Añade el primero con su factura.'
            : 'Ningún movimiento con estos filtros.'}
        </Empty>
      ) : (
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th class="hide-sm">Categoría</th>
                <th class="num">Base</th>
                <th class="num hide-sm">IVA</th>
                <th>Factura</th>
                <th class="hide-sm">Subido por</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr class={m.kind}>
                  <td class="nowrap">{dateText(m.date)}</td>
                  <td>
                    <button type="button" class="row-link" onClick={() => setEditing(m)}>
                      {m.concept}
                    </button>
                    <div class="muted small">
                      {m.country.toUpperCase()} · {m.kind === 'ingreso' ? 'Ingreso' : 'Gasto'}
                      {m.counterparty && ` · ${m.counterparty}`}
                      {m.direct_cost && <span class="tag">Directo</span>}
                      {m.sirrux && <span class="tag accent">Sirrux</span>}
                      {m.kind === 'gasto' && !m.deductible && <span class="tag">No deducible</span>}
                    </div>
                  </td>
                  <td class="hide-sm">{categoryLabel(m.category)}</td>
                  <td class="num">
                    <Money country={m.country} value={m.kind === 'gasto' ? -m.base_amount : m.base_amount} />
                  </td>
                  <td class="num hide-sm">
                    <Money country={m.country} value={m.tax_amount} />
                  </td>
                  <td>
                    {m.document_path ? (
                      <button type="button" class="link-btn" onClick={() => openDoc(m)}>
                        Ver
                      </button>
                    ) : (
                      <span class="tag warn">Falta</span>
                    )}
                  </td>
                  <td class="muted hide-sm">{names[m.created_by ?? ''] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && (
        <MovementForm
          data={data}
          movement={editing}
          defaultCountry={defaultCountry}
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
