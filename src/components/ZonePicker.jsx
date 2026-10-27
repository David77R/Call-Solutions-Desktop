import { useId, useState } from 'react';
import { findCruzinZone } from '../data/cruzinZones';

export default function ZonePicker({ zone, onChange }) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const matches = query.trim() && !zone ? findCruzinZone(query).slice(0, 5) : [];

  return (
    <div className="ticket-field">
      <label htmlFor={inputId} className="ticket-field__label">
        Pueblo, ciudad o ZIP del cliente
      </label>
      <input
        id={inputId}
        className="ticket-field__input"
        value={zone ? zone.name : query}
        placeholder="Ej. Oshkosh o 54901"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(null);
        }}
      />
      {matches.length > 0 && (
        <ul className="ticket-field__options">
          {matches.map((z) => (
            <li key={z.name}>
              <button
                type="button"
                onClick={() => {
                  onChange(z);
                  setQuery('');
                }}
              >
                <span>
                  {z.name}
                  {z.zips.length ? ` (${z.zips[0]})` : ''}
                </span>
                <span className="ticket-field__fee">{z.fee > 0 ? `+$${z.fee}` : 'Sin cargo'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {zone?.needs_review && <p className="ticket-field__hint">Esta distancia está pendiente de confirmar.</p>}
    </div>
  );
}
