import { useMemo, useState } from 'preact/hooks';
import type { Scope } from './App';
import { inPeriod, periodSummary, quarterPeriod, spainQuarter, toCsv, yearOf, yearPeriod, type Period } from './calc';
import { documentName, downloadDocument, errorText, type AllData } from './data';
import { COUNTRY_NAME, SPAIN_DEADLINES, categoryLabel, scopeCountries, type Country, type Movement } from './model';
import { Money, Notice, dateText, monthText, saveFile, today } from './ui';

export function Taxes({ data, scope }: { data: AllData; scope: Scope }) {
  const countries = scopeCountries(scope);
  const now = today();
  const thisYear = Number(now.slice(0, 4));
  const years = useMemo(
    () => [...new Set([thisYear, ...data.movements.map((m) => yearOf(m.date))])].sort((a, b) => b - a),
    [data.movements],
  );
  const [year, setYear] = useState(thisYear);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const names = Object.fromEntries(data.admins.map((a) => [a.user_id, a.name]));

  const exportCsv = (country: Country, p: Period, label: string) => {
    const list = data.movements
      .filter((m) => m.country === country && inPeriod(m, p))
      .sort((a, b) => a.date.localeCompare(b.date));
    const rows: (string | number | boolean | null)[][] = [
      [
        'Fecha',
        'Tipo',
        'Categoría',
        'Concepto',
        'Cliente o proveedor',
        'Nº factura',
        'Base',
        'IVA %',
        'IVA',
        'Retención %',
        'Retención',
        'Total',
        'Moneda',
        'Deducible',
        'Gasto directo',
        'Fondo Sirrux',
        'Documento',
        'Subido por',
        'Notas',
      ],
      ...list.map((m) => [
        m.date,
        m.kind === 'ingreso' ? 'Ingreso' : 'Gasto',
        categoryLabel(m.category),
        m.concept,
        m.counterparty,
        m.invoice_number,
        m.base_amount,
        m.tax_rate,
        m.tax_amount,
        m.withholding_rate,
        m.withholding_amount,
        Math.round((m.base_amount + m.tax_amount - m.withholding_amount) * 100) / 100,
        m.currency,
        m.kind === 'gasto' ? m.deductible : null,
        m.kind === 'gasto' ? m.direct_cost : null,
        m.kind === 'gasto' ? m.sirrux : null,
        m.document_path ? zipName(m) : 'FALTA',
        names[m.created_by ?? ''] ?? '',
        m.notes,
      ]),
    ];
    saveFile(toCsv(rows), `novusance-${country}-${label}.csv`);
  };

  const exportZip = async (country: Country, p: Period, label: string) => {
    setError('');
    const list = data.movements.filter((m) => m.country === country && inPeriod(m, p) && m.document_path);
    if (list.length === 0) return setError('No hay documentos en ese periodo.');
    setBusy(`${country}-${label}`);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const m of list) {
        const blob = await downloadDocument(m.document_path!);
        zip.file(`${m.kind === 'ingreso' ? 'emitidas' : 'recibidas'}/${zipName(m)}`, blob);
      }
      saveFile(await zip.generateAsync({ type: 'blob' }), `novusance-${country}-${label}-facturas.zip`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  };

  const Exports = ({ country, p, label }: { country: Country; p: Period; label: string }) => (
    <div class="actions">
      <button type="button" class="btn small" onClick={() => exportCsv(country, p, label)}>
        Descargar CSV
      </button>
      <button type="button" class="btn small" disabled={busy !== ''} onClick={() => exportZip(country, p, label)}>
        {busy === `${country}-${label}` ? 'Preparando…' : 'Descargar facturas (ZIP)'}
      </button>
    </div>
  );

  const missing = (country: Country, p: Period) =>
    data.movements.filter((m) => m.country === country && inPeriod(m, p) && !m.document_path).length;

  return (
    <div class="stack">
      <div class="page-head">
        <h1 class="page-title">Impuestos</h1>
        <select aria-label="Año" value={String(year)} onChange={(e) => setYear(Number(e.currentTarget.value))}>
          {years.map((y) => (
            <option value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
      <Notice kind="warn">
        Cifras orientativas calculadas con lo registrado aquí, para preparar los pagos y pasárselo a la gestoría o al contador.
        No sustituyen su revisión.
      </Notice>
      {error && <Notice kind="error">{error}</Notice>}

      {countries.includes('es') && (
        <section class="panel">
          <h2>España · IVA (modelo 303) e IRPF (modelo 130)</h2>
          <div class="quarters">
            {[1, 2, 3, 4].map((q) => {
              const s = spainQuarter(data.movements, year, q);
              const p = quarterPeriod(year, q);
              const deadline = SPAIN_DEADLINES[q](year);
              const miss = missing('es', p);
              const closed = p.to < now;
              return (
                <article class="quarter">
                  <h3>
                    T{q} <span class="muted small">· presentar hasta el {dateText(deadline)}</span>
                  </h3>
                  <div class="kv">
                    <span>IVA repercutido</span>
                    <Money country="es" value={s.vatCharged} />
                    <span>IVA soportado deducible</span>
                    <Money country="es" value={-s.vatDeductible} />
                    <span>Resultado 303</span>
                    <Money country="es" value={s.vatResult} strong />
                    <span>Rendimiento acumulado</span>
                    <Money country="es" value={s.ytdNetIncome} />
                    <span>Retenciones acumuladas</span>
                    <Money country="es" value={-s.ytdWithholdings} />
                    <span>Pago 130 estimado</span>
                    <Money country="es" value={s.irpfPayment} strong />
                  </div>
                  {miss > 0 && <p class="warn-text small">{miss} movimientos sin factura adjunta.</p>}
                  {!closed && <p class="muted small">Trimestre en curso.</p>}
                  <Exports country="es" p={p} label={`${year}-T${q}`} />
                </article>
              );
            })}
          </div>
          <p class="muted small">
            Resultado 303 positivo: a ingresar; negativo: a compensar. El 130 aplica el 20 % al rendimiento acumulado del año y
            resta retenciones y pagos de trimestres anteriores.
          </p>
        </section>
      )}

      {countries.includes('co') && (
        <section class="panel">
          <h2>{COUNTRY_NAME.co} · resumen por mes</h2>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th class="num">Ingresos</th>
                  <th class="num">IVA cobrado</th>
                  <th class="num">Gastos</th>
                  <th class="num">IVA pagado</th>
                  <th class="num">Resultado</th>
                  <th>Sin factura</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => {
                  const ym = `${year}-${String(i + 1).padStart(2, '0')}`;
                  const last = new Date(Date.UTC(year, i + 1, 0)).getUTCDate();
                  const p = { from: `${ym}-01`, to: `${ym}-${last}` };
                  const s = periodSummary(data.movements, 'co', p);
                  return { ym, s, miss: missing('co', p) };
                })
                  .filter(({ s, miss }) => s.income || s.expenses || miss)
                  .map(({ ym, s, miss }) => (
                    <tr>
                      <td class="cap nowrap">{monthText(ym)}</td>
                      <td class="num">
                        <Money country="co" value={s.income} />
                      </td>
                      <td class="num">
                        <Money country="co" value={s.taxCharged} />
                      </td>
                      <td class="num">
                        <Money country="co" value={s.expenses} />
                      </td>
                      <td class="num">
                        <Money country="co" value={s.taxPaid} />
                      </td>
                      <td class="num">
                        <Money country="co" value={s.result} strong />
                      </td>
                      <td>{miss ? <span class="tag warn">{miss}</span> : '—'}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                {(() => {
                  const s = periodSummary(data.movements, 'co', yearPeriod(year));
                  return (
                    <tr>
                      <th>Total {year}</th>
                      <td class="num">
                        <Money country="co" value={s.income} strong />
                      </td>
                      <td class="num">
                        <Money country="co" value={s.taxCharged} />
                      </td>
                      <td class="num">
                        <Money country="co" value={s.expenses} strong />
                      </td>
                      <td class="num">
                        <Money country="co" value={s.taxPaid} />
                      </td>
                      <td class="num">
                        <Money country="co" value={s.result} strong />
                      </td>
                      <td></td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
          <Exports country="co" p={yearPeriod(year)} label={String(year)} />
          <p class="muted small">
            Los periodos y declaraciones dependen del régimen de Carlos (IVA bimestral o cuatrimestral, renta anual): su
            contador decide. Aquí tiene todo lo necesario por mes y el año completo para exportar.
          </p>
        </section>
      )}

      {countries.includes('es') && (
        <section class="panel">
          <h2>España · año completo</h2>
          <p class="muted small">Para la declaración de la renta y el resumen anual de IVA (modelo 390).</p>
          <Exports country="es" p={yearPeriod(year)} label={String(year)} />
        </section>
      )}
    </div>
  );
}

/** Nombre del archivo dentro del ZIP: fecha, concepto y nombre original, sin caracteres raros. */
const zipName = (m: Movement) => {
  const clean = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);
  const file = documentName(m.document_path!);
  const dot = file.lastIndexOf('.');
  const ext = dot > 0 ? file.slice(dot).toLowerCase().replace(/[^.\w]/g, '') : '';
  return `${m.date}_${clean(m.concept)}_${m.id.slice(0, 8)}${ext}`;
};
