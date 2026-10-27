import { useState } from 'react';
import { CountUp, Donut, TrendBars } from '../../components/Charts';
import { useCatalog } from '../../lib/useCatalog';
import { buildDailyReportText, formatSummaryText } from '../../lib/reportFormatter';
import { buildDailyReportHtml } from '../../lib/dailyPdfReport';
import {
  deleteSummary,
  labelFromDateKey,
  printHtml,
  shiftDateKey,
  shortLabel,
  summaryMetrics,
  todayKey,
  useCompanySummaries,
  useDateSummaries,
  whatsappLink,
} from '../../lib/summaries';
import './Summary.css';

function CompanyTrend({ slug, color }) {
  const { items } = useCompanySummaries(slug);
  const data = items
    .slice(0, 7)
    .reverse()
    .map((e) => ({ label: shortLabel(e.date_key), value: Number(e.newAppointments || 0) }));
  return <TrendBars data={data} color={color} title="Citas nuevas, últimos registros" />;
}

function CompanyCard({ company, entry, index }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const color = company.color_primary;

  if (!entry) {
    return (
      <article className="co-card co-card--pending" style={{ '--co': color, '--i': index }}>
        <div className="co-card__head">
          <div>
            <h3 className="co-card__name">{company.name}</h3>
            <p className="co-card__pending">Sin resumen reportado para este día.</p>
          </div>
        </div>
      </article>
    );
  }

  const m = summaryMetrics(entry);
  const completedBy = (entry.groomers || []).filter((g) => g.name?.trim() && !(g.absentToday ?? g.absent) && g.completedCount);
  const confirmedBy = (entry.groomers || []).filter((g) => g.name?.trim() && !g.absentTomorrow && g.confirmedCount);

  const copy = async () => {
    await navigator.clipboard.writeText(formatSummaryText(entry)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="co-card" style={{ '--co': color, '--i': index }}>
      <div className="co-card__head">
        <div>
          <h3 className="co-card__name">{company.name}</h3>
          <p className="co-card__meta">
            Reportado por {entry.author_name || 'N/D'}
            {entry.edited_at ? `, editado por ${entry.edited_by}` : ''}
          </p>
        </div>
      </div>

      <div className="co-card__body">
        <div>
          <Donut value={m.appointments} total={m.messages + m.appointments} color={color} label={`${m.bookingPct}% de agendamiento`} />
          <p className="co-card__booking">agendamiento</p>
        </div>
        <dl className="co-card__stats">
          <div>
            <dt>Llamadas</dt>
            <dd>
              <CountUp value={m.calls} />
            </dd>
          </div>
          <div>
            <dt>Mensajes</dt>
            <dd>
              <CountUp value={m.messages} />
            </dd>
          </div>
          <div>
            <dt>Citas nuevas</dt>
            <dd>
              <CountUp value={m.appointments} />
            </dd>
          </div>
          <div>
            <dt>Confirmadas mañana</dt>
            <dd>
              <CountUp value={m.confirmed} />
            </dd>
          </div>
        </dl>
      </div>

      {open && (
        <div className="co-card__detail">
          {completedBy.length > 0 && (
            <div>
              <h4>Realizadas hoy por groomer</h4>
              <ul>
                {completedBy.map((g) => (
                  <li key={g.name}>
                    {g.name}: {g.completedCount}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {confirmedBy.length > 0 && (
            <div>
              <h4>Confirmadas por groomer</h4>
              <ul>
                {confirmedBy.map((g) => (
                  <li key={g.name}>
                    {g.name}: {g.confirmedCount}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {entry.issues?.trim() && <p className="co-card__issue">{entry.issues.trim()}</p>}
          {entry.notes?.trim() && <p className="co-card__note">{entry.notes.trim()}</p>}
          <CompanyTrend slug={company.slug} color={color} />
        </div>
      )}

      <div className="co-card__actions">
        <button type="button" className="sf-chip co-card__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Ocultar detalle' : 'Ver detalle'}
        </button>
        <button type="button" className="sf-chip" onClick={copy}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
        <a className="sf-chip" href={whatsappLink(formatSummaryText(entry))} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          WhatsApp
        </a>
        {confirming ? (
          <>
            <button type="button" className="sf-chip sf-chip--danger" onClick={() => deleteSummary(entry)}>
              Sí, borrar
            </button>
            <button type="button" className="sf-chip" onClick={() => setConfirming(false)}>
              No
            </button>
          </>
        ) : (
          <button type="button" className="sf-chip" onClick={() => setConfirming(true)}>
            Borrar
          </button>
        )}
      </div>
    </article>
  );
}

export default function TotalsPage() {
  const { companies } = useCatalog();
  const [dateKey, setDateKey] = useState(todayKey());
  const { items } = useDateSummaries(dateKey);
  const [copied, setCopied] = useState(false);
  const isToday = dateKey === todayKey();
  const label = labelFromDateKey(dateKey);

  const totals = items.reduce(
    (acc, e) => {
      const m = summaryMetrics(e);
      return {
        calls: acc.calls + m.calls,
        messages: acc.messages + m.messages,
        appointments: acc.appointments + m.appointments,
        confirmed: acc.confirmed + m.confirmed,
      };
    },
    { calls: 0, messages: 0, appointments: 0, confirmed: 0 }
  );

  const kpis = [
    { label: 'Llamadas recibidas', value: totals.calls },
    { label: 'Mensajes', value: totals.messages },
    { label: 'Citas nuevas', value: totals.appointments },
    { label: 'Confirmadas para mañana', value: totals.confirmed },
  ];

  const copyAll = async () => {
    await navigator.clipboard.writeText(buildDailyReportText(companies, items, label)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="totals">
      <div className="totals__head">
        <h1 className="totals__title">Resúmenes totales</h1>
        <p className="totals__sub">
          {label}. {items.length} de {companies.length} empresas reportaron.
        </p>
      </div>

      <div className="totals__bar">
        <div className="date-nav">
          <button type="button" className="date-nav__btn" aria-label="Día anterior" onClick={() => setDateKey((k) => shiftDateKey(k, -1))}>
            ‹
          </button>
          <input
            type="date"
            className="date-nav__input"
            value={dateKey}
            max={todayKey()}
            aria-label="Elegir fecha"
            onChange={(e) => e.target.value && setDateKey(e.target.value)}
          />
          <button type="button" className="date-nav__btn" aria-label="Día siguiente" disabled={isToday} onClick={() => setDateKey((k) => shiftDateKey(k, 1))}>
            ›
          </button>
          {!isToday && (
            <button type="button" className="sf-chip" onClick={() => setDateKey(todayKey())}>
              Hoy
            </button>
          )}
        </div>
        <div className="totals__actions">
          <button type="button" className="sf-ghost" onClick={copyAll}>
            {copied ? 'Copiado' : 'Copiar todo como texto'}
          </button>
          <button type="button" className="sf-ghost" onClick={() => printHtml(buildDailyReportHtml(companies, items, label))}>
            Descargar PDF
          </button>
        </div>
      </div>

      <div className="kpis" key={`k-${dateKey}`}>
        {kpis.map((k, i) => (
          <div className="kpi" key={k.label} style={{ '--i': i }}>
            <span className="kpi__value">
              <CountUp value={k.value} />
            </span>
            <span className="kpi__label">{k.label}</span>
          </div>
        ))}
      </div>

      <div className="company-grid" key={`g-${dateKey}`}>
        {companies.map((c, i) => (
          <CompanyCard key={c.slug} company={c} entry={items.find((e) => e.company_slug === c.slug) || null} index={i} />
        ))}
      </div>
    </div>
  );
}
