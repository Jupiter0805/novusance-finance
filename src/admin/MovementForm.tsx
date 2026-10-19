import type { TargetedEvent } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { round2, taxFrom } from './calc';
import {
  deleteMovement,
  documentName,
  documentUrl,
  errorText,
  removeDocument,
  saveMovement,
  uploadDocument,
  type AllData,
} from './data';
import {
  COUNTRY_NAME,
  CURRENCY,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TAX_RATES,
  type Country,
  type Kind,
  type Movement,
} from './model';
import { Field, Modal, Notice, money, today } from './ui';

const MAX_MB = 15;

export function MovementForm({
  data,
  movement,
  defaultCountry,
  onClose,
  onSaved,
}: {
  data: AllData;
  movement: Movement | null;
  defaultCountry: Country;
  onClose: () => void;
  onSaved: () => void;
}) {
  const m = movement;
  const [kind, setKind] = useState<Kind>(m?.kind ?? 'gasto');
  const [country, setCountry] = useState<Country>(m?.country ?? defaultCountry);
  const [date, setDate] = useState(m?.date ?? today());
  const [category, setCategory] = useState(m?.category ?? '');
  const [concept, setConcept] = useState(m?.concept ?? '');
  const [counterparty, setCounterparty] = useState(m?.counterparty ?? '');
  const [invoice, setInvoice] = useState(m?.invoice_number ?? '');
  const [clientId, setClientId] = useState(m?.client_id ?? '');
  const [base, setBase] = useState(m ? String(m.base_amount) : '');
  const [taxRate, setTaxRate] = useState(String(m?.tax_rate ?? (defaultCountry === 'es' ? 21 : 19)));
  const [taxAmount, setTaxAmount] = useState(m ? String(m.tax_amount) : '');
  const [taxTouched, setTaxTouched] = useState(Boolean(m));
  const [whRate, setWhRate] = useState(String(m?.withholding_rate ?? 0));
  const [directCost, setDirectCost] = useState(m?.direct_cost ?? false);
  const [sirrux, setSirrux] = useState(m?.sirrux ?? false);
  const [deductible, setDeductible] = useState(m?.deductible ?? true);
  const [notes, setNotes] = useState(m?.notes ?? '');
  const [docPath] = useState(m?.document_path ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [removeDoc, setRemoveDoc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cats = kind === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const clients = data.clients.filter((c) => c.country === country);
  const baseN = Number(base.replace(',', '.')) || 0;
  const rateN = Number(taxRate.replace(',', '.')) || 0;
  const taxN = taxTouched ? Number(taxAmount.replace(',', '.')) || 0 : taxFrom(baseN, rateN);
  const whN = kind === 'ingreso' && country === 'es' ? taxFrom(baseN, Number(whRate) || 0) : 0;
  const total = round2(baseN + taxN - whN);

  const rates = useMemo(() => {
    const r = new Set([...TAX_RATES[country], rateN]);
    return [...r].sort((a, b) => b - a);
  }, [country, rateN]);

  const changeCountry = (c: Country) => {
    setCountry(c);
    setClientId('');
    if (!taxTouched) setTaxRate(String(TAX_RATES[c][0]));
  };

  const pickClient = (id: string) => {
    setClientId(id);
    const c = data.clients.find((x) => x.id === id);
    if (c && !counterparty) setCounterparty(c.name);
  };

  const submit = async (e: TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!category) return setError('Elige una categoría.');
    if (!(baseN >= 0) || base.trim() === '') return setError('Escribe el importe sin impuestos.');
    if (file && file.size > MAX_MB * 1024 * 1024) return setError(`El documento pesa más de ${MAX_MB} MB.`);
    setBusy(true);
    let uploaded: string | null = null;
    try {
      let path = removeDoc ? null : docPath;
      if (file) {
        uploaded = await uploadDocument(file, country, date);
        path = uploaded;
      }
      await saveMovement(
        {
          country,
          currency: CURRENCY[country],
          kind,
          date,
          category,
          concept: concept.trim(),
          counterparty: counterparty.trim() || null,
          invoice_number: invoice.trim() || null,
          client_id: clientId || null,
          base_amount: round2(baseN),
          tax_rate: rateN,
          tax_amount: round2(taxN),
          withholding_rate: kind === 'ingreso' && country === 'es' ? Number(whRate) || 0 : 0,
          withholding_amount: whN,
          direct_cost: kind === 'gasto' && directCost,
          sirrux: kind === 'gasto' && sirrux,
          deductible: kind === 'ingreso' ? true : deductible,
          document_path: path,
          notes: notes.trim() || null,
        },
        m?.id,
      );
      // El documento anterior se borra solo cuando el movimiento ya apunta al nuevo (o a ninguno).
      if (docPath && docPath !== path) await removeDocument(docPath).catch(() => {});
      onSaved();
    } catch (err) {
      if (uploaded) await removeDocument(uploaded).catch(() => {});
      setError(errorText(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!m || !confirm(`¿Borrar «${m.concept}»? También se borrará su documento.`)) return;
    setBusy(true);
    try {
      await deleteMovement(m);
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const openDoc = async () => {
    if (!docPath) return;
    try {
      window.open(await documentUrl(docPath), '_blank', 'noopener');
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <Modal title={m ? 'Editar movimiento' : 'Añadir movimiento'} onClose={onClose}>
      <form class="form" onSubmit={submit}>
        {error && <Notice kind="error">{error}</Notice>}

        <div class="row">
          <div class="seg big" role="group" aria-label="Tipo">
            {(['gasto', 'ingreso'] as Kind[]).map((k) => (
              <button
                type="button"
                aria-pressed={kind === k}
                onClick={() => {
                  setKind(k);
                  setCategory('');
                }}
              >
                {k === 'gasto' ? 'Gasto' : 'Ingreso'}
              </button>
            ))}
          </div>
          <div class="seg big" role="group" aria-label="País">
            {(['es', 'co'] as Country[]).map((c) => (
              <button type="button" aria-pressed={country === c} onClick={() => changeCountry(c)}>
                {COUNTRY_NAME[c]}
              </button>
            ))}
          </div>
        </div>

        <div class="grid2">
          <Field label="Fecha de la factura">
            <input type="date" required value={date} onInput={(e) => setDate(e.currentTarget.value)} />
          </Field>
          <Field label="Categoría">
            <select required value={category} onChange={(e) => setCategory(e.currentTarget.value)}>
              <option value="">Elige una…</option>
              {Object.entries(cats).map(([k, v]) => (
                <option value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Concepto" wide>
            <input
              required
              maxLength={200}
              placeholder={kind === 'ingreso' ? 'Web de Fisio Alameda' : 'Dominio de Fisio Alameda (1 año)'}
              value={concept}
              onInput={(e) => setConcept(e.currentTarget.value)}
            />
          </Field>
          <Field label="Cliente (opcional)">
            <select value={clientId} onChange={(e) => pickClient(e.currentTarget.value)}>
              <option value="">Ninguno</option>
              {clients.map((c) => (
                <option value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label={kind === 'ingreso' ? 'Facturado a' : 'Proveedor'}>
            <input maxLength={200} value={counterparty} onInput={(e) => setCounterparty(e.currentTarget.value)} />
          </Field>
          <Field label="Nº de factura (opcional)">
            <input maxLength={60} value={invoice} onInput={(e) => setInvoice(e.currentTarget.value)} />
          </Field>
        </div>

        <div class="grid3">
          <Field label={`Importe sin impuestos (${CURRENCY[country]})`}>
            <input inputMode="decimal" required value={base} onInput={(e) => setBase(e.currentTarget.value)} />
          </Field>
          <Field label="IVA %">
            <select
              value={String(rateN)}
              onChange={(e) => {
                setTaxRate(e.currentTarget.value);
                setTaxTouched(false);
              }}
            >
              {rates.map((r) => (
                <option value={String(r)}>{r} %</option>
              ))}
            </select>
          </Field>
          <Field label="IVA (importe)" hint={taxTouched ? 'Escrito a mano' : 'Calculado'}>
            <input
              inputMode="decimal"
              value={taxTouched ? taxAmount : String(taxN)}
              onInput={(e) => {
                setTaxTouched(true);
                setTaxAmount(e.currentTarget.value);
              }}
            />
          </Field>
          {kind === 'ingreso' && country === 'es' && (
            <Field label="Retención IRPF" hint="Solo si facturas a una empresa o profesional que te retiene.">
              <select value={whRate} onChange={(e) => setWhRate(e.currentTarget.value)}>
                <option value="0">Sin retención</option>
                <option value="7">7 % (nuevos autónomos)</option>
                <option value="15">15 %</option>
              </select>
            </Field>
          )}
        </div>
        <p class="total-line">
          Total de la factura: <strong>{money(country, total)}</strong>
        </p>

        {kind === 'gasto' && (
          <div class="checks">
            <label>
              <input type="checkbox" checked={directCost} onChange={(e) => setDirectCost(e.currentTarget.checked)} />
              Gasto directo de un cliente <span class="muted">(dominio, hosting, fotos… resta del beneficio que se reparte)</span>
            </label>
            <label>
              <input type="checkbox" checked={sirrux} onChange={(e) => setSirrux(e.currentTarget.checked)} />
              Pagado con el fondo Sirrux
            </label>
            <label>
              <input type="checkbox" checked={deductible} onChange={(e) => setDeductible(e.currentTarget.checked)} />
              Deducible en impuestos
            </label>
          </div>
        )}

        <Field label="Factura o ticket (PDF o foto)" wide>
          {docPath && !removeDoc && !file ? (
            <div class="doc-row">
              <button type="button" class="link-btn" onClick={openDoc}>
                {documentName(docPath)}
              </button>
              <button type="button" class="link-btn danger" onClick={() => setRemoveDoc(true)}>
                Quitar
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => {
                setFile(e.currentTarget.files?.[0] ?? null);
                setRemoveDoc(false);
              }}
            />
          )}
        </Field>

        <Field label="Notas (opcional)" wide>
          <textarea rows={2} maxLength={1000} value={notes} onInput={(e) => setNotes(e.currentTarget.value)} />
        </Field>

        <div class="form-actions">
          {m && (
            <button type="button" class="btn danger" onClick={remove} disabled={busy}>
              Borrar
            </button>
          )}
          <span class="spacer" />
          <button type="button" class="btn" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" class="btn primary" disabled={busy}>
            {busy ? 'Guardando…' : m ? 'Guardar cambios' : 'Añadir'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
