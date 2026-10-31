import { useEffect, useState } from 'react';
import { shortCompanyName } from '../../components/CompanyTabs';
import { saveReviewLinks, useReviewLinks } from '../../lib/reviewLinks';

const looksLikeUrl = (v) => !v.trim() || /^https?:\/\/\S+$/i.test(v.trim());

export default function ReviewLinksEditor({ companies }) {
  const { links, loaded } = useReviewLinks();
  const [draft, setDraft] = useState(links);
  const [status, setStatus] = useState('idle');

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
