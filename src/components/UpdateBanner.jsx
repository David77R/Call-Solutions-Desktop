import { useEffect, useState } from 'react';
import './UpdateBanner.css';

const CHECK_EVERY_MS = 5 * 60 * 1000;

export default function UpdateBanner() {
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return undefined;
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { id } = await res.json();
        if (!stopped && id && id !== __BUILD_ID__) setFresh(true);
      } catch {
        return;
      }
    };
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
    };
  }, []);

  if (!fresh) return null;
  return (
    <div className="update-banner" role="status">
      <span className="update-banner__dot" aria-hidden="true" />
      <span>Hay una versión nueva de la app.</span>
      <button type="button" onClick={() => window.location.reload()}>
        Actualizar
      </button>
    </div>
  );
}
