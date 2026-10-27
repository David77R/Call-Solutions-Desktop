import { useState } from 'react';
import SaveBar, { useSaver } from './SaveBar';
import { saveCompanyCatalog } from '../../lib/admin';

const clone = (v) => JSON.parse(JSON.stringify(v));

export default function PricesEditor({ company }) {
  const [draft, setDraft] = useState(() => clone(company));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(0);
  const save = useSaver(saveCompanyCatalog);
  const dirty = JSON.stringify(draft) !== JSON.stringify(company);

  const setItem = (ci, ii, key, value) =>
    setDraft((d) => {
      const next = clone(d);
      next.categories[ci].items[ii][key] = value;
      return next;
    });

  return (
    <div className="admin-block">
      {draft.categories.map((cat, ci) => (
        <section key={ci} className={open === ci ? 'acc is-open' : 'acc'}>
          <button type="button" className="acc__head" aria-expanded={open === ci} onClick={() => setOpen(open === ci ? -1 : ci)}>
            <span>{cat.name}</span>
            <span className="acc__count">{cat.items.length} precios</span>
          </button>
          {open === ci && (
            <div className="acc__body">
              {cat.items.map((item, ii) => (
                <div key={ii} className="price-row">
                  <input className="sf-input" aria-label="Servicio" value={item.label} onChange={(e) => setItem(ci, ii, 'label', e.target.value)} />
                  <input className="sf-input price-row__price" aria-label={`Precio de ${item.label}`} value={item.price_display || ''} onChange={(e) => setItem(ci, ii, 'price_display', e.target.value)} />
                  <label className="sf-check">
                    <input type="checkbox" checked={!!item.needs_review} onChange={(e) => setItem(ci, ii, 'needs_review', e.target.checked)} />
                    Verificar
                  </label>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
      <div className="admin-notes">
        <h3>Notas de la empresa</h3>
        <textarea
          className="sf-input sf-textarea"
          aria-label="Notas, una por línea"
          value={(draft.notes || []).join('\n')}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value.split('\n') }))}
        />
        <p className="admin-hint">Una nota por línea. Se muestran en Precios cuando eligen la empresa.</p>
      </div>
      <SaveBar
        dirty={dirty}
        status={status}
        error={error}
        onDiscard={() => setDraft(clone(company))}
        onSave={() => save(setStatus, setError, { ...draft, notes: (draft.notes || []).map((n) => n.trim()).filter(Boolean) })}
      />
    </div>
  );
}
