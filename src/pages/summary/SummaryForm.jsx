import { useEffect, useId, useState } from 'react';
import NumberField from '../../components/NumberField';
import { CheckIcon, CopyIcon } from '../../components/Icons';
import { formatSummaryText } from '../../lib/reportFormatter';
import { labelFromDateKey, saveSummary, whatsappLink } from '../../lib/summaries';
import SummaryQuality from './SummaryQuality';
import SummaryCounter from './SummaryCounter';
import { useAuth } from '../../lib/AuthContext';
import { totalOf, countsOf, useDayCounters } from '../../lib/counters';

function emptyGroomer(name = '') {
  return { name, completedCount: '', confirmedCount: '', absentToday: false, absentTomorrow: false };
}

function formFromEntry(entry, roster, author) {
  if (!entry) {
    return {
      author,
      calls: '',
      messagesMeta: '',
      messagesWhatsapp: '',
      newAppointments: '',
      groomers: roster.length ? roster.map((n) => emptyGroomer(n)) : [emptyGroomer()],
      issues: '',
      notes: '',
      counter_source: null,
    };
  }
  return {
    author: author || entry.author_name || '',
    calls: String(entry.calls ?? ''),
    messagesMeta: String(entry.messagesMeta ?? ''),
    messagesWhatsapp: String(entry.messagesWhatsapp ?? ''),
    newAppointments: String(entry.newAppointments ?? ''),
    groomers: entry.groomers?.length
      ? entry.groomers.map((g) => ({
          name: g.name || '',
          completedCount: String(g.completedCount ?? ''),
          confirmedCount: String(g.confirmedCount ?? ''),
          absentToday: !!(g.absentToday ?? g.absent),
          absentTomorrow: !!g.absentTomorrow,
        }))
      : roster.map((n) => emptyGroomer(n)),
    issues: entry.issues || '',
    notes: entry.notes || '',
    counter_source: entry.counter_source || null,
  };
}

export default function SummaryForm({ company, combined, roster, baseEntry, authorName, dateKey, onSaved }) {
  const [form, setForm] = useState(() => formFromEntry(baseEntry, roster, authorName));
  const [status, setStatus] = useState('idle');
  const [copied, setCopied] = useState(false);
  const id = useId();
  const { user } = useAuth();
  const { bySlug } = useDayCounters(dateKey);
  const agents = bySlug[company.slug];

  const applyCounter = (scope, counts) =>
    setForm((f) => ({
      ...f,
      calls: String(counts.calls),
      messagesMeta: String(counts.messagesMeta),
      messagesWhatsapp: combined ? f.messagesWhatsapp : String(counts.messagesWhatsapp),
      newAppointments: String(counts.appointments),
      counter_source: {
        scope,
        by_uid: user?.uid || null,
        by_name: user?.displayName || f.author || 'Agente',
        at: new Date().toISOString(),
        counts,
      },
    }));

  const mineTotal = totalOf(countsOf(agents?.[user?.uid]));
  useEffect(() => {
    if (baseEntry || form.counter_source || !mineTotal) return;
    if ([form.calls, form.messagesMeta, form.messagesWhatsapp, form.newAppointments].some((v) => String(v).trim() !== '')) return;
    applyCounter('mine', countsOf(agents[user.uid]));
  }, [mineTotal]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setGroomer = (i, key, value) =>
    setForm((f) => {
      const groomers = [...f.groomers];
      groomers[i] = { ...groomers[i], [key]: value };
      return { ...f, groomers };
    });

  const preview = {
    company_name: company.name,
    company_slug: company.slug,
    author_name: form.author,
    date_label: labelFromDateKey(dateKey),
    messagesCombined: combined,
    ...form,
    ...(baseEntry ? { edited_by: form.author, edited_at: new Date().toISOString() } : {}),
  };
  const text = formatSummaryText(preview);

  const save = async () => {
    setStatus('saving');
    try {
      const audit = baseEntry ? { edited_by: form.author, edited_at: new Date().toISOString() } : {};
      const entry = await saveSummary(company, form.author, { ...form, messagesCombined: combined, ...audit }, dateKey);
      setStatus('saved');
      onSaved?.(entry);
    } catch {
      setStatus('error');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="summary-form">
      <div className="summary-form__fields">
        <div className="sf-field">
          <label htmlFor={`${id}-author`}>Autor del resumen</label>
          <input id={`${id}-author`} className="sf-input" value={form.author} onChange={(e) => set('author')(e.target.value)} />
        </div>

        <SummaryCounter agents={agents} uid={user?.uid} combined={combined} source={form.counter_source} onUse={applyCounter} />

        <div className="sf-grid">
          <NumberField label="Llamadas recibidas" value={form.calls} onChange={set('calls')} />
          <NumberField label={combined ? 'Mensajes (Meta)' : 'Mensajes Meta'} value={form.messagesMeta} onChange={set('messagesMeta')} />
          {!combined && <NumberField label="Mensajes WhatsApp" value={form.messagesWhatsapp} onChange={set('messagesWhatsapp')} />}
          <NumberField label="Citas nuevas agendadas" value={form.newAppointments} onChange={set('newAppointments')} />
        </div>

        <section className="sf-groomers">
          <div className="sf-groomers__head">
            <h3>Groomers</h3>
            <button type="button" className="sf-link" onClick={() => setForm((f) => ({ ...f, groomers: [...f.groomers, emptyGroomer()] }))}>
              + Agregar groomer
            </button>
          </div>
          <div className="sf-table" role="table" aria-label="Citas por groomer">
            <div className="sf-row sf-row--head" role="row">
              <span role="columnheader">Groomer</span>
              <span role="columnheader">Realizadas hoy</span>
              <span role="columnheader">Confirmadas mañana</span>
              <span role="columnheader" className="sf-sr">Quitar</span>
            </div>
            {form.groomers.map((g, i) => (
              <div className="sf-row" role="row" key={i} style={{ '--i': i }}>
                <div className="sf-cell sf-cell--name" role="cell">
                  <input className="sf-input" value={g.name} placeholder="Nombre" aria-label="Nombre del groomer" onChange={(e) => setGroomer(i, 'name', e.target.value)} />
                </div>
                <div className={g.absentToday ? 'sf-cell is-absent' : 'sf-cell'} role="cell">
                  <NumberField compact value={g.completedCount} onChange={(v) => setGroomer(i, 'completedCount', v)} />
                  <label className="sf-check">
                    <input type="checkbox" checked={g.absentToday} onChange={(e) => setGroomer(i, 'absentToday', e.target.checked)} />
                    Ausente hoy
                  </label>
                </div>
                <div className={g.absentTomorrow ? 'sf-cell is-absent' : 'sf-cell'} role="cell">
                  <NumberField compact value={g.confirmedCount} onChange={(v) => setGroomer(i, 'confirmedCount', v)} />
                  <label className="sf-check">
                    <input type="checkbox" checked={g.absentTomorrow} onChange={(e) => setGroomer(i, 'absentTomorrow', e.target.checked)} />
                    Ausente mañana
                  </label>
                </div>
                <div className="sf-cell sf-cell--remove" role="cell">
                  <button
                    type="button"
                    className="sf-remove"
                    aria-label={`Quitar a ${g.name || 'este groomer'}`}
                    onClick={() => setForm((f) => ({ ...f, groomers: f.groomers.filter((_, j) => j !== i) }))}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <SummaryQuality
          company={company}
          dateKey={dateKey}
          roster={[...new Set([...roster, ...form.groomers.map((g) => g.name.trim()).filter(Boolean)])]}
          agentName={form.author.trim() || authorName || 'Agente'}
        />

        <div className="sf-field">
          <label htmlFor={`${id}-issues`}>Inconvenientes</label>
          <textarea id={`${id}-issues`} className="sf-input sf-textarea" value={form.issues} onChange={(e) => set('issues')(e.target.value)} />
        </div>
        <div className="sf-field">
          <label htmlFor={`${id}-notes`}>Notas adicionales</label>
          <textarea id={`${id}-notes`} className="sf-input sf-textarea" value={form.notes} onChange={(e) => set('notes')(e.target.value)} />
        </div>
      </div>

      <aside className="summary-form__preview">
        <div className="wa-preview">
          <span className="wa-preview__label">Así se verá en WhatsApp</span>
          <pre className="wa-preview__bubble">{text}</pre>
        </div>
        <div className="summary-form__actions">
          <button type="button" className={`sf-save is-${status}`} onClick={save} disabled={status === 'saving' || !form.author.trim()}>
            {status === 'saving' && <span className="login__spinner" aria-hidden="true" />}
            {status === 'saved' && <CheckIcon />}
            {status === 'saving' ? 'Guardando…' : status === 'saved' ? 'Resumen guardado' : baseEntry ? 'Guardar cambios' : 'Guardar resumen'}
          </button>
          {status === 'error' && <p className="sf-error">No se pudo guardar. Revisa la conexión e inténtalo de nuevo.</p>}
          {!form.author.trim() && <p className="sf-hint">Escribe el autor para poder guardar.</p>}
          <div className="summary-form__share">
            <button type="button" className="sf-ghost" onClick={copy}>
              {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
              {copied ? 'Copiado' : 'Copiar texto'}
            </button>
            <a className="sf-ghost" href={whatsappLink(text)} target="_blank" rel="noreferrer">
              Abrir en WhatsApp
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
