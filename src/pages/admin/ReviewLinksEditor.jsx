import { useEffect, useState } from 'react';
import { shortCompanyName } from '../../components/CompanyTabs';
import { saveReviewLinks, useReviewLinks } from '../../lib/reviewLinks';
import { useReminders } from '../../lib/reminders';
import { findReviewLinks } from '../../lib/findReviewLinks';

const looksLikeUrl = (v) => !v.trim() || /^https?:\/\/\S+$/i.test(v.trim());

export default function ReviewLinksEditor({ companies }) {
  const { links, loaded } = useReviewLinks();
  const [draft, setDraft] = useState(links);
  const [status, setStatus] = useState('idle');
  const { items: reminders } = useReminders();
  const found = findReviewLinks(reminders, companies);
  const pending = companies.filter((c) => found[c.slug] && (draft[c.slug] || '').trim() !== found[c.slug].url);

  useEffect(() => {
    if (loaded) setDraft(links);
  }, [links, loaded]);

  const dirty = JSON.stringify(Object.fromEntries(Object.entries(draft).filter(([, v]) => v?.trim()))) !== JSON.stringify(links);
  const invalid = Object.values(draft).some((v) => v && !looksLikeUrl(v));

  const save = async () => {
    setStatus('saving');
    try {
      await saveReviewLinks(draft);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1800);
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="desc-entry review-links">
      <h4>Links de reseña por empresa</h4>
      <p className="admin-hint">
        Pega el link de Google Maps donde el cliente deja la reseña. Se pone solo en los mensajes que tienen <code className="msg-ed__token">{'{link}'}</code> cuando eliges esa empresa.
      </p>
      {pending.length > 0 && (
        <div className="review-links__found" role="status">
          <span>
            Encontré {pending.length === 1 ? 'un link de reseña' : `${pending.length} links de reseña`} en Recordatorios para{' '}
            <strong>{pending.map((c) => shortCompanyName(c.name)).join(', ')}</strong>.
          </span>
          <button
            type="button"
            className="sf-chip"
            onClick={() => setDraft((d) => ({ ...d, ...Object.fromEntries(pending.map((c) => [c.slug, found[c.slug].url])) }))}
          >
            Usar estos links
          </button>
        </div>
      )}
      <div className="review-links__list">
        {companies.map((c) => {
          const value = draft[c.slug] || '';
          return (
            <label key={c.slug} className="sf-field review-links__row" style={{ '--co': c.color_primary }}>
              <span>
                <i aria-hidden="true" />
                {shortCompanyName(c.name)}
              </span>
              <input
                className={looksLikeUrl(value) ? 'sf-input' : 'sf-input is-invalid'}
                inputMode="url"
                placeholder="https://g.page/r/..."
                value={value}
                onChange={(e) => setDraft((d) => ({ ...d, [c.slug]: e.target.value }))}
              />
            </label>
          );
        })}
      </div>
      <div className="review-links__actions">
        {invalid && <span className="sf-error">Revisa los links: deben empezar con https://</span>}
        {status === 'error' && <span className="sf-error">No se pudo guardar. Revisa la conexión.</span>}
        <button type="button" className="savebar__save" disabled={!dirty || invalid || status === 'saving'} onClick={save}>
          {status === 'saving' ? 'Guardando…' : status === 'saved' ? 'Links guardados' : 'Guardar links'}
        </button>
      </div>
    </section>
  );
}
