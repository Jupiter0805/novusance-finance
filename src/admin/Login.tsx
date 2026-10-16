import type { TargetedEvent } from 'preact';
import { useState } from 'preact/hooks';
import { errorText, supabase } from './data';
import { Field, Notice } from './ui';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [mode, setMode] = useState<'login' | 'reset'>('login');

  const submit = async (e: TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${location.origin}/admin`,
        });
        if (error) throw error;
        setInfo('Si el email es de un administrador, te llegará un enlace para elegir una contraseña nueva.');
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="auth">
      <form class="auth-box" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Panel de Novusance' : 'Recuperar contraseña'}</h1>
        {error && <Notice kind="error">{error}</Notice>}
        {info && <Notice kind="ok">{info}</Notice>}
        <Field label="Email">
          <input
            type="email"
            autocomplete="username"
            required
            value={email}
            onInput={(e) => setEmail(e.currentTarget.value)}
          />
        </Field>
        {mode === 'login' && (
          <Field label="Contraseña">
            <input
              type="password"
              autocomplete="current-password"
              required
              value={password}
              onInput={(e) => setPassword(e.currentTarget.value)}
            />
          </Field>
        )}
        <button type="submit" class="btn primary" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Enviar enlace'}
        </button>
        <button
          type="button"
          class="link-btn"
          onClick={() => {
            setMode(mode === 'login' ? 'reset' : 'login');
            setError('');
            setInfo('');
          }}
        >
          {mode === 'login' ? '¿Has olvidado la contraseña?' : 'Volver a entrar'}
        </button>
      </form>
    </div>
  );
}

/** Tras abrir un enlace de invitación o de recuperación: elegir contraseña. */
export function SetPassword({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (password.length < 10) return setError('Usa al menos 10 caracteres.');
    if (password !== repeat) return setError('Las dos contraseñas no coinciden.');
    setBusy(true);
    try {
      const { error } = await supabase!.auth.updateUser({ password });
      if (error) throw error;
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="auth">
      <form class="auth-box" onSubmit={submit}>
        <h1>Elige tu contraseña</h1>
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Contraseña nueva" hint="Al menos 10 caracteres.">
          <input
            type="password"
            autocomplete="new-password"
            required
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
          />
        </Field>
        <Field label="Repite la contraseña">
          <input
            type="password"
            autocomplete="new-password"
            required
            value={repeat}
            onInput={(e) => setRepeat(e.currentTarget.value)}
          />
        </Field>
        <button type="submit" class="btn primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </button>
        {onCancel && (
          <button type="button" class="link-btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </form>
    </div>
  );
}
