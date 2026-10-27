import { useCallback, useEffect, useRef, useState } from 'react';
import Bubble from './Bubble';

export default function SimulateView({ script, resolve, lang }) {
  const [shown, setShown] = useState(1);
  const endRef = useRef(null);
  const done = shown >= script.length;

  const next = useCallback(() => setShown((n) => Math.min(n + 1, script.length)), [script.length]);
  const back = useCallback(() => setShown((n) => Math.max(1, n - 1)), []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [shown]);

  return (
    <div className="simulate">
      <div className="simulate__progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${shown / script.length})` }} />
      </div>
      <div className="conversation">
        {script.slice(0, shown).map((step, i) => (
          <Bubble key={i} step={step} text={resolve(step)} lang={lang} typing={i === shown - 1 && step.speaker === 'customer'} />
        ))}
      </div>
      <div className="simulate__controls" ref={endRef}>
        {done ? (
          <>
            <p className="simulate__done">Llamada completa</p>
            <button type="button" className="flow-btn" onClick={() => setShown(1)}>
              Repetir la llamada
            </button>
          </>
        ) : (
          <>
            <button type="button" className="flow-btn flow-btn--ghost" onClick={back} disabled={shown === 1}>
              Atrás
            </button>
            <button type="button" className="flow-btn" onClick={next}>
              Siguiente
            </button>
            <span className="simulate__hint">
              <kbd>Espacio</kbd> o <kbd>→</kbd> para avanzar
            </span>
          </>
        )}
      </div>
    </div>
  );
}
