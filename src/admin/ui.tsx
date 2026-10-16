import type { ComponentChildren, TargetedEvent } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Country } from './model';

const fmt: Record<Country, Intl.NumberFormat> = {
  es: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' }),
  co: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }),
};

// `n || 0` convierte el -0 (de restar un cero) en 0, para no mostrar «−0,00 €».
export const money = (country: Country, n: number) => fmt[country].format(n || 0);

export const dateText = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export const monthText = (ym: string) =>
  new Date(`${ym}-15T12:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function Money({ country, value, strong }: { country: Country; value: number; strong?: boolean }) {
  return <span class={`money${strong ? ' strong' : ''}${value < 0 ? ' neg' : ''}`}>{money(country, value)}</span>;
}

export function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: ComponentChildren;
  wide?: boolean;
}) {
  return (
    <label class={`field${wide ? ' wide' : ''}`}>
      <span class="field-label">{label}</span>
      {children}
      {hint && <span class="field-hint">{hint}</span>}
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      class="modal"
      aria-label={title}
      onClose={onClose}
      onCancel={(e: TargetedEvent<HTMLDialogElement>) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div class="modal-head">
        <h2>{title}</h2>
        <button type="button" class="icon-btn" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'error' | 'ok' | 'warn'; children: ComponentChildren }) {
  return (
    <div class={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ComponentChildren }) {
  return <div class="empty">{children}</div>;
}

/** Descarga un Blob o texto como archivo. */
export const saveFile = (content: Blob | string, name: string, type = 'text/csv;charset=utf-8') => {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/**
 * Clic en cualquier punto de una fila de tabla para abrirla, salvo en sus enlaces o botones propios.
 * Con teclado se sigue usando el botón del nombre de la fila.
 */
export const rowClick = (open: () => void) => (e: MouseEvent) => {
  const t = e.target as HTMLElement;
  if (t.closest('a, button, input, select, textarea')) return;
  if (window.getSelection()?.toString()) return; // no abrir al seleccionar texto
  open();
};
