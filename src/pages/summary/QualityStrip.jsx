import { SATISFACTION } from '../../lib/qualityControl';

export function QualityStrip({ entries }) {
  if (!entries.length) return <p className="qc-strip qc-strip--empty">Sin controles de calidad este día.</p>;
  const counts = Object.entries(SATISFACTION).map(([key, meta]) => ({ key, ...meta, n: entries.filter((e) => e.satisfaction === key).length }));
  return (
    <div className="qc-strip">
      <span className="qc-strip__title">
        Control de calidad: {entries.length} {entries.length === 1 ? 'cliente' : 'clientes'}
      </span>
      <span className="qc-strip__bar" aria-hidden="true">
        {counts.map((c) => (c.n ? <i key={c.key} style={{ flex: c.n, background: c.color }} /> : null))}
      </span>
      <span className="qc-strip__counts">
        {counts
          .filter((c) => c.n)
          .map((c) => (
            <span key={c.key} style={{ '--sat': c.color }}>
              <b aria-hidden="true" />
              {c.label}: {c.n}
            </span>
          ))}
      </span>
    </div>
  );
}

export function QualityDetail({ entries }) {
  if (!entries.length) return null;
  return (
    <div className="qc-detail">
      <h4>Controles de calidad</h4>
      <ul>
        {entries.map((e) => (
          <li key={e.id} style={{ '--sat': SATISFACTION[e.satisfaction]?.color || 'var(--line)' }}>
            <strong>
              {SATISFACTION[e.satisfaction]?.label || 'Sin calificar'} · Cliente {e.client_ordinal}
              {e.groomer_name ? ` de ${e.groomer_name}` : ''}, por {e.contact_method}
            </strong>
            {e.feedback_text && <span className="qc-detail__text">“{e.feedback_text}”</span>}
            <span className="qc-detail__meta">
              {e.review_requested ? 'Reseña pedida. ' : ''}
              {e.rescheduled ? `Reagendado${e.reschedule_date ? ` para ${e.reschedule_date}` : ''}. ` : ''}
              Por {e.created_by}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
