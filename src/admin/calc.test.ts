// Ejecuta: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  commitmentEnd,
  feeStatus,
  mrr,
  periodSummary,
  quarterOf,
  quarterPeriod,
  sirruxFund,
  spainQuarter,
  taxFrom,
  toCsv,
  totals,
} from './calc';
import type { Client, Movement } from './model';

let n = 0;
const mv = (p: Partial<Movement>): Movement => ({
  id: String(++n),
  country: 'es',
  currency: 'EUR',
  kind: 'ingreso',
  date: '2026-01-15',
  category: 'puesta_en_marcha',
  concept: 'x',
  counterparty: null,
  invoice_number: null,
  client_id: null,
  base_amount: 0,
  tax_rate: 0,
  tax_amount: 0,
  withholding_rate: 0,
  withholding_amount: 0,
  direct_cost: false,
  sirrux: false,
  deductible: true,
  document_path: null,
  notes: null,
  created_by: null,
  created_at: '',
  ...p,
});

const cl = (p: Partial<Client>): Client => ({
  id: String(++n),
  country: 'es',
  name: 'C',
  sector: null,
  city: null,
  contact_name: null,
  email: null,
  phone: null,
  tax_id: null,
  fee_amount: null,
  fee_start: null,
  fee_end: null,
  min_months: 12,
  notes: null,
  created_by: null,
  created_at: '',
  ...p,
});

test('trimestres', () => {
  assert.equal(quarterOf('2026-01-01'), 1);
  assert.equal(quarterOf('2026-03-31'), 1);
  assert.equal(quarterOf('2026-04-01'), 2);
  assert.equal(quarterOf('2026-12-31'), 4);
  assert.deepEqual(quarterPeriod(2026, 1), { from: '2026-01-01', to: '2026-03-31' });
  assert.deepEqual(quarterPeriod(2028, 1), { from: '2028-01-01', to: '2028-03-31' });
  assert.deepEqual(quarterPeriod(2026, 4), { from: '2026-10-01', to: '2026-12-31' });
});

test('IVA a partir de base y tipo, con redondeo', () => {
  assert.equal(taxFrom(1000, 21), 210);
  assert.equal(taxFrom(33.33, 21), 7);
  assert.equal(taxFrom(0.1 + 0.2, 100), 0.3);
});

test('totales: beneficio repartible = ingresos − gastos directos (ejemplo del documento)', () => {
  const t = totals([
    mv({ base_amount: 1000 }),
    mv({ kind: 'gasto', category: 'dominio', base_amount: 50, direct_cost: true }),
    mv({ kind: 'gasto', category: 'herramientas', base_amount: 20 }),
  ]);
  assert.equal(t.shareableProfit, 950);
  assert.equal(t.result, 930);
});

test('fondo Sirrux: 30 % del beneficio, sin aportación en meses con pérdidas, y gastos del fondo', () => {
  const list = [
    mv({ date: '2026-01-10', base_amount: 1000 }),
    mv({ date: '2026-01-11', kind: 'gasto', base_amount: 50, direct_cost: true }),
    mv({ date: '2026-02-03', kind: 'gasto', base_amount: 80, direct_cost: true }),
    mv({ date: '2026-03-01', base_amount: 45 }),
    mv({ date: '2026-03-02', kind: 'gasto', base_amount: 5, direct_cost: true }),
    mv({ date: '2026-03-20', kind: 'gasto', base_amount: 100, sirrux: true }),
    mv({ country: 'co', currency: 'COP', date: '2026-01-05', base_amount: 2500000 }),
  ];
  const f = sirruxFund(list, 'es', 30);
  assert.deepEqual(
    f.map((m) => [m.month, m.contribution, m.spent, m.balance]),
    [
      ['2026-01', 285, 0, 285],
      ['2026-02', 0, 0, 285],
      ['2026-03', 12, 100, 197],
    ],
  );
  const co = sirruxFund(list, 'co', 30);
  assert.equal(co[0].contribution, 750000);
});

test('España: IVA trimestral y pago fraccionado de IRPF acumulado (modelo 130)', () => {
  const list = [
    // T1: 1.000 de ingresos, 200 de gastos deducibles
    mv({ date: '2026-02-01', base_amount: 1000, tax_rate: 21, tax_amount: 210 }),
    mv({ date: '2026-02-02', kind: 'gasto', base_amount: 200, tax_amount: 42 }),
    // gasto no deducible: no cuenta ni en IVA ni en IRPF
    mv({ date: '2026-02-03', kind: 'gasto', base_amount: 100, tax_amount: 21, deductible: false }),
    // T2: 500 de ingresos con 15 % de retención
    mv({ date: '2026-05-01', base_amount: 500, tax_amount: 105, withholding_rate: 15, withholding_amount: 75 }),
  ];
  const q1 = spainQuarter(list, 2026, 1);
  assert.equal(q1.vatCharged, 210);
  assert.equal(q1.vatDeductible, 42);
  assert.equal(q1.vatResult, 168);
  assert.equal(q1.ytdNetIncome, 800);
  assert.equal(q1.irpfPayment, 160); // 20 % de 800

  const q2 = spainQuarter(list, 2026, 2);
  assert.equal(q2.vatCharged, 105);
  assert.equal(q2.ytdNetIncome, 1300);
  // 20 % de 1.300 = 260 − 75 de retenciones − 160 ya pagados = 25
  assert.equal(q2.irpfPayment, 25);

  // Un trimestre sin actividad tras pagos no sale negativo
  assert.equal(spainQuarter(list, 2026, 3).irpfPayment, 0);
});

test('España: si el acumulado es negativo, no hay pago', () => {
  const list = [mv({ date: '2026-01-10', kind: 'gasto', base_amount: 500 })];
  assert.equal(spainQuarter(list, 2026, 1).irpfPayment, 0);
});

test('resumen por periodo filtra por país y fechas', () => {
  const list = [
    mv({ country: 'co', currency: 'COP', date: '2026-03-01', base_amount: 100, tax_amount: 19 }),
    mv({ country: 'co', currency: 'COP', date: '2026-03-02', kind: 'gasto', base_amount: 30, tax_amount: 5 }),
    mv({ country: 'co', currency: 'COP', date: '2026-04-01', base_amount: 999 }),
    mv({ country: 'es', date: '2026-03-01', base_amount: 7 }),
  ];
  const s = periodSummary(list, 'co', { from: '2026-03-01', to: '2026-03-31' });
  assert.deepEqual(s, {
    income: 100,
    taxCharged: 19,
    expenses: 30,
    deductibleExpenses: 30,
    taxPaid: 5,
    withholdings: 0,
    result: 70,
  });
});

test('cuotas: estado, permanencia e ingreso recurrente', () => {
  const a = cl({ fee_amount: 45, fee_start: '2026-01-31' });
  const b = cl({ fee_amount: 35, fee_start: '2026-02-01', fee_end: '2026-06-01' });
  const c = cl({ fee_amount: 35, fee_start: '2027-01-01' });
  const d = cl({ country: 'co', fee_amount: 120000, fee_start: '2026-01-01' });
  const today = '2026-10-16';
  assert.equal(feeStatus(a, today), 'activa');
  assert.equal(feeStatus(b, today), 'baja');
  assert.equal(feeStatus(c, today), 'pendiente');
  assert.equal(feeStatus(cl({}), today), 'sin_cuota');
  assert.equal(commitmentEnd(cl({ fee_start: '2026-03-15' })), '2027-03-15');
  assert.equal(mrr([a, b, c, d], 'es', today), 45);
  assert.equal(mrr([a, b, c, d], 'co', today), 120000);
});

test('CSV para Excel en español', () => {
  const csv = toCsv([
    ['a', 1.5, true, null],
    ['con;punto y coma', 'con "comillas"', false, 2],
  ]);
  assert.equal(csv, '﻿a;1,5;sí;\r\n"con;punto y coma";"con ""comillas""";no;2');
});
