import type { TargetedEvent } from 'preact';
import { useState } from 'preact/hooks';
import type { Scope } from './App';
import { sirruxFund } from './calc';
import { errorText, saveSettings, type AllData } from './data';
import { COUNTRY_NAME, scopeCountries } from './model';
import { Empty, Money, Notice, monthText } from './ui';

export function Sirrux({
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
  const [pct, setPct] = useState(String(data.settings.sirrux_pct));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const pctN = Number(pct.replace(',', '.'));

  const save = async (e: TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!(pctN >= 0 && pctN <= 100)) return setMsg({ kind: 'error', text: 'El porcentaje tiene que estar entre 0 y 100.' });
    if (!confirm(`¿Cambiar el porcentaje del fondo a ${pctN} %? Se recalcula todo el histórico con el nuevo valor.`)) return;
    setBusy(true);
    try {
      await saveSettings({ sirrux_pct: pctN }, userId);
      await reload();
      setMsg({ kind: 'ok', text: 'Porcentaje guardado.' });
    } catch (err) {
      setMsg({ kind: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="stack">
      <h1 class="page-title">Fondo Sirrux</h1>
      <p class="muted lead">
        Cada mes se aparta el {data.settings.sirrux_pct} % del beneficio (ingresos menos gastos directos de clientes) de cada
        país. Los gastos marcados como «Pagado con el fondo Sirrux» se restan del saldo. Cada parte se guarda en su país:
        no se convierte de moneda.
      </p>

      <form class="inline-form" onSubmit={save}>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <label>
          Porcentaje para Sirrux
          <input inputMode="decimal" value={pct} onInput={(e) => setPct(e.currentTarget.value)} /> %
        </label>
        <button type="submit" class="btn" disabled={busy || pctN === data.settings.sirrux_pct}>
          Guardar
        </button>
      </form>

      {countries.map((c) => {
        const months = sirruxFund(data.movements, c, data.settings.sirrux_pct);
        const last = months[months.length - 1];
        const contributed = months.reduce((a, m) => a + m.contribution, 0);
        const spent = months.reduce((a, m) => a + m.spent, 0);
        return (
          <section class="panel">
            <div class="panel-head">
              <h2>{COUNTRY_NAME[c]}</h2>
              <div class="kv inline">
                <span>Aportado</span>
                <Money country={c} value={contributed} />
                <span>Gastado</span>
                <Money country={c} value={spent} />
                <span>Saldo</span>
                <Money country={c} value={last?.balance ?? 0} strong />
              </div>
            </div>
            {months.length === 0 ? (
              <Empty>Sin movimientos todavía.</Empty>
            ) : (
              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th class="num">Ingresos</th>
                      <th class="num">Gastos directos</th>
                      <th class="num">Beneficio</th>
                      <th class="num">Para Sirrux</th>
                      <th class="num">Gastos de Sirrux</th>
                      <th class="num">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...months].reverse().map((m) => (
                      <tr>
                        <td class="nowrap cap">{monthText(m.month)}</td>
                        <td class="num">
                          <Money country={c} value={m.income} />
                        </td>
                        <td class="num">
                          <Money country={c} value={m.directCosts} />
                        </td>
                        <td class="num">
                          <Money country={c} value={m.profit} />
                        </td>
                        <td class="num">
                          <Money country={c} value={m.contribution} />
                        </td>
                        <td class="num">
                          <Money country={c} value={-m.spent} />
                        </td>
                        <td class="num">
                          <Money country={c} value={m.balance} strong />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
      <p class="muted small">
        Los meses con pérdidas no aportan nada ni restan del fondo. Recuerda: lo que se aparta para Sirrux también tributa
        en el país de quien lo factura.
      </p>
    </div>
  );
}
