import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { Clients } from './Clients';
import { arrivedToSetPassword, configured, errorText, loadAll, supabase, type AllData } from './data';
import { Dashboard } from './Dashboard';
import { Login, SetPassword } from './Login';
import type { Country } from './model';
import { Movements } from './Movements';
import { Sirrux } from './Sirrux';
import { Taxes } from './Taxes';
import { Notice } from './ui';

export type Scope = 'all' | Country;

const VIEWS = {
  resumen: 'Resumen',
  movimientos: 'Movimientos',
  clientes: 'Clientes',
  sirrux: 'Fondo Sirrux',
  impuestos: 'Impuestos',
} as const;
type View = keyof typeof VIEWS;

const viewFromHash = (): View => {
  const v = location.hash.replace(/^#\/?/, '') as View;
  return v in VIEWS ? v : 'resumen';
};

const readScope = (): Scope => {
  try {
    const s = localStorage.getItem('nv-admin-scope');
    return s === 'es' || s === 'co' ? s : 'all';
  } catch {
    return 'all';
  }
};

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [needsPassword, setNeedsPassword] = useState(arrivedToSetPassword);
  const [data, setData] = useState<AllData | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>(viewFromHash());
  const [scope, setScopeState] = useState<Scope>(readScope());

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true);
    });
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const reload = useCallback(async () => {
    if (!session) return;
    try {
      setError('');
      setData(await loadAll(session.user.id));
    } catch (e) {
      setError(errorText(e));
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (session) reload();
    else setData(null);
  }, [session?.user.id]);

  const setScope = (s: Scope) => {
    setScopeState(s);
    try {
      localStorage.setItem('nv-admin-scope', s);
    } catch {
      /* sin almacenamiento */
    }
  };

  if (!configured) {
    return (
      <div class="auth">
        <div class="auth-box">
          <h1>Panel sin configurar</h1>
          <p>
            Faltan <code>PUBLIC_SUPABASE_URL</code> y <code>PUBLIC_SUPABASE_ANON_KEY</code> en las variables de entorno de
            Vercel. Los pasos están en el README, apartado «Panel de administración».
          </p>
        </div>
      </div>
    );
  }

  if (session === undefined) return <div class="loading">Cargando…</div>;
  if (needsPassword && session)
    return (
      <SetPassword
        onDone={() => {
          setNeedsPassword(false);
          history.replaceState(null, '', '/admin#/resumen');
        }}
      />
    );
  if (!session) return <Login />;

  const logout = () => supabase!.auth.signOut();

  if (data && !data.me) {
    return (
      <div class="auth">
        <div class="auth-box">
          <h1>Sin acceso</h1>
          <p>
            Tu usuario ({session.user.email}) no está dado de alta como administrador. Pide a Jupiter o a Carlos que te
            añadan en la tabla <code>admins</code> de Supabase.
          </p>
          <button type="button" class="btn" onClick={logout}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="#/resumen">
          novusance <span>admin</span>
        </a>
        <nav class="tabs" aria-label="Secciones">
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <a href={`#/${v}`} aria-current={v === view ? 'page' : undefined}>
              {VIEWS[v]}
            </a>
          ))}
        </nav>
        <div class="who">
          <div class="seg" role="group" aria-label="País">
            {(['all', 'es', 'co'] as Scope[]).map((s) => (
              <button type="button" aria-pressed={scope === s} onClick={() => setScope(s)}>
                {s === 'all' ? 'Todo' : s.toUpperCase()}
              </button>
            ))}
          </div>
          <span class="me">{data?.me?.name ?? session.user.email}</span>
          <button type="button" class="link-btn" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <main class="content">
        {error && (
          <Notice kind="error">
            {error}{' '}
            <button type="button" class="link-btn" onClick={reload}>
              Reintentar
            </button>
          </Notice>
        )}
        {!data && !error && <div class="loading">Cargando datos…</div>}
        {data && view === 'resumen' && <Dashboard data={data} scope={scope} />}
        {data && view === 'movimientos' && <Movements data={data} scope={scope} reload={reload} />}
        {data && view === 'clientes' && <Clients data={data} scope={scope} reload={reload} />}
        {data && view === 'sirrux' && <Sirrux data={data} scope={scope} reload={reload} userId={session.user.id} />}
        {data && view === 'impuestos' && <Taxes data={data} scope={scope} />}
      </main>
    </div>
  );
}
