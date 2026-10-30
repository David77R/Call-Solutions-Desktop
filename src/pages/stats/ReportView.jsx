import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, CloseIcon, CopyIcon } from '../../components/Icons';
import { shortCompanyName } from '../../components/CompanyTabs';
import logo from '../../assets/ccs-logo.webp';
import { dateKeyFromDate } from '../../lib/summaries';
import { addDays, addEntry, bucketKey, daysBetween, emptyTotals, metricValue, parseKey, useSummariesRange } from '../../lib/analytics';
import './Report.css';

const KPIS = [
  { key: 'appointments', label: 'Citas nuevas' },
  { key: 'calls', label: 'Llamadas' },
  { key: 'messages', label: 'Mensajes' },
  { key: 'booking', label: '% de agendamiento', rate: true },
];

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function periodFor(kind, today, offset) {
  if (kind === 'week') {
    const start = addDays(bucketKey(today, 'week'), offset * 7);
    return { from: start, to: addDays(start, 6) };
  }
  const t = parseKey(today);
  const first = new Date(t.getFullYear(), t.getMonth() + offset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return { from: dateKeyFromDate(first), to: dateKeyFromDate(last) };
}

const longDate = (key, withYear = true) => parseKey(key).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) });

function periodTitle(kind, period) {
  if (kind === 'month') {
    const label = parseKey(period.from).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const a = parseKey(period.from);
  const b = parseKey(period.to);
  if (a.getMonth() === b.getMonth()) return `Semana del ${a.getDate()} al ${longDate(period.to)}`;
  return `Semana del ${longDate(period.from, a.getFullYear() !== b.getFullYear())} al ${longDate(period.to)}`;
}

function fmt(value, key) {
  if (value == null) return '—';
  if (key === 'booking') return `${value.toFixed(1)}%`;
  return Math.round(value).toLocaleString('es-VE');
}

function changeOf(now, before, rate) {
  if (now == null || before == null) return null;
  if (rate) return { value: now - before, unit: 'pts' };
  if (!before) return null;
  return { value: ((now - before) / before) * 100, unit: '%' };
}

function changeText(ch) {
  if (!ch) return 'sin comparación';
  const flat = Math.abs(ch.value) < (ch.unit === 'pts' ? 0.05 : 0.5);
  if (flat) return 'igual que el periodo anterior';
  const sign = ch.value > 0 ? '+' : '−';
  return `${sign}${Math.abs(ch.value).toFixed(1)}${ch.unit === 'pts' ? ' pts' : '%'}`;
}

function Change({ ch }) {
  const dir = !ch ? 'flat' : Math.abs(ch.value) < (ch.unit === 'pts' ? 0.05 : 0.5) ? 'flat' : ch.value > 0 ? 'up' : 'down';
  return (
    <span className={`rep-change is-${dir}`}>
      {dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : ''}
      {!ch ? 'Sin comparación' : dir === 'flat' ? 'Sin cambio' : changeText(ch)}
    </span>
  );
}

function DayBars({ days, kind, color }) {
  const width = 680;
  const height = 190;
  const pad = { top: 22, bottom: 26, left: 6, right: 6 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...days.map((d) => d.v || 0));
  const slot = innerW / days.length;
  const barW = Math.max(4, Math.min(56, slot * 0.62));
  const best = days.reduce((b, d) => (d.v != null && (!b || d.v > b.v) ? d : b), null);
  const every = kind === 'week' ? 1 : Math.ceil(days.length / 10);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="rep-bars" role="img" aria-label="Citas nuevas por día" style={color ? { '--bar': color } : undefined}>
      <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} className="rep-bars__base" />
      {days.map((d, i) => {
        const x = pad.left + slot * i + (slot - barW) / 2;
        const h = d.v ? (d.v / max) * innerH : 0;
        const y = pad.top + innerH - h;
        const isBest = best && d.key === best.key;
        const date = parseKey(d.key);
        return (
          <g key={d.key}>
            {d.v == null ? (
              <rect x={x} y={pad.top + innerH - 3} width={barW} height={3} rx="1.5" className="rep-bars__empty" />
            ) : (
              <path d={`M${x},${y + h} L${x},${y + Math.min(4, h)} Q${x},${y} ${x + Math.min(4, barW / 2)},${y} L${x + barW - Math.min(4, barW / 2)},${y} Q${x + barW},${y} ${x + barW},${y + Math.min(4, h)} L${x + barW},${y + h} Z`} className={isBest ? 'rep-bars__bar is-best' : 'rep-bars__bar'} />
            )}
            {(kind === 'week' || isBest) && d.v != null && (
              <text x={x + barW / 2} y={y - 6} className="rep-bars__val">
                {d.v}
              </text>
            )}
            {i % every === 0 && (
              <text x={x + barW / 2} y={height - 8} className="rep-bars__lbl">
                {kind === 'week' ? WEEKDAYS[date.getDay()].slice(0, 3) : date.getDate()}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ReportView({ initialKind = 'week', today, companies, onClose }) {
  const [kind, setKind] = useState(initialKind);
  const [offset, setOffset] = useState(-1);
  const [scope, setScope] = useState('all');
  const [lastCompany, setLastCompany] = useState(null);
  const [copied, setCopied] = useState(false);

  const period = periodFor(kind, today, offset);
  const prev = periodFor(kind, today, offset - 1);
  const ongoing = period.to >= today;
  const { entries, loading } = useSummariesRange(prev.from, period.to);
  const company = companies.find((c) => c.slug === scope) || null;

  const data = useMemo(() => {
    const inScope = entries.filter((e) => scope === 'all' || e.company_slug === scope);
    const cur = inScope.filter((e) => e.date_key >= period.from && e.date_key <= period.to);
    const before = inScope.filter((e) => e.date_key >= prev.from && e.date_key <= prev.to);
    const totalNow = cur.reduce(addEntry, emptyTotals());
    const totalPrev = before.reduce(addEntry, emptyTotals());
    const byDay = new Map();
    cur.forEach((e) => byDay.set(e.date_key, addEntry(byDay.get(e.date_key) || emptyTotals(), e)));
    const span = daysBetween(period.from, period.to) + 1;
    const days = Array.from({ length: span }, (_, i) => {
      const key = addDays(period.from, i);
      return { key, v: byDay.has(key) ? byDay.get(key).appointments : null, totals: byDay.get(key) || null };
    });
    const rows = companies
      .filter((c) => scope === 'all' || c.slug === scope)
      .map((c) => {
        const now = cur.filter((e) => e.company_slug === c.slug).reduce(addEntry, emptyTotals());
        const was = before.filter((e) => e.company_slug === c.slug).reduce(addEntry, emptyTotals());
        return { ...c, now, was, ch: was.entries ? changeOf(now.appointments, was.appointments, false) : null };
      })
      .sort((a, b) => b.now.appointments - a.now.appointments);
    const lastDay = ongoing ? today : period.to;
    const possible = (daysBetween(period.from, lastDay) + 1) * (scope === 'all' ? companies.length : 1);
    return { cur, before, totalNow, totalPrev, days, rows, possible, hasPrev: before.length > 0 };
  }, [entries, scope, period.from, period.to, prev.from, prev.to, companies, ongoing, today]);

  const best = data.days.reduce((b, d) => (d.v != null && (!b || d.v > b.v) ? d : b), null);
  const movers = data.rows.filter((r) => r.ch).sort((a, b) => b.ch.value - a.ch.value);
  const top = movers[0];
  const bottom = movers.length > 1 ? movers[movers.length - 1] : null;
  const unit = kind === 'week' ? 'la semana anterior' : 'el mes anterior';
  const apptNow = data.totalNow.appointments;
  const apptCh = data.hasPrev ? changeOf(apptNow, data.totalPrev.appointments, false) : null;
  const bookNow = metricValue(data.totalNow, 'booking');
  const bookCh = data.hasPrev ? changeOf(bookNow, metricValue(data.totalPrev, 'booking'), true) : null;

  const points = [];
  if (data.cur.length) {
    points.push(
      `Se agendaron ${fmt(apptNow)} citas nuevas${apptCh ? ` (${changeText(apptCh)} frente a ${unit}, que tuvo ${fmt(data.totalPrev.appointments)})` : ''}.`
    );
    if (bookNow != null) points.push(`El % de agendamiento fue ${fmt(bookNow, 'booking')}${bookCh ? ` (${changeText(bookCh)} frente a ${unit})` : ''}.`);
    if (best) points.push(`El mejor día fue el ${WEEKDAYS[parseKey(best.key).getDay()]} ${longDate(best.key, false)}, con ${best.v} citas nuevas.`);
    if (scope === 'all' && top && top.ch.value > 0) points.push(`${shortCompanyName(top.name)} fue la empresa que más creció (${changeText(top.ch)}).`);
    if (scope === 'all' && bottom && bottom.ch.value < 0) points.push(`${shortCompanyName(bottom.name)} fue la que más bajó (${changeText(bottom.ch)}).`);
    if (data.cur.length < data.possible) points.push(scope === 'all' ? `Faltan ${data.possible - data.cur.length} resúmenes del día por guardar en este periodo; esos días no cuentan como cero.` : (data.possible - data.cur.length === 1 ? 'Hay 1 día sin registro en este periodo; ese día no cuenta como cero.' : `Hay ${data.possible - data.cur.length} días sin registro en este periodo; esos días no cuentan como cero.`));
  }

  const title = kind === 'week' ? 'Reporte semanal de citas' : 'Reporte mensual de citas';
  const scopeLabel = company ? company.name : 'Todas las empresas';

  const pickCompany = (slug) => {
    setScope(slug);
    setLastCompany(slug);
  };

  const printPdf = () => {
    const previous = document.title;
    const who = company ? shortCompanyName(company.name) : 'CC+CS';
    document.title = `${who} - ${kind === 'week' ? 'Reporte semanal' : 'Reporte mensual'} - ${periodTitle(kind, period).replace(/^Semana del /, '')}`;
    window.print();
    setTimeout(() => {
      document.title = previous;
    }, 800);
  };

  const copySummary = async () => {
    const lines = [
      company ? `*${company.name}*` : `*${title}*`,
      company ? `${title} · ${periodTitle(kind, period)}${ongoing ? ' (en curso)' : ''}` : `${periodTitle(kind, period)}${ongoing ? ' (en curso)' : ''} · ${scopeLabel}`,
      '',
      ...KPIS.map((k) => {
        const now = metricValue(data.totalNow, k.key);
        const ch = data.hasPrev ? changeOf(now, metricValue(data.totalPrev, k.key), k.rate) : null;
        return `• ${k.label}: ${fmt(now, k.key)}${ch ? ` (${changeText(ch)})` : ''}`;
      }),
      '',
      ...points.map((p) => `- ${p}`),
    ];
    if (scope === 'all' && data.rows.length) {
      lines.push('', '*Por empresa*', ...data.rows.map((r) => `• ${shortCompanyName(r.name)}: ${r.now.appointments} citas${r.ch ? ` (${changeText(r.ch)})` : ''}`));
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('has-report');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('has-report');
    };
  }, [onClose]);

  return createPortal(
    <div className="report-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="report-toolbar">
        <div className="report-toolbar__group" role="group" aria-label="Tipo de reporte">
          {[
            ['week', 'Semanal'],
            ['month', 'Mensual'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setOffset(-1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="report-toolbar__nav">
          <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Periodo anterior">
            ‹
          </button>
          <span>
            {periodTitle(kind, period)}
            {ongoing && <em> · en curso</em>}
          </span>
          <button type="button" onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={offset >= 0} aria-label="Periodo siguiente">
            ›
          </button>
        </div>
        <div className="report-toolbar__group" role="group" aria-label="Alcance del reporte">
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
            Reporte total
          </button>
          <button type="button" aria-pressed={scope !== 'all'} onClick={() => companies.length && pickCompany(lastCompany || companies[0].slug)}>
            Por empresa
          </button>
        </div>
        <div className="report-toolbar__actions">
          <button type="button" className={copied ? 'report-btn is-done' : 'report-btn'} onClick={copySummary} disabled={!data.cur.length}>
            {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
            {copied ? 'Copiado' : 'Copiar resumen'}
          </button>
          <button type="button" className="report-btn report-btn--main" onClick={printPdf} disabled={!data.cur.length}>
            Descargar PDF
          </button>
          <button type="button" className="report-close" onClick={onClose} aria-label="Cerrar reporte">
            <CloseIcon size={20} />
          </button>
        </div>
        {scope !== 'all' && (
          <div className="report-toolbar__companies" role="group" aria-label="Empresa del reporte">
            {companies.map((c) => (
              <button key={c.slug} type="button" aria-pressed={scope === c.slug} style={{ '--co': c.color_primary }} onClick={() => pickCompany(c.slug)}>
                <i aria-hidden="true" />
                {shortCompanyName(c.name)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="report-scroll">
        <article className={loading ? 'report-sheet is-loading' : 'report-sheet'} style={company ? { '--accent': company.color_primary } : undefined}>
          {company ? (
            <header className="rep-head rep-head--company" style={{ '--co': company.color_primary }}>
              <div className="rep-head__text">
                <span className="rep-head__kicker">{title}</span>
                <h1>{company.name}</h1>
                <p>
                  {periodTitle(kind, period)}
                  {ongoing ? ' (en curso)' : ''}
                </p>
              </div>
              <div className="rep-head__by">
                <img src={logo} alt="" className="rep-head__logo rep-head__logo--sm" />
                <span>
                  Preparado por
                  <strong>CC+CS Solutions</strong>
                  {new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </header>
          ) : (
            <header className="rep-head">
              <img src={logo} alt="CC+CS Solutions" className="rep-head__logo" />
              <div className="rep-head__text">
                <h1>{title}</h1>
                <p>
                  {periodTitle(kind, period)}
                  {ongoing ? ' (en curso)' : ''}
                </p>
                <p className="rep-head__scope">Todas las empresas</p>
              </div>
              <p className="rep-head__date">Generado el {new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </header>
          )}

          {!data.cur.length ? (
            <p className="rep-empty">{loading ? 'Cargando resúmenes…' : 'No hay resúmenes del día guardados en este periodo.'}</p>
          ) : (
            <>
              <section className="rep-kpis">
                {KPIS.map((k) => {
                  const now = metricValue(data.totalNow, k.key);
                  const ch = data.hasPrev ? changeOf(now, metricValue(data.totalPrev, k.key), k.rate) : null;
                  return (
                    <div key={k.key} className="rep-kpi">
                      <span className="rep-kpi__label">{k.label}</span>
                      <strong className="rep-kpi__value">{fmt(now, k.key)}</strong>
                      <Change ch={ch} />
                    </div>
                  );
                })}
              </section>

              <section className="rep-block">
                <h2>Puntos clave</h2>
                <ul className="rep-points">
                  {points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>

              <section className="rep-block">
                <h2>Citas nuevas por día</h2>
                <DayBars days={data.days} kind={kind} color={company ? company.color_primary : null} />
              </section>

              <section className="rep-block">
                <h2>{scope === 'all' ? 'Resultados por empresa' : 'Detalle por día'}</h2>
                {scope === 'all' ? (
                  <table className="rep-table">
                    <thead>
                      <tr>
                        <th>Empresa</th>
                        <th className="num">Citas nuevas</th>
                        <th className="num">Cambio</th>
                        <th className="num">Llamadas</th>
                        <th className="num">Mensajes</th>
                        <th className="num">% agend.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => (
                        <tr key={r.slug}>
                          <td>
                            <span className="rep-co" style={{ '--co': r.color_primary }}>
                              <i aria-hidden="true" />
                              {r.name}
                            </span>
                          </td>
                          <td className="num strong">{r.now.appointments}</td>
                          <td className="num">
                            <Change ch={r.ch} />
                          </td>
                          <td className="num">{r.now.calls}</td>
                          <td className="num">{r.now.messages}</td>
                          <td className="num">{fmt(metricValue(r.now, 'booking'), 'booking')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="rep-table">
                    <thead>
                      <tr>
                        <th>Día</th>
                        <th className="num">Citas nuevas</th>
                        <th className="num">Llamadas</th>
                        <th className="num">Mensajes</th>
                        <th className="num">% agend.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.days.map((d) => (
                        <tr key={d.key} className={d.totals ? '' : 'is-missing'}>
                          <td>{parseKey(d.key).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
                          <td className="num strong">{d.totals ? d.totals.appointments : '—'}</td>
                          <td className="num">{d.totals ? d.totals.calls : '—'}</td>
                          <td className="num">{d.totals ? d.totals.messages : '—'}</td>
                          <td className="num">{d.totals ? fmt(metricValue(d.totals, 'booking'), 'booking') : 'Sin registro'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <footer className="rep-foot">
                {company
                  ? `Datos de ${data.cur.length} de ${data.possible} días con registro del call center de CC+CS Solutions. El % de agendamiento es citas nuevas entre mensajes más citas. Los días sin registro no cuentan como cero.`
                  : `Calculado con ${data.cur.length} de ${data.possible} resúmenes del día guardados en CC+CS. El % de agendamiento es citas nuevas entre mensajes más citas. Los días sin resumen no cuentan como cero.`}
              </footer>
            </>
          )}
        </article>
      </div>
    </div>,
    document.body
  );
}
