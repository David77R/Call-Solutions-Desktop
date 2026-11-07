import { useState } from 'react';
import SaveBar, { useSaver } from './SaveBar';
import { saveCompanyCatalog } from '../../lib/admin';
import { isCatText } from '../../lib/search';

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

  const [publish, setPublish] = useState('idle');
  const [publishError, setPublishError] = useState('');

  const publishCompany = async () => {
    setPublish('saving');
    setPublishError('');
    try {
      await saveCompanyCatalog(draft);
      setPublish('done');
    } catch (err) {
      setPublish('idle');
      setPublishError(err?.message || 'No se pudo publicar. Revisa la conexión e inténtalo de nuevo.');
    }
  };

  return (
    <div className="admin-block">
      {company.seed_only && publish !== 'done' && (
        <div className="desc-sync">
          <p>
            {company.name} es nueva y todavía no está en la base de datos. Ya la ve todo el equipo en la app, pero Fifo no la conoce hasta que la publiques. Al publicarla, los
            cambios de precios que hagas aquí también quedan guardados.
          </p>
          <button type="button" className="savebar__save" disabled={publish === 'saving'} onClick={publishCompany}>
            {publish === 'saving' ? 'Publicando…' : 'Publicar empresa'}
          </button>
          {publishError && <p className="sf-error">{publishError}</p>}
        </div>
      )}
      {company.pending_updates?.length > 0 && !company.seed_only && publish !== 'done' && (
        <div className="desc-sync">
          <p>
            Hay precios nuevos de {company.name} que el equipo ya ve en la app de escritorio: {company.pending_updates.join(' · ')}. Guárdalos en la base de datos para que Fifo y
            la app del celular también los tengan.
          </p>
          <button type="button" className="savebar__save" disabled={publish === 'saving'} onClick={publishCompany}>
            {publish === 'saving' ? 'Guardando…' : 'Guardar en la base de datos'}
          </button>
          {publishError && <p className="sf-error">{publishError}</p>}
        </div>
      )}
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
                  <input
                    className="sf-input price-row__price"
                    aria-label={`Precio de ${item.label}`}
                    value={item.price_display || ''}
                    onChange={(e) => setItem(ci, ii, 'price_display', e.target.value)}
                  />
                  <label className="sf-check">
                    <input type="checkbox" checked={!!item.needs_review} onChange={(e) => setItem(ci, ii, 'needs_review', e.target.checked)} />
                    Verificar
                  </label>
                  <label className="sf-check" title="Marca este precio como servicio para gatos">
                    <input type="checkbox" checked={item.is_cat ?? isCatText(`${cat.name} ${item.label}`)} onChange={(e) => setItem(ci, ii, 'is_cat', e.target.checked)} />
                    Gato
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
