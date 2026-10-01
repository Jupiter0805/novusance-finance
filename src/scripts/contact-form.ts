import { readContact, validateContact, type Field, type FieldErrors } from '../lib/contact-validation';

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id?: string): void;
  getResponse(id?: string): string | undefined;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    nvTurnstileReady?: () => void;
  }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=nvTurnstileReady';
const TOKEN_TIMEOUT = 20000;

const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
const success = document.querySelector<HTMLElement>('[data-success]');
const failure = document.querySelector<HTMLElement>('[data-failure]');
const failureText = document.querySelector<HTMLElement>('[data-failure-text]');
const submit = document.querySelector<HTMLButtonElement>('[data-submit]');
const submitLabel = document.querySelector<HTMLElement>('[data-submit-label]');
const widgetBox = document.querySelector<HTMLElement>('[data-turnstile]');

if (form && success && failure && failureText && submit && submitLabel && widgetBox) {
  // Con JS validamos nosotros para mostrar mensajes claros en español bajo cada campo.
  form.noValidate = true;

  const siteKey = form.dataset.sitekey ?? '';
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

  /* ── Turnstile (se carga al acercarse al formulario) ───────────── */

  let widgetId: string | undefined;
  let scriptPromise: Promise<void> | undefined;
  let tokenWaiters: Array<(token: string | null) => void> = [];

  const settle = (token: string | null) => {
    tokenWaiters.forEach((resolve) => resolve(token));
    tokenWaiters = [];
  };

  const loadTurnstile = () => {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise<void>((resolve, reject) => {
      window.nvTurnstileReady = () => resolve();
      const s = document.createElement('script');
      s.src = TURNSTILE_SRC;
      s.async = true;
      s.onerror = () => reject(new Error('turnstile-load'));
      document.head.append(s);
    }).then(() => {
      widgetId = window.turnstile?.render(widgetBox, {
        sitekey: siteKey,
        appearance: 'interaction-only',
        theme: 'auto',
        language: 'es',
        action: 'contacto',
        'refresh-expired': 'auto',
        callback: (token: string) => settle(token),
        'error-callback': () => {
          settle(null);
        },
        'expired-callback': () => undefined,
      });
    });
    scriptPromise.catch(() => {
      scriptPromise = undefined;
    });
    return scriptPromise;
  };

  const getToken = async (): Promise<string | null> => {
    try {
      await loadTurnstile();
    } catch {
      return null;
    }
    const current = window.turnstile?.getResponse(widgetId);
    if (current) return current;
    return new Promise((resolve) => {
      tokenWaiters.push(resolve);
      window.setTimeout(() => resolve(null), TOKEN_TIMEOUT);
    });
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          loadTurnstile().catch(() => undefined);
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(form);
  }
  form.addEventListener('focusin', () => loadTurnstile().catch(() => undefined), { once: true });

  /* ── Estados ───────────────────────────────────────────────────── */

  const setSending = (sending: boolean) => {
    submit.disabled = sending;
    submitLabel.textContent = sending ? 'Enviando…' : 'Pide tu demo';
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
      const token = await getToken();
      if (!token) {
        showFailure('No he podido completar la verificación antispam.');
        return;
      }

      const data = new FormData(form);
      data.set('cf-turnstile-response', token);

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

      showFailure(
        body.error === 'turnstile'
          ? 'No he podido completar la verificación antispam.'
          : 'No se ha podido enviar el formulario.',
      );
    } catch {
      showFailure();
    } finally {
      setSending(false);
      // Cada token de Turnstile sirve para un solo envío.
      if (widgetId !== undefined && !form.hidden) window.turnstile?.reset(widgetId);
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
