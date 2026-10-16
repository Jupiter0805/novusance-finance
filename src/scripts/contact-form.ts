import { readContact, validateContact, type Field, type FieldErrors } from '../lib/contact-validation';

const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
const success = document.querySelector<HTMLElement>('[data-success]');
const failure = document.querySelector<HTMLElement>('[data-failure]');
const failureText = document.querySelector<HTMLElement>('[data-failure-text]');
const submit = document.querySelector<HTMLButtonElement>('[data-submit]');
const submitLabel = document.querySelector<HTMLElement>('[data-submit-label]');
const startedAt = document.querySelector<HTMLInputElement>('[data-started-at]');

if (form && success && failure && failureText && submit && submitLabel) {
  // Con JS validamos nosotros para mostrar mensajes claros en español bajo cada campo.
  form.noValidate = true;

  // Antispam sin servicios externos: el servidor descarta envíos hechos demasiado rápido tras abrir la página.
  if (startedAt) startedAt.value = String(Date.now());
  const fields: Field[] = ['nombre', 'clinica', 'email', 'telefono', 'mensaje', 'privacidad'];
  const input = (f: Field) => form.elements.namedItem(f) as HTMLInputElement | HTMLTextAreaElement;
  const errorEl = (f: Field) => form.querySelector<HTMLElement>(`[data-error-for="${f}"]`);
  const touched = new Set<Field>();

  /* ── Errores por campo ─────────────────────────────────────────── */

  const showErrors = (errors: FieldErrors, only?: Set<Field>) => {
    for (const f of fields) {
      if (only && !only.has(f)) continue;
      const msg = errors[f] ?? '';
      const el = errorEl(f);
      if (el) el.textContent = msg;
      input(f).setAttribute('aria-invalid', String(Boolean(msg)));
    }
  };

  const validate = () => validateContact(readContact(new FormData(form)));

  for (const f of fields) {
    const el = input(f);
    el.addEventListener('blur', () => {
      if (f === 'privacidad') return;
      touched.add(f);
      showErrors(validate(), touched);
    });
    el.addEventListener(f === 'privacidad' ? 'change' : 'input', () => {
      if (f === 'privacidad') touched.add(f);
      if (touched.has(f)) showErrors(validate(), touched);
    });
  }

  /* ── Estados ───────────────────────────────────────────────────── */

  const setSending = (sending: boolean) => {
    submit.disabled = sending;
    submitLabel.textContent = sending ? 'Enviando…' : 'Pide tu propuesta';
    form.setAttribute('aria-busy', String(sending));
  };

  const showSuccess = () => {
    failure.hidden = true;
    form.hidden = true;
    success.hidden = false;
    success.focus();
  };

  const showFailure = (text = 'No se ha podido enviar el formulario.') => {
    failureText.textContent = text;
    failure.hidden = false;
    failure.focus();
  };

  /* ── Envío ─────────────────────────────────────────────────────── */

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    failure.hidden = true;

    const errors = validate();
    fields.forEach((f) => touched.add(f));
    showErrors(errors);
    const firstInvalid = fields.find((f) => errors[f]);
    if (firstInvalid) {
      input(firstInvalid).focus();
      return;
    }

    setSending(true);
    try {
      const data = new FormData(form);
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: FieldErrors };

      if (res.ok && body.ok) {
        showSuccess();
        return;
      }

      if (body.error === 'validation' && body.fields) {
        showErrors(body.fields);
        const first = fields.find((f) => body.fields?.[f]);
        if (first) input(first).focus();
        return;
      }

      showFailure();
    } catch {
      showFailure();
    } finally {
      setSending(false);
    }
  });

  /* ── Vuelta de un envío sin JS (/?enviado=1#contacto) ──────────── */

  const params = new URLSearchParams(location.search);
  if (params.has('enviado') || params.has('error')) {
    const show = () => (params.get('enviado') === '1' ? showSuccess() : showFailure());
    // Al volver de un envío sin JS, el foco se mueve cuando la página ha terminado de cargar.
    if (document.readyState === 'complete') show();
    else window.addEventListener('load', show, { once: true });
    history.replaceState(null, '', `${location.pathname}#contacto`);
  }
}
