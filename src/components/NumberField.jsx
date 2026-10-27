import { useId } from 'react';
import './NumberField.css';

export default function NumberField({ label, value, onChange, compact = false }) {
  const id = useId();
  const n = Number(value) || 0;
  const set = (v) => onChange(v === '' ? '' : String(Math.max(0, v)));
  return (
    <div className={compact ? 'numfield numfield--compact' : 'numfield'}>
      {label && (
        <label htmlFor={id} className="numfield__label">
          {label}
        </label>
      )}
      <div className="numfield__box">
        <button type="button" className="numfield__btn" onClick={() => set(n - 1)} aria-label={`Restar uno a ${label || 'la cantidad'}`} disabled={n <= 0}>
          −
        </button>
        <input
          id={id}
          className="numfield__input"
          inputMode="numeric"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          aria-label={label ? undefined : 'Cantidad'}
        />
        <button type="button" className="numfield__btn" onClick={() => set(n + 1)} aria-label={`Sumar uno a ${label || 'la cantidad'}`}>
          +
        </button>
      </div>
    </div>
  );
}
