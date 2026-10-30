import { CountUp } from '../../components/Charts';
import { addEntry, bucketKey, emptyTotals, formatMetric, metricValue, parseKey } from '../../lib/analytics';
import { AreaHero, Sparkline } from './charts';

const UP = '#7ee2b0';
const DOWN = '#ff9d90';
const FLAT = '#9aa6d6';
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEKDAYS_LONG = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

const KPI_ICONS = {
  appointments: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <path d="M16 2.5v4M8 2.5v4M3 10h18M9 15.5l2 2 4-4" />
    </>
  ),
  calls: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />,
  messages: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  booking: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
};

const KPIS = [
  { key: 'appointments', label: 'Citas nuevas' },
  { key: 'calls', label: 'Llamadas' },
  { key: 'messages', label: 'Mensajes' },
  { key: 'booking', label: '% de agendamiento', rate: true },
];

function change(now, before, rate) {
  if (now == null || before == null) return null;
  if (rate) return { value: now - before, unit: 'pts' };
  if (!before) return null;
  return { value: ((now - before) / before) * 100, unit: '%' };
}

function direction(ch) {
  if (!ch) return 'flat';
  const limit = ch.unit === 'pts' ? 0.05 : 0.5;
  return Math.abs(ch.value) < limit ? 'flat' : ch.value > 0 ? 'up' : 'down';
}

function ChangePill({ ch, compact = false }) {
  const dir = direction(ch);
  if (!ch) return <span className="ov-pill is-flat">{compact ? '—' : 'Sin comparación'}</span>;
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•';
  const text = ch.unit === 'pts' ? `${Math.abs(ch.value).toFixed(1)} pts` : `${Math.abs(ch.value).toFixed(1)}%`;
  return (
    <span className={`ov-pill is-${dir}`}>
      <span aria-hidden="true">{arrow}</span> {dir === 'down' ? '−' : dir === 'up' ? '+' : ''}
      {text}
    </span>
  );
}

function Avatar({ name, color }) {
  return (
    <span className="ov-avatar" style={{ '--co': color }} aria-hidden="true">
      {name.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase()}
    </span>
  );
}

function totalsBy(entries, keyOf) {
  const map = new Map();
  entries.forEach((e) => {
    const k = keyOf(e);
    map.set(k, addEntry(map.get(k) || emptyTotals(), e));
  });
  return map;
}

export default function Overview({ buckets, grain, scoped, scopedPrev, series, metric, metricLabel, onMetric, onPick, today, rangeTo }) {
  const isRate = metric === 'booking';
  const byBucket = totalsBy(scoped, (e) => bucketKey(e.date_key, grain));
  const byCompanyBucket = totalsBy(scoped, (e) => `${bucketKey(e.date_key, grain)}|${e.company_slug}`);
  const byCompany = totalsBy(scoped, (e) => e.company_slug);
  const byCompanyPrev = totalsBy(scopedPrev, (e) => e.company_slug);
  const totalNow = scoped.reduce(addEntry, emptyTotals());
  const totalPrev = scopedPrev.reduce(addEntry, emptyTotals());
  const hasPrev = scopedPrev.length > 0;

  const seriesFor = (key) => buckets.map((b) => (byBucket.has(b.key) ? metricValue(byBucket.get(b.key), key) : null));
  const heroValues = seriesFor(metric);
  const heroNow = metricValue(totalNow, metric);
  const heroPrev = hasPrev ? metricValue(totalPrev, metric) : null;
  const heroChange = change(heroNow, heroPrev, isRate);
  const heroDiff = heroNow != null && heroPrev != null ? heroNow - heroPrev : null;

  const byDay = totalsBy(scoped, (e) => e.date_key);
  const days = [...byDay.entries()].map(([key, t]) => ({ key, v: metricValue(t, metric) })).filter((d) => d.v != null);
  const avgDaily = days.length ? days.reduce((s, d) => s + d.v, 0) / days.length : null;
  const best = days.reduce((b, d) => (!b || d.v > b.v ? d : b), null);
  const t = parseKey(today);
  const monthDays = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const monthName = t.toLocaleDateString('es-VE', { month: 'long' });
  const projection = !isRate && avgDaily != null && rangeTo === today ? Math.round(avgDaily * monthDays) : null;

  const byWeekday = totalsBy(scoped, (e) => parseKey(e.date_key).getDay());
  const weekdayDates = new Map();
  byDay.forEach((_, key) => {
    const wd = parseKey(key).getDay();
    weekdayDates.set(wd, (weekdayDates.get(wd) || 0) + 1);
  });
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map((wd) => {
    const totals = byWeekday.get(wd);
    const raw = totals ? metricValue(totals, metric) : null;
    const v = raw == null ? null : isRate ? raw : raw / (weekdayDates.get(wd) || 1);
    return { wd, v };
  });
  const weekdayMax = Math.max(...weekdays.map((w) => w.v || 0), 0);
  const strongest = weekdays.reduce((b, w) => (w.v != null && (!b || w.v > b.v) ? w : b), null);

  const companies = series
    .map((s) => {
      const now = byCompany.has(s.slug) ? metricValue(byCompany.get(s.slug), metric) : isRate ? null : 0;
      const before = byCompanyPrev.has(s.slug) ? metricValue(byCompanyPrev.get(s.slug), metric) : null;
      const totals = byCompany.get(s.slug) || emptyTotals();
      return {
        ...s,
        now,
        ch: change(now, before, isRate),
        totals,
        spark: buckets.map((b) => {
          const tt = byCompanyBucket.get(`${b.key}|${s.slug}`);
          return tt ? metricValue(tt, metric) : null;
        }),
      };
    })
    .sort((a, b) => (b.now ?? -1) - (a.now ?? -1));
  const movers = [...companies].filter((c) => c.ch).sort((a, b) => b.ch.value - a.ch.value);
  const heroColor = 'var(--moon)';

  return (
    <div className="ov">
      <div className="ov-kpis">
        {KPIS.map((k, i) => {
          const now = metricValue(totalNow, k.key);
          const before = hasPrev ? metricValue(totalPrev, k.key) : null;
          const ch = change(now, before, k.rate);
          const dir = direction(ch);
          return (
            <button key={k.key} type="button" className={metric === k.key ? 'ov-kpi is-active' : 'ov-kpi'} style={{ '--i': i }} onClick={() => onMetric(k.key)} aria-pressed={metric === k.key}>
              <span className="ov-kpi__top">
                <span className="ov-kpi__icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    {KPI_ICONS[k.key]}
                  </svg>
                </span>
                <span className="ov-kpi__label">{k.label}</span>
              </span>
              <span className="ov-kpi__mid">
                <span className="ov-kpi__value">{k.rate ? (now == null ? '—' : `${now.toFixed(1)}%`) : <CountUp value={now || 0} />}</span>
                <Sparkline values={seriesFor(k.key)} color={dir === 'down' ? DOWN : dir === 'up' ? UP : FLAT} width={84} height={30} />
              </span>
              <ChangePill ch={ch} />
            </button>
          );
        })}
      </div>

      <div className="ov-main">
        <section className="ov-card ov-hero">
          <header className="ov-hero__head">
            <div>
              <span className="ov-hero__title">
                <span className="ov-kpi__icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    {KPI_ICONS[metric] || KPI_ICONS.appointments}
                  </svg>
                </span>
                {metricLabel}
              </span>
              <div className="ov-hero__figure">
                <strong>{formatMetric(heroNow, metric)}</strong>
                <ChangePill ch={heroChange} />
                {heroDiff != null && !isRate && (
                  <span className="ov-hero__diff">
                    {heroDiff >= 0 ? '+' : '−'}
                    {Math.abs(Math.round(heroDiff)).toLocaleString('es-VE')} vs periodo anterior
                  </span>
                )}
              </div>
            </div>
          </header>
          <AreaHero buckets={buckets} values={heroValues} metric={metric} color={heroColor} onPick={onPick} />
        </section>

        <div className="ov-side">
          <section className="ov-card ov-pace">
            <h3>Ritmo del periodo</h3>
            <dl>
              <div>
                <dt>{isRate ? 'Promedio diario' : 'Promedio por día'}</dt>
                <dd>{avgDaily == null ? '—' : isRate ? `${avgDaily.toFixed(1)}%` : avgDaily.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Mejor día</dt>
                <dd>
                  {best ? (
                    <>
                      {formatMetric(best.v, metric)}
                      <small>{parseKey(best.key).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}</small>
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
            {projection != null && (
              <p className="ov-pace__proj">
                A este ritmo, {monthName} cerraría con <strong>~{projection.toLocaleString('es-VE')}</strong> {metricLabel.toLowerCase()}.
              </p>
            )}
            <div className="ov-week" role="img" aria-label={strongest ? `Los ${WEEKDAYS_LONG[strongest.wd]} son el día más fuerte` : 'Sin datos por día de la semana'}>
              {weekdays.map((w) => (
                <span key={w.wd} className={strongest && w.wd === strongest.wd ? 'ov-week__col is-best' : 'ov-week__col'} title={w.v == null ? 'Sin datos' : formatMetric(w.v, metric)}>
                  <span className="ov-week__bar" style={{ '--h': weekdayMax ? `${Math.max(6, ((w.v || 0) / weekdayMax) * 100)}%` : '6%' }} />
                  <span className="ov-week__lbl">{WEEKDAYS[w.wd]}</span>
                </span>
              ))}
            </div>
            {strongest && <p className="ov-pace__hint">Los {WEEKDAYS_LONG[strongest.wd]} son el día más fuerte{isRate ? '' : ' en promedio'}.</p>}
          </section>

          <section className="ov-card ov-movers">
            <h3>Empresas en movimiento</h3>
            {movers.length ? (
              <ul>
                {movers.map((c, i) => (
                  <li key={c.slug} style={{ '--i': i }}>
                    <button type="button" onClick={() => onPick({ slug: c.slug })}>
                      <Avatar name={c.short} color={c.color} />
                      <span className="ov-movers__name">{c.short}</span>
                      <span className="ov-movers__val">
                        <strong>{formatMetric(c.now, metric)}</strong>
                        <ChangePill ch={c.ch} compact />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ov-empty">Hace falta un periodo anterior con datos para comparar.</p>
            )}
          </section>
        </div>
      </div>

      <section className="ov-card ov-table">
        <header className="ov-table__head">
          <h3>Rendimiento por empresa</h3>
          <span>Toca una empresa para ver sus registros</span>
        </header>
        <div className="ov-table__scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Empresa</th>
                <th scope="col" className="num">
                  {metricLabel}
                </th>
                <th scope="col" className="num">
                  Cambio
                </th>
                <th scope="col" className="num">
                  Llamadas
                </th>
                <th scope="col" className="num">
                  Mensajes
                </th>
                <th scope="col" className="num">
                  % agend.
                </th>
                <th scope="col">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => {
                const dir = direction(c.ch);
                const booking = metricValue(c.totals, 'booking');
                return (
                  <tr key={c.slug} style={{ '--i': i }} tabIndex={0} onClick={() => onPick({ slug: c.slug })} onKeyDown={(e) => e.key === 'Enter' && onPick({ slug: c.slug })}>
                    <td>
                      <span className="ov-table__co">
                        <Avatar name={c.short} color={c.color} />
                        <span>
                          <strong>{c.short}</strong>
                          <small>{c.name}</small>
                        </span>
                      </span>
                    </td>
                    <td className="num strong">{formatMetric(c.now, metric)}</td>
                    <td className="num">
                      <ChangePill ch={c.ch} compact />
                    </td>
                    <td className="num">{c.totals.calls.toLocaleString('es-VE')}</td>
                    <td className="num">{c.totals.messages.toLocaleString('es-VE')}</td>
                    <td className="num">{booking == null ? '—' : `${booking.toFixed(1)}%`}</td>
                    <td>
                      <Sparkline values={c.spark} color={dir === 'down' ? DOWN : dir === 'up' ? UP : FLAT} width={110} height={30} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
