import { useState } from 'react';
import { CheckIcon, CopyIcon } from '../../components/Icons';
import { formatSummaryText } from '../../lib/reportFormatter';
import { summaryMetrics, whatsappLink } from '../../lib/summaries';
import SummaryQuality from './SummaryQuality';

const when = (iso) =>
  iso ? new Date(iso).toLocaleString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

export default function SavedSummary({ entry, company, roster, agentName, justSaved, offline, onEdit }) {
  const [copied, setCopied] = useState(false);
  const text = formatSummaryText(entry);
  const m = summaryMetrics(entry);

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
    <div className="summary-form saved-summary">
      <div className="summary-form__fields">
        <section className={justSaved ? 'saved-card is-fresh' : 'saved-card'}>
          <span className="saved-card__check" aria-hidden="true">
            <CheckIcon size={30} />
          </span>
          <div className="saved-card__body">
            <h2>Resumen guardado</h2>
            <p>
              Guardado por <strong>{entry.author_name || 'Agente'}</strong> el {when(entry.saved_at).replace(/\.$/, '')}.
              {entry.edited_by ? ` Última edición de ${entry.edited_by}.` : ''}
            </p>
            {offline && <p className="saved-card__offline">Quedó guardado en este equipo y se subirá solo en cuanto vuelva la conexión. No cierres la app hasta entonces.</p>}
            {entry.counter_source && (
              <span className="history-item__counter">Contado por {entry.counter_source.scope === 'team' ? 'todo el equipo' : (entry.counter_source.by_name || 'el agente').split(' ')[0]}</span>
            )}
          </div>
          <div className="saved-card__stats">
            <span>
              <strong>{m.calls}</strong> llamadas
            </span>
            <span>
              <strong>{m.messages}</strong> mensajes
            </span>
            <span>
              <strong>{m.appointments}</strong> citas nuevas
            </span>
          </div>
          <button type="button" className="saved-card__edit" onClick={onEdit}>
            Editar resumen
          </button>
        </section>

        <SummaryQuality company={company} dateKey={entry.date_key} roster={roster} agentName={agentName} />
      </div>

      <aside className="summary-form__preview">
        <div className="wa-preview">
          <span className="wa-preview__label">Así se ve en WhatsApp</span>
          <pre className="wa-preview__bubble">{text}</pre>
        </div>
        <div className="summary-form__share">
          <button type="button" className="sf-ghost" onClick={copy}>
            {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
            {copied ? 'Copiado' : 'Copiar texto'}
          </button>
          <a className="sf-ghost" href={whatsappLink(text)} target="_blank" rel="noreferrer">
            Abrir en WhatsApp
          </a>
        </div>
      </aside>
    </div>
  );
}
