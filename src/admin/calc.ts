// Cálculos del panel. Funciones puras, sin red ni DOM, con pruebas en calc.test.ts.
import type { Client, Country, Movement } from './model';

/** Redondeo a céntimos para evitar errores de coma flotante al sumar. */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const sum = (list: Movement[], pick: (m: Movement) => number) => round2(list.reduce((a, m) => a + pick(m), 0));

export const quarterOf = (date: string) => Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1;
export const yearOf = (date: string) => Number(date.slice(0, 4));
export const monthKey = (date: string) => date.slice(0, 7);

export interface Period {
  from: string; // incluido
  to: string; // incluido
}

export const quarterPeriod = (year: number, q: number): Period => {
  const m1 = (q - 1) * 3 + 1;
  const last = new Date(Date.UTC(year, m1 + 2, 0)).getUTCDate();
  return { from: `${year}-${String(m1).padStart(2, '0')}-01`, to: `${year}-${String(m1 + 2).padStart(2, '0')}-${last}` };
};

export const yearPeriod = (year: number): Period => ({ from: `${year}-01-01`, to: `${year}-12-31` });

export const inPeriod = (m: { date: string }, p: Period) => m.date >= p.from && m.date <= p.to;

/** Importe de impuesto a partir de base y tipo, redondeado. */
export const taxFrom = (base: number, rate: number) => round2((base * rate) / 100);

export interface Totals {
  income: number; // ingresos sin impuestos
  expenses: number; // gastos sin impuestos (todos, incluidos los de Sirrux)
  directCosts: number; // gastos directos de clientes
  sirruxExpenses: number; // gastos pagados con el fondo Sirrux
  /** Beneficio que se reparte: ingresos − gastos directos (ver documento del acuerdo). */
  shareableProfit: number;
  /** Resultado de la actividad: ingresos − todos los gastos. */
  result: number;
}

export const totals = (list: Movement[]): Totals => {
  const inc = list.filter((m) => m.kind === 'ingreso');
  const exp = list.filter((m) => m.kind === 'gasto');
  const income = sum(inc, (m) => m.base_amount);
  const expenses = sum(exp, (m) => m.base_amount);
  const directCosts = sum(
    exp.filter((m) => m.direct_cost),
    (m) => m.base_amount,
  );
  const sirruxExpenses = sum(
    exp.filter((m) => m.sirrux),
    (m) => m.base_amount,
  );
  return {
    income,
    expenses,
    directCosts,
    sirruxExpenses,
    shareableProfit: round2(income - directCosts),
    result: round2(income - expenses),
  };
};

// ── Fondo Sirrux ─────────────────────────────────────────────────────

export interface FundMonth {
  month: string; // AAAA-MM
  income: number;
  directCosts: number;
  profit: number;
  /** Lo que se aparta ese mes. Si el beneficio es negativo, no se aparta nada (no se "debe" al fondo). */
  contribution: number;
  spent: number;
  balance: number; // saldo acumulado al cierre del mes
}

export const sirruxFund = (list: Movement[], country: Country, pct: number): FundMonth[] => {
  const own = list.filter((m) => m.country === country).sort((a, b) => a.date.localeCompare(b.date));
  const months = [...new Set(own.map((m) => monthKey(m.date)))].sort();
  let balance = 0;
  return months.map((month) => {
    const t = totals(own.filter((m) => monthKey(m.date) === month));
    const contribution = t.shareableProfit > 0 ? round2((t.shareableProfit * pct) / 100) : 0;
    balance = round2(balance + contribution - t.sirruxExpenses);
    return {
      month,
      income: t.income,
      directCosts: t.directCosts,
      profit: t.shareableProfit,
      contribution,
      spent: t.sirruxExpenses,
      balance,
    };
  });
};

// ── Impuestos de España (orientativo) ────────────────────────────────

export interface SpainQuarter {
  year: number;
  quarter: number;
  /** IVA de las facturas emitidas (modelo 303). */
  vatCharged: number;
  /** IVA de los gastos deducibles (modelo 303). */
  vatDeductible: number;
  /** Resultado del 303: positivo = a pagar. */
  vatResult: number;
  /** Acumulado del año hasta el trimestre (modelo 130). */
  ytdIncome: number;
  ytdDeductibleExpenses: number;
  ytdNetIncome: number;
  ytdWithholdings: number;
  /** 20 % del rendimiento acumulado, menos retenciones y pagos de trimestres anteriores. Nunca negativo. */
  irpfPayment: number;
}

export const spainQuarter = (list: Movement[], year: number, quarter: number): SpainQuarter => {
  const es = list.filter((m) => m.country === 'es');
  const q = es.filter((m) => inPeriod(m, quarterPeriod(year, quarter)));
  const vatCharged = sum(
    q.filter((m) => m.kind === 'ingreso'),
    (m) => m.tax_amount,
  );
  const vatDeductible = sum(
    q.filter((m) => m.kind === 'gasto' && m.deductible),
    (m) => m.tax_amount,
  );

  const ytd = (upTo: number) => {
    const p: Period = { from: `${year}-01-01`, to: quarterPeriod(year, upTo).to };
    const l = es.filter((m) => inPeriod(m, p));
    const income = sum(
      l.filter((m) => m.kind === 'ingreso'),
      (m) => m.base_amount,
    );
    const expenses = sum(
      l.filter((m) => m.kind === 'gasto' && m.deductible),
      (m) => m.base_amount,
    );
    const withholdings = sum(
      l.filter((m) => m.kind === 'ingreso'),
      (m) => m.withholding_amount,
    );
    const net = round2(income - expenses);
    return { income, expenses, withholdings, net, raw: round2(Math.max(0, net * 0.2) - withholdings) };
  };

  const now = ytd(quarter);
  // Pagos de trimestres anteriores, recalculados del mismo modo (lo que habría salido en cada 130).
  let previous = 0;
  for (let k = 1; k < quarter; k++) {
    const before = ytd(k);
    previous = round2(previous + Math.max(0, round2(before.raw - previous)));
  }

  return {
    year,
    quarter,
    vatCharged,
    vatDeductible,
    vatResult: round2(vatCharged - vatDeductible),
    ytdIncome: now.income,
    ytdDeductibleExpenses: now.expenses,
    ytdNetIncome: now.net,
    ytdWithholdings: now.withholdings,
    irpfPayment: Math.max(0, round2(now.raw - previous)),
  };
};

// ── Resumen por periodo (Colombia y exportaciones) ───────────────────

export interface PeriodSummary {
  income: number;
  taxCharged: number;
  expenses: number;
  deductibleExpenses: number;
  taxPaid: number;
  withholdings: number;
  result: number;
}

export const periodSummary = (list: Movement[], country: Country, p: Period): PeriodSummary => {
  const l = list.filter((m) => m.country === country && inPeriod(m, p));
  const inc = l.filter((m) => m.kind === 'ingreso');
  const exp = l.filter((m) => m.kind === 'gasto');
  const income = sum(inc, (m) => m.base_amount);
  const expenses = sum(exp, (m) => m.base_amount);
  return {
    income,
    taxCharged: sum(inc, (m) => m.tax_amount),
    expenses,
    deductibleExpenses: sum(
      exp.filter((m) => m.deductible),
      (m) => m.base_amount,
    ),
    taxPaid: sum(exp, (m) => m.tax_amount),
    withholdings: sum(inc, (m) => m.withholding_amount),
    result: round2(income - expenses),
  };
};

// ── Cuotas ────────────────────────────────────────────────────────────

export const monthsBetween = (from: string, to: string) => {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
};

export type FeeStatus = 'sin_cuota' | 'pendiente' | 'activa' | 'baja';

export const feeStatus = (c: Client, today: string): FeeStatus => {
  if (!c.fee_amount || !c.fee_start) return 'sin_cuota';
  if (c.fee_end && c.fee_end <= today) return 'baja';
  if (c.fee_start > today) return 'pendiente';
  return 'activa';
};

/** Fecha en que termina la permanencia (inicio + meses mínimos). */
export const commitmentEnd = (c: Client) => {
  if (!c.fee_start) return null;
  const [y, m, d] = c.fee_start.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1 + c.min_months, d));
  return end.toISOString().slice(0, 10);
};

/** Ingreso recurrente mensual por país (suma de cuotas activas). */
export const mrr = (clients: Client[], country: Country, today: string) =>
  round2(
    clients
      .filter((c) => c.country === country && feeStatus(c, today) === 'activa')
      .reduce((a, c) => a + (c.fee_amount ?? 0), 0),
  );

// ── CSV ───────────────────────────────────────────────────────────────

/** CSV con punto y coma y coma decimal, que Excel en español abre sin tocar nada. */
export const toCsv = (rows: (string | number | boolean | null)[][]) =>
  '﻿' +
  rows
    .map((r) =>
      r
        .map((v) => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'number') return String(v).replace('.', ',');
          if (typeof v === 'boolean') return v ? 'sí' : 'no';
          const s = String(v);
          return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(';'),
    )
    .join('\r\n');
