import { useState } from 'react';
import { Link } from 'react-router-dom';
import CompanyTabs from '../../components/CompanyTabs';
import { TrendBars } from '../../components/Charts';
import SummaryForm from './SummaryForm';
import SavedSummary from './SavedSummary';
import { useCatalog } from '../../lib/useCatalog';
import { useAuth } from '../../lib/AuthContext';
import { accentTokens } from '../../lib/color';
import { formatSummaryText } from '../../lib/reportFormatter';
import { deleteSummary, labelFromDateKey, shortLabel, summaryMetrics, todayKey, useCompanySummaries } from '../../lib/summaries';
import { isCombinedMessages, useGroomerRosters } from '../../lib/useGroomerRosters';
import './Summary.css';

function HistoryItem({ entry, active, onEdit }) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const m = summaryMetrics(entry);

  const copy = async () => {
    await navigator.clipboard.writeText(formatSummaryText(entry)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <li className={active ? 'history-item is-active' : 'history-item'}>
      <div className="history-item__top">
        <span className="history-item__date">{labelFromDateKey(entry.date_key)}</span>
        <span className="history-item__author">{entry.author_name}</span>
      </div>
      {entry.counter_source && (
        <span className="history-item__counter">
          Contado por {entry.counter_source.scope === 'team' ? 'todo el equipo' : (entry.counter_source.by_name || 'el agente').split(' ')[0]}
        </span>
      )}
      <div className="history-item__stats">
        <span>
          <strong>{m.calls}</strong> llamadas
        </span>
        <span>
          <strong>{m.appointments}</strong> citas nuevas
        </span>
        <span>
          <strong>{m.confirmed}</strong> confirmadas
        </span>
      </div>
      <div className="history-item__actions">
        {confirming ? (
          <>
            <span className="history-item__ask">¿Borrar este resumen?</span>
            <button type="button" className="sf-chip sf-chip--danger" onClick={() => deleteSummary(entry)}>
              Sí, borrar
            </button>
            <button type="button" className="sf-chip" onClick={() => setConfirming(false)}>
              No
            </button>
          </>
        ) : (
          <>
            <button type="button" className="sf-chip" onClick={() => onEdit(entry.date_key)}>
              Editar
            </button>
            <button type="button" className="sf-chip" onClick={copy}>
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button type="button" className="sf-chip" onClick={() => setConfirming(true)}>
              Borrar
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export default function DailySummaryPage() {
  const { companies } = useCatalog();
  const { user } = useAuth();
  const rosters = useGroomerRosters();
  const [slug, setSlug] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [toast, setToast] = useState(false);
  const [editing, setEditing] = useState(false);
  const [lastSave, setLastSave] = useState(null);

  const company = companies.find((c) => c.slug === slug) || companies[0] || null;
  const { items, loading } = useCompanySummaries(company?.slug);
  const today = todayKey();
  const targetKey = editingKey || today;
  const baseEntry = items.find((i) => i.date_key === targetKey) || null;
  const trend = items
    .slice(0, 7)
    .reverse()
    .map((e) => ({ label: shortLabel(e.date_key), value: Number(e.newAppointments || 0) }));

  const pickCompany = (next) => {
    if (!next) return;
    setSlug(next);
    setEditingKey(null);
    setEditing(false);
    setLastSave(null);
  };

  const editDay = (key) => {
    setEditingKey(key);
    setEditing(true);
    setLastSave(null);
  };

  return (
    <div className="summary" style={accentTokens(company?.color_primary)}>
      <div className="summary__top">
        <CompanyTabs companies={companies} activeSlug={company?.slug ?? null} onChange={pickCompany} showAll={false} />
      </div>

      <div className="summary__head">
        <h1 className="summary__title">Resumen del día</h1>
        <p className="summary__sub">
          {editingKey && editingKey !== today ? (
            <>
              Editando el resumen del <strong>{labelFromDateKey(editingKey)}</strong>.{' '}
              <button
                type="button"
                className="sf-link"
                onClick={() => {
                  setEditingKey(null);
                  setEditing(false);
                }}
              >
                Volver a hoy
              </button>
            </>
          ) : baseEntry && editing ? (
            <>Editando el resumen de hoy de {company?.name}. Al guardar queda registrado quién lo editó.</>
          ) : baseEntry ? (
            <>{labelFromDateKey(today)}</>
          ) : (
            <>{labelFromDateKey(today)}</>
          )}
        </p>
      </div>

      <div className="summary__layout">
        {company && !loading && baseEntry && !editing ? (
          <SavedSummary
            key={`${company.slug}-${targetKey}`}
            entry={baseEntry}
            company={company}
            roster={rosters[company.slug] || []}
            agentName={user?.displayName || 'Agente'}
            justSaved={lastSave?.key === `${company.slug}_${targetKey}`}
            offline={lastSave?.key === `${company.slug}_${targetKey}` && !lastSave.synced}
            onEdit={() => {
              setEditing(true);
              setLastSave(null);
            }}
          />
        ) : company && !loading ? (
          <SummaryForm
            key={`${company.slug}-${targetKey}-${baseEntry?.saved_at || 'new'}`}
            company={company}
            combined={isCombinedMessages(company.slug)}
            roster={rosters[company.slug] || []}
            baseEntry={baseEntry}
            authorName={user?.displayName || ''}
            dateKey={targetKey}
            onSaved={(entry) => {
              setEditing(false);
              setLastSave({ key: `${company.slug}_${targetKey}`, synced: entry?.synced !== false });
              setToast(entry?.synced === false ? 'offline' : 'online');
              setTimeout(() => setToast(false), 3200);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onCancel={baseEntry ? () => setEditing(false) : null}
          />
        ) : (
          <div className="summary__loading">Cargando…</div>
        )}

        <section className="summary__history">
          <div className="summary__history-head">
            <h2 className="summary__h2">Historial de {company?.name}</h2>
            <div className="summary__trend">
              <TrendBars data={trend} color={company?.color_primary || '#7f97e8'} title="Citas nuevas en los últimos registros" />
              <Link to="/estadisticas" className="stats-link">
                Ver estadísticas completas
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          {items.length ? (
            <ul className="history-list">
              {items.map((entry) => (
                <HistoryItem key={entry.date_key} entry={entry} active={entry.date_key === targetKey} onEdit={editDay} />
              ))}
            </ul>
          ) : (
            <p className="summary__empty">Todavía no hay resúmenes guardados para esta empresa.</p>
          )}
        </section>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast === 'offline' ? 'Resumen guardado en este equipo. Se subirá en cuanto vuelva la conexión.' : 'Resumen guardado. El supervisor ya lo ve en Resúmenes totales.'}
        </div>
      )}
    </div>
  );
}
