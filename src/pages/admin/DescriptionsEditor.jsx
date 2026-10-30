import { useState } from 'react';
import SaveBar, { useSaver } from './SaveBar';
import { saveServiceDescriptions } from '../../lib/admin';

const clone = (v) => JSON.parse(JSON.stringify(v));

function EntryEditor({ name, entry, onChange }) {
  return (
    <div className="desc-entry">
      <h4>{name}</h4>
      <div className="desc-entry__langs">
        {['es', 'en'].map((lang) => (
          <label key={lang} className="sf-field">
            <span>{lang === 'es' ? 'Español' : 'English'}</span>
            <textarea className="sf-input sf-textarea" value={entry[lang] || ''} onChange={(e) => onChange({ ...entry, [lang]: e.target.value })} />
          </label>
        ))}
      </div>
    </div>
  );
}

export default function DescriptionsEditor({ descriptions, missing, companies }) {
  const [draft, setDraft] = useState(() => clone(descriptions));
  const [scope, setScope] = useState('global');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const save = useSaver(({ global, byCompany }) => saveServiceDescriptions(global, byCompany));
  const dirty = JSON.stringify(draft) !== JSON.stringify(descriptions);
  const dict = scope === 'global' ? draft.global || {} : (draft.byCompany || {})[scope] || {};

  const update = (key, entry) =>
    setDraft((d) => {
      const next = clone(d);
      if (scope === 'global') next.global[key] = entry;
      else next.byCompany[scope] = { ...next.byCompany[scope], [key]: entry };
      return next;
    });

  return (
    <div className="admin-block">
      {missing > 0 && !dirty && (
        <div className="desc-sync">
          <p>
            Hay {missing} {missing === 1 ? 'descripción nueva o actualizada' : 'descripciones nuevas o actualizadas'} que la app ya muestra pero Fifo todavía no conoce. Envíalas para que Fifo
            explique los servicios igual que el ticket.
          </p>
          <button type="button" className="savebar__save" disabled={status === 'saving'} onClick={() => save(setStatus, setError, draft)}>
            {status === 'saving' ? 'Enviando…' : 'Enviar a Fifo'}
          </button>
        </div>
      )}
      <div className="admin-scope" role="group" aria-label="Alcance">
        <button type="button" className="sf-chip" aria-pressed={scope === 'global'} onClick={() => setScope('global')}>
          Generales
        </button>
        {companies.map((c) => (
          <button key={c.slug} type="button" className="sf-chip" aria-pressed={scope === c.slug} onClick={() => setScope(c.slug)}>
            {c.name}
          </button>
        ))}
      </div>
      {Object.keys(dict).length ? (
        Object.entries(dict).map(([key, entry]) => <EntryEditor key={`${scope}-${key}`} name={key} entry={entry} onChange={(v) => update(key, v)} />)
      ) : (
        <p className="admin-hint">Esta empresa usa las descripciones generales.</p>
      )}
      <SaveBar dirty={dirty} status={status} error={error} onDiscard={() => setDraft(clone(descriptions))} onSave={() => save(setStatus, setError, draft)} />
    </div>
  );
}
