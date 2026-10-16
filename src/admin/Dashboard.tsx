import type { Scope } from './App';
import { feeStatus, inPeriod, mrr, quarterOf, sirruxFund, spainQuarter, totals, yearPeriod } from './calc';
import type { AllData } from './data';
import { COUNTRY_NAME, SPAIN_DEADLINES, categoryLabel, scopeCountries, type Country } from './model';
import { Empty, Money, dateText, today } from './ui';

export function Dashboard({ data, scope }: { data: AllData; scope: Scope }) {
  const now = today();
  const year = Number(now.slice(0, 4));
  const month = now.slice(0, 7);
  const countries = scopeCountries(scope);

  // Próximo plazo de impuestos en España: el del trimestre anterior si aún no ha vencido, o el del actual.
  const q = quarterOf(now);
  const prev = q === 1 ? { y: year - 1, q: 4 } : { y: year, q: q - 1 };
  const pending = SPAIN_DEADLINES[prev.q](prev.y) >= now ? prev : { y: year, q };
  const deadline = SPAIN_DEADLINES[pending.q](pending.y);
  const sq = spainQuarter(data.movements, pending.y, pending.q);

  const recent = data.movements.filter((m) => countries.includes(m.country)).slice(0, 6);

  return (
    <div class="stack">
      <h1 class="page-title">Resumen</h1>

      <div class="cards">
        {countries.map((c) => (
          <CountryCard data={data} country={c} now={now} year={year} month={month} />
        ))}
      </div>

      {countries.includes('es') && (
        <section class="panel">
          <h2>
            Próximo plazo en España: T{pending.q} {pending.y}, hasta el {dateText(deadline)}
          </h2>
          <div class="kv">
            <span>IVA a ingresar (modelo 303)</span>
            <Money country="es" value={sq.vatResult} strong />
            <span>Pago fraccionado IRPF estimado (modelo 130)</span>
            <Money country="es" value={sq.irpfPayment} strong />
          </div>
          <p class="muted small">
            Estimación a partir de lo registrado aquí. El detalle y la exportación para la gestoría están en Impuestos.
          </p>
        </section>
      )}

      <section class="panel">
        <h2>Últimos movimientos</h2>
        {recent.length === 0 ? (
          <Empty>Aún no hay movimientos. Empieza en Movimientos → Añadir.</Empty>
        ) : (
          <ul class="list">
            {recent.map((m) => (
              <li>
                <span class="muted">{dateText(m.date)}</span>
                <span>
                  {m.concept}
                  <span class="muted"> · {categoryLabel(m.category)}</span>
                  {!m.document_path && <span class="tag warn">Sin factura</span>}
                </span>
                <Money country={m.country} value={m.kind === 'gasto' ? -m.base_amount : m.base_amount} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CountryCard({
  data,
  country,
  now,
  year,
  month,
}: {
  data: AllData;
  country: Country;
  now: string;
  year: number;
  month: string;
}) {
  const own = data.movements.filter((m) => m.country === country);
  const ofMonth = totals(own.filter((m) => m.date.startsWith(month)));
  const ofYear = totals(own.filter((m) => inPeriod(m, yearPeriod(year))));
  const fund = sirruxFund(data.movements, country, data.settings.sirrux_pct);
  const balance = fund.length ? fund[fund.length - 1].balance : 0;
  const active = data.clients.filter((c) => c.country === country && feeStatus(c, now) === 'activa').length;
  const missing = own.filter((m) => !m.document_path && inPeriod(m, yearPeriod(year))).length;

  return (
    <section class="panel country">
      <h2>{COUNTRY_NAME[country]}</h2>
      <table class="mini">
        <thead>
          <tr>
            <th></th>
            <th>Este mes</th>
            <th>{year}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Ingresos</th>
            <td>
              <Money country={country} value={ofMonth.income} />
            </td>
            <td>
              <Money country={country} value={ofYear.income} />
            </td>
          </tr>
          <tr>
            <th>Gastos</th>
            <td>
              <Money country={country} value={ofMonth.expenses} />
            </td>
            <td>
              <Money country={country} value={ofYear.expenses} />
            </td>
          </tr>
          <tr class="total">
            <th>Resultado</th>
            <td>
              <Money country={country} value={ofMonth.result} strong />
            </td>
            <td>
              <Money country={country} value={ofYear.result} strong />
            </td>
          </tr>
        </tbody>
      </table>
      <div class="kv">
        <span>Cuotas activas</span>
        <span>
          {active} · <Money country={country} value={mrr(data.clients, country, now)} /> al mes
        </span>
        <span>Saldo del fondo Sirrux</span>
        <Money country={country} value={balance} strong />
        <span>Movimientos de {year} sin factura</span>
        <span class={missing ? 'warn-text' : ''}>{missing}</span>
      </div>
    </section>
  );
}
