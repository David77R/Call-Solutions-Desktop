import { useState } from 'react';
import { SATISFACTION, deleteQualityEntry, useQualityEntries } from '../../lib/qualityControl';
import { Composer, QualityEntry, QualityStats } from '../qc/QualityParts';

export default function SummaryQuality({ company, dateKey, roster, agentName }) {
  const entries = useQualityEntries(dateKey).filter((e) => e.company_slug === company.slug);
  const [open, setOpen] = useState(false);
  const counts = Object.entries(SATISFACTION)
    .map(([key, meta]) => ({ key, label: meta.label, color: meta.color, n: entries.filter((e) => e.satisfaction === key).length }))
    .filter((c) => c.n > 0);

  return (
    <section className="sf-qc">
      <div className="sf-qc__head">
        <div>
          <h3>Control de calidad</h3>
          <p>
            {entries.length
              ? `${entries.length} ${entries.length === 1 ? 'cliente contactado' : 'clientes contactados'} este día.`
              : 'Todavía no hay controles registrados para este día.'}
            {counts.map((c) => (
              <span key={c.key} className="sf-qc__count" style={{ '--sat': c.color }}>
                <i aria-hidden="true" />
                {c.label}: {c.n}
              </span>
            ))}
          </p>
        </div>
        <button type="button" className={open ? 'sf-qc__toggle is-open' : 'sf-qc__toggle'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Cerrar' : '+ Registrar control'}
        </button>
      </div>

      {open && <Composer key={`${company.slug}-${dateKey}`} company={company} roster={roster} agentName={agentName} dateKey={dateKey} />}

      {entries.length > 0 && (
        <>
          <QualityStats list={entries} />
          <ul className="qc-list sf-qc__list">
            {entries.map((e, i) => (
              <QualityEntry key={e.id} entry={e} index={i} company={null} onDelete={deleteQualityEntry} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
