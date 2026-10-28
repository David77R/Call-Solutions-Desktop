import { useState } from 'react';
import SaveBar, { useSaver } from './SaveBar';
import { saveMessageTemplates } from '../../lib/admin';
import { AUTO_FIELDS, FIELD_LABELS, TEMPLATE_GROUPS } from '../../data/messageTemplates';

const clone = (v) => JSON.parse(JSON.stringify(v));
const FIELDS = [...Object.keys(AUTO_FIELDS), ...Object.keys(FIELD_LABELS)];

function newTemplate() {
  return { id: `msg_${Date.now().toString(36)}`, group: 'antes', title: 'Nuevo mensaje', es: '', en: '' };
}

export default function MessagesEditor({ items }) {
  const [draft, setDraft] = useState(() => clone(items));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null);
  const save = useSaver((list) => saveMessageTemplates(list));
  const dirty = JSON.stringify(draft) !== JSON.stringify(items);

  const update = (id, fields) => setDraft((d) => d.map((t) => (t.id === id ? { ...t, ...fields } : t)));

  return (
    <div className="admin-block">
      <p className="admin-hint">
        Estos mensajes aparecen en el botón Mensajes de la barra de arriba. Usa campos entre llaves para lo que cambia en cada cliente:{' '}
        {FIELDS.map((f) => (
          <code key={f} className="msg-ed__token">{`{${f}}`}</code>
        ))}
        . La empresa y el agente se llenan solos.
      </p>

      {draft.map((t, i) => (
        <div key={t.id} className="desc-entry msg-ed" style={{ '--i': Math.min(i, 12) }}>
          <div className="msg-ed__top">
            <label className="sf-field msg-ed__title">
              <span>Título</span>
              <input className="sf-input" value={t.title} onChange={(e) => update(t.id, { title: e.target.value })} />
            </label>
            <div className="admin-scope" role="group" aria-label="Sección">
              {TEMPLATE_GROUPS.map((g) => (
                <button key={g.key} type="button" className="sf-chip" aria-pressed={(t.group || 'antes') === g.key} onClick={() => update(t.id, { group: g.key })}>
                  {g.label}
                </button>
              ))}
            </div>
            {confirming === t.id ? (
              <span className="msg-ed__confirm">
                <button
                  type="button"
                  className="sf-chip sf-chip--danger"
                  onClick={() => {
                    setDraft((d) => d.filter((x) => x.id !== t.id));
                    setConfirming(null);
                  }}
                >
                  Sí, borrar
                </button>
                <button type="button" className="sf-chip" onClick={() => setConfirming(null)}>
                  No
                </button>
              </span>
            ) : (
              <button type="button" className="sf-remove" aria-label={`Borrar ${t.title}`} onClick={() => setConfirming(t.id)}>
                ×
              </button>
            )}
          </div>
          <div className="desc-entry__langs">
            {['es', 'en'].map((lang) => (
              <label key={lang} className="sf-field">
                <span>{lang === 'es' ? 'Español' : 'English'}</span>
                <textarea className="sf-input sf-textarea" value={t[lang] || ''} onChange={(e) => update(t.id, { [lang]: e.target.value })} />
              </label>
            ))}
          </div>
        </div>
      ))}

      <button type="button" className="sf-ghost msg-ed__add" onClick={() => setDraft((d) => [...d, newTemplate()])}>
        Agregar mensaje
      </button>

      <SaveBar
        dirty={dirty}
        status={status}
        error={error}
        onDiscard={() => setDraft(clone(items))}
        onSave={() => save(setStatus, setError, draft.filter((t) => t.title.trim() && (t.es.trim() || t.en.trim())))}
      />
    </div>
  );
}
