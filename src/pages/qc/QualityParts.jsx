import { useId, useState } from 'react';
import { SATISFACTION, createQualityEntry, updateQualityEntry } from '../../lib/qualityControl';
import '../summary/Summary.css';
import './QualityPage.css';

export function Face({ kind }) {
  const mouth = kind === 'good' ? 'M8 14.5c1.2 1.6 2.5 2.3 4 2.3s2.8-.7 4-2.3' : kind === 'bad' ? 'M8 16.5c1.2-1.6 2.5-2.3 4-2.3s2.8.7 4 2.3' : 'M8.5 15.5h7';
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" />
      <path d={mouth} />
    </svg>
  );
}

function formFromEntry(entry) {
  return {
    company_slug: entry.company_slug,
    groomer_name: entry.groomer_name || '',
    client_ordinal: String(entry.client_ordinal || 1),
    contact_method: entry.contact_method || 'llamada',
    satisfaction: entry.satisfaction || null,
    feedback_text: entry.feedback_text || '',
    review_requested: !!entry.review_requested,
    rescheduled: !!entry.rescheduled,
    reschedule_date: entry.reschedule_date || '',
  };
}

function emptyForm(slug) {
  return { company_slug: slug, groomer_name: '', client_ordinal: '1', contact_method: 'llamada', satisfaction: null, feedback_text: '', review_requested: false, rescheduled: false, reschedule_date: '' };
}

export function Composer({ company, roster, agentName, dateKey, entry = null, onDone = null }) {
  const [form, setForm] = useState(() => (entry ? formFromEntry(entry) : emptyForm(company.slug)));
  const groomers = [...new Set(['', ...roster, ...(form.groomer_name ? [form.groomer_name] : [])])];
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const id = useId();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = (e) => {
    e.preventDefault();
    if (entry) {
      updateQualityEntry(entry.id, form, agentName).catch(() => {});
      onDone?.();
      return;
    }
    setSaving(true);
    createQualityEntry({ ...form, created_by: agentName }, dateKey).catch(() => {});
    setSaving(false);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
    setForm((f) => ({ ...emptyForm(company.slug), groomer_name: f.groomer_name, client_ordinal: String((Number(f.client_ordinal) || 1) + 1) }));
  };

  return (
    <form className={entry ? 'qc-composer qc-composer--edit' : 'qc-composer'} onSubmit={save}>
      <div className="qc-composer__scan" aria-hidden="true" />
      <div className="qc-row">
        <fieldset className="qc-groomers">
          <legend>Groomer</legend>
          <div className="qc-groomers__list">
            {groomers.map((n, i) => (
              <button
                key={n || 'none'}
                type="button"
                className="qc-groomer"
                aria-pressed={form.groomer_name === n}
                style={{ '--i': i }}
                onClick={() => set('groomer_name', n)}
              >
                <span className="qc-groomer__avatar" aria-hidden="true">
                  {n ? n.trim().charAt(0).toUpperCase() : '?'}
                </span>
                {n || 'Sin especificar'}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="sf-field">
          <label htmlFor={`${id}-o`}>Cliente número</label>
          <input id={`${id}-o`} className="sf-input" inputMode="numeric" value={form.client_ordinal} onChange={(e) => set('client_ordinal', e.target.value.replace(/[^0-9]/g, ''))} />
        </div>
        <fieldset className="qc-seg">
          <legend>Contacto</legend>
          {['llamada', 'mensaje'].map((m) => (
            <button key={m} type="button" aria-pressed={form.contact_method === m} onClick={() => set('contact_method', m)}>
              {m === 'llamada' ? 'Llamada' : 'Mensaje'}
            </button>
          ))}
        </fieldset>
      </div>

      <fieldset className="qc-faces">
        <legend>¿Cómo le fue al cliente?</legend>
        {Object.entries(SATISFACTION).map(([key, meta]) => (
          <button key={key} type="button" className="qc-face" aria-pressed={form.satisfaction === key} style={{ '--sat': meta.color }} onClick={() => set('satisfaction', key)}>
            <Face kind={key} />
            {meta.label}
          </button>
        ))}
      </fieldset>

      <div className="sf-field">
        <label htmlFor={`${id}-f`}>Lo que dijo el cliente</label>
        <textarea id={`${id}-f`} className="sf-input sf-textarea" value={form.feedback_text} onChange={(e) => set('feedback_text', e.target.value)} />
      </div>

      <div className="qc-row qc-row--toggles">
        <label className="sf-check">
          <input type="checkbox" checked={form.review_requested} onChange={(e) => set('review_requested', e.target.checked)} />
          Se pidió reseña
        </label>
        <label className="sf-check">
          <input type="checkbox" checked={form.rescheduled} onChange={(e) => set('rescheduled', e.target.checked)} />
          Se reagendó
        </label>
        {form.rescheduled && (
          <input type="date" className="date-nav__input" value={form.reschedule_date} aria-label="Fecha de la nueva cita" onChange={(e) => set('reschedule_date', e.target.value)} />
        )}
        {entry && (
          <button type="button" className="sf-chip qc-cancel" onClick={() => onDone?.()}>
            Cancelar
          </button>
        )}
        <button type="submit" className={done ? 'qc-save is-done' : 'qc-save'} disabled={saving || !form.satisfaction}>
          {entry ? 'Guardar cambios' : done ? 'Registrado' : saving ? 'Guardando…' : 'Registrar control'}
        </button>
      </div>
    </form>
  );
}

export function QualityEntry({ entry: e, index: i, company, onDelete, editCompany, roster = [], agentName }) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  if (editing && editCompany) {
    return (
      <li className="qc-item qc-item--editing">
        <Composer company={editCompany} roster={roster} agentName={agentName} dateKey={e.date_key} entry={e} onDone={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className="qc-item" style={{ '--sat': SATISFACTION[e.satisfaction]?.color || 'var(--line)', '--i': Math.min(i, 12) }}>
      <span className="qc-item__face">
        <Face kind={e.satisfaction || 'neutral'} />
      </span>
      <div className="qc-item__body">
        {company && (
          <span className="qc-item__company" style={{ '--co': company.color_primary }}>
            {company.name}
          </span>
        )}
        <p className="qc-item__title">
          Cliente {e.client_ordinal}
          {e.groomer_name ? ` de ${e.groomer_name}` : ''}, por {e.contact_method}
        </p>
        {e.feedback_text && <p className="qc-item__text">{e.feedback_text}</p>}
        <p className="qc-item__meta">
          {e.review_requested ? 'Reseña pedida. ' : ''}
          {e.rescheduled ? `Reagendado${e.reschedule_date ? ` para ${e.reschedule_date}` : ''}. ` : ''}
          Registrado por {e.created_by}
          {e.updated_by ? `. Editado por ${e.updated_by}` : ''}
        </p>
      </div>
      {confirming ? (
        <span className="qc-item__actions">
          <button type="button" className="sf-chip sf-chip--danger" onClick={() => onDelete(e.id)}>
            Sí, borrar
          </button>
          <button type="button" className="sf-chip" onClick={() => setConfirming(false)}>
            No
          </button>
        </span>
      ) : (
        <span className="qc-item__actions">
          {editCompany && (
            <button type="button" className="sf-chip" onClick={() => setEditing(true)}>
              Editar
            </button>
          )}
          <button type="button" className="sf-chip" onClick={() => setConfirming(true)}>
            Borrar
          </button>
        </span>
      )}
    </li>
  );
}

export function QualityStats({ list }) {
  const counts = Object.keys(SATISFACTION).map((k) => ({ key: k, n: list.filter((e) => e.satisfaction === k).length }));
  const total = list.length || 1;
  return (
    <section className="qc-stats">
      <div className="qc-bar" role="img" aria-label={counts.map((c) => `${SATISFACTION[c.key].label}: ${c.n}`).join(', ')}>
        {counts.map((c) => (
          <span key={c.key} style={{ width: `${(c.n / total) * 100}%`, background: SATISFACTION[c.key].color }} />
        ))}
      </div>
      <div className="qc-legend">
        {counts.map((c) => (
          <span key={c.key}>
            <i style={{ background: SATISFACTION[c.key].color }} />
            {SATISFACTION[c.key].label}: {c.n}
          </span>
        ))}
        <span>Total: {list.length}</span>
      </div>
    </section>
  );
}
