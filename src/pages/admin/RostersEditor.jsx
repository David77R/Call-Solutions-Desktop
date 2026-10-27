import { useState } from 'react';
import SaveBar, { useSaver } from './SaveBar';
import { saveRoster } from '../../lib/admin';

export default function RostersEditor({ company, names }) {
  const [draft, setDraft] = useState(names);
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const save = useSaver((list) => saveRoster(company.slug, list));
  const dirty = JSON.stringify(draft) !== JSON.stringify(names);

  const add = (e) => {
    e.preventDefault();
    const n = newName.trim();
    if (n && !draft.includes(n)) setDraft((d) => [...d, n]);
    setNewName('');
  };

  return (
    <div className="admin-block">
      <ul className="roster">
        {draft.map((n, i) => (
          <li key={n} className="roster__item" style={{ '--i': i }}>
            <span>{n}</span>
            <button type="button" className="sf-remove" aria-label={`Quitar a ${n}`} onClick={() => setDraft((d) => d.filter((x) => x !== n))}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <form className="roster__add" onSubmit={add}>
        <label htmlFor="roster-new" className="sf-sr">
          Nuevo groomer
        </label>
        <input id="roster-new" className="sf-input" placeholder="Nombre del groomer" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className="sf-ghost" disabled={!newName.trim()}>
          Agregar
        </button>
      </form>
      <SaveBar dirty={dirty} status={status} error={error} onDiscard={() => setDraft(names)} onSave={() => save(setStatus, setError, draft.map((n) => n.trim()).filter(Boolean))} />
    </div>
  );
}
