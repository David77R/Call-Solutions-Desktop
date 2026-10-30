import { useMemo, useRef, useState } from 'react';
import { DonutChart, Heatmap, HBars, Lines, SmallMultiples, StackedColumns } from './charts';
import Overview from './Overview';
import ReportView from './ReportView';
import { shortCompanyName } from '../../components/CompanyTabs';
import { useCatalog } from '../../lib/useCatalog';
import { summaryMetrics, todayKey } from '../../lib/summaries';
import {
  GRAINS,
  METRICS,
  addDays,
  addEntry,
  bucketKey,
  bucketLabel,
  bucketRange,
  daysBetween,
  downloadFile,
  emptyTotals,
  listBuckets,
  metricValue,
  parseKey,
  presetRange,
  toCsv,
  useSummariesRange,
} from '../../lib/analytics';
import '../summary/Summary.css';
import './Stats.css';

const PRESETS = [
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: 'month', label: 'Este mes' },
  { key: 'lastMonth', label: 'Mes pasado' },
  { key: '90d', label: '3 meses' },
  { key: 'year', label: 'Este año' },
  { key: 'custom', label: 'Personalizado' },
];

const EVO_TYPES = [
  { key: 'columns', label: 'Columnas' },
  { key: 'lines', label: 'Líneas' },
  { key: 'multiples', label: 'Por empresa' },
];

const SHARE_TYPES = [
  { key: 'donut', label: 'Torta' },
  { key: 'bars', label: 'Barras' },
];

function autoGrain(from, to) {
  const days = daysBetween(from, to) + 1;
  if (days > 180) return 'month';
  if (days > 45) return 'week';
  return 'day';
}

function Seg({ options, value, onChange, label, disabledKeys = [] }) {
  return (
    <div className="seg-pills" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.key} type="button" aria-pressed={value === o.key} disabled={disabledKeys.includes(o.key)} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const { companies } = useCatalog();
  const today = todayKey();
  const [preset, setPreset] = useState('30d');
  const [custom, setCustom] = useState({ from: addDays(today, -29), to: today });
  const [grainChoice, setGrainChoice] = useState('auto');
  const [metric, setMetric] = useState('appointments');
  const [hidden, setHidden] = useState(() => new Set());
  const [evoType, setEvoType] = useState('columns');
  const [shareType, setShareType] = useState('donut');
  const [selection, setSelection] = useState(null);
  const [sort, setSort] = useState({ key: 'date_key', dir: 'desc' });
  const tableRef = useRef(null);
  const [report, setReport] = useState(null);

  const range = preset === 'custom' ? custom : presetRange(preset, today);
  const span = daysBetween(range.from, range.to) + 1;
  const prevRange = { from: addDays(range.from, -span), to: addDays(range.from, -1) };
  const grain = grainChoice === 'auto' ? autoGrain(range.from, range.to) : grainChoice;
  const { entries, loading, error } = useSummariesRange(prevRange.from, range.to);

  const series = companies
    .filter((c) => !hidden.has(c.slug))
    .map((c) => ({ slug: c.slug, name: c.name, short: shortCompanyName(c.name), color: c.color_primary }));
  const activeSlugs = new Set(series.map((s) => s.slug));
  const metricMeta = METRICS.find((m) => m.key === metric);
  const isRate = metric === 'booking';
  const effectiveEvo = isRate && evoType === 'columns' ? 'lines' : evoType;

  const current = useMemo(() => entries.filter((e) => e.date_key >= range.from && e.date_key <= range.to), [entries, range.from, range.to]);
  const previous = useMemo(() => entries.filter((e) => e.date_key >= prevRange.from && e.date_key <= prevRange.to), [entries, prevRange.from, prevRange.to]);
  const scoped = current.filter((e) => activeSlugs.has(e.company_slug));
  const scopedPrev = previous.filter((e) => activeSlugs.has(e.company_slug));

  const buckets = listBuckets(range.from, range.to, grain).map((key) => ({ key, label: bucketLabel(key, grain) }));
  const cube = new Map();
  scoped.forEach((e) => {
    const b = bucketKey(e.date_key, grain);
    const id = `${b}|${e.company_slug}`;
    cube.set(id, addEntry(cube.get(id) || emptyTotals(), e));
  });
  const value = (b, slug) => {
    const t = cube.get(`${b}|${slug}`);
    return t ? metricValue(t, metric) : null;
  };

  const heatGrain = grain === 'day' && buckets.length > 14 ? 'week' : grain;
  const heatBuckets = listBuckets(range.from, range.to, heatGrain).map((key) => ({ key, label: bucketLabel(key, heatGrain) }));
  const heatCube = new Map();
  scoped.forEach((e) => {
    const id = `${bucketKey(e.date_key, heatGrain)}|${e.company_slug}`;
    heatCube.set(id, addEntry(heatCube.get(id) || emptyTotals(), e));
  });
  const heatValue = (b, slug) => {
    const t = heatCube.get(`${b}|${slug}`);
    return t ? metricValue(t, 'booking') : null;
  };

  const companyTotals = new Map();
  scoped.forEach((e) => companyTotals.set(e.company_slug, addEntry(companyTotals.get(e.company_slug) || emptyTotals(), e)));
  const shareItems = series
    .map((se) => ({ ...se, value: companyTotals.has(se.slug) ? metricValue(companyTotals.get(se.slug), metric) : isRate ? null : 0 }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));


  const possible = series.length * span;
  const coverage = possible ? Math.round((scoped.length / possible) * 100) : 0;

  const pick = (sel) => {
    setSelection(sel);
    requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const auditRows = scoped
    .filter((e) => {
      if (!selection) return true;
      if (selection.slug && e.company_slug !== selection.slug) return false;
      if (selection.bucket) {
        const g = selection.grain || grain;
        const [a, b] = bucketRange(selection.bucket, g);
        if (e.date_key < a || e.date_key > b) return false;
      }
      return true;
    })
    .map((e) => ({ e, m: summaryMetrics(e) }))
    .sort((x, y) => {
      const get = (r) => (sort.key === 'date_key' ? r.e.date_key : sort.key === 'company' ? r.e.company_name : sort.key === 'author' ? r.e.author_name || '' : r.m[sort.key]);
      const a = get(x);
      const b = get(y);
      const cmp = a < b ? -1 : a > b ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });

  const selectionLabel = selection
    ? [selection.slug ? series.find((s) => s.slug === selection.slug)?.name : null, selection.bucket ? bucketLabel(selection.bucket, selection.grain || grain) : null].filter(Boolean).join(', ')
    : null;

  const exportCsv = () => {
    const header = ['Fecha', 'Empresa', 'Autor', 'Llamadas', 'Mensajes', 'Citas nuevas', 'Realizadas', '% agendamiento', 'Editado por', 'Editado el', 'ID del registro'];
    const rows = auditRows.map(({ e, m }) => [e.date_key, e.company_name, e.author_name || '', m.calls, m.messages, m.appointments, m.completed, m.bookingPct, e.edited_by || '', e.edited_at || '', e.id]);
    downloadFile(`estadisticas-citas_${range.from}_a_${range.to}.csv`, toCsv([header, ...rows]));
  };

  const header = (key, label) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}>
        {label}
        <span className="sort-arrow" aria-hidden="true">
          {sort.key === key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  );

  return (
    <div className={loading ? 'stats is-loading' : 'stats'}>
      <div className="stats__head">
        <div>
          <h1 className="stats__title">Estadísticas de citas</h1>
          <p className="stats__sub">
            Del {parseKey(range.from).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })} al{' '}
            {parseKey(range.to).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}. Calculado con {scoped.length}{' '}
            {scoped.length === 1 ? 'resumen diario guardado' : 'resúmenes diarios guardados'} ({coverage}% de cobertura).
          </p>
        </div>
        <div className="stats__reports">
          <button type="button" className="stats__report-btn" onClick={() => setReport('week')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M8 13h8M8 17h5" />
            </svg>
            Reporte semanal
          </button>
          <button type="button" className="stats__report-btn" onClick={() => setReport('month')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
              <path d="M16 2.5v4M8 2.5v4M3 10h18" />
            </svg>
            Reporte mensual
          </button>
        </div>
      </div>
      {report && <ReportView initialKind={report} today={today} companies={companies} onClose={() => setReport(null)} />}

      <div className="filters">
        <Seg label="Periodo" options={PRESETS} value={preset} onChange={setPreset} />
        {preset === 'custom' && (
          <div className="filters__custom">
            <input type="date" className="date-nav__input" value={custom.from} max={custom.to} aria-label="Desde" onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} />
            <span>a</span>
            <input type="date" className="date-nav__input" value={custom.to} min={custom.from} max={today} aria-label="Hasta" onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} />
          </div>
        )}
        <div className="filters__row">
          <label className="filters__select">
            <span>Métrica</span>
            <select value={metric} onChange={(e) => setMetric(e.target.value)}>
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filters__select">
            <span>Agrupar por</span>
            <select value={grainChoice} onChange={(e) => setGrainChoice(e.target.value)}>
              <option value="auto">Automático ({GRAINS.find((g) => g.key === autoGrain(range.from, range.to)).label.toLowerCase()})</option>
              {GRAINS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <div className="filters__companies" role="group" aria-label="Empresas incluidas">
            {companies.map((c) => {
              const on = !hidden.has(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={on}
                  style={{ '--co': c.color_primary }}
                  onClick={() =>
                    setHidden((h) => {
                      const next = new Set(h);
                      if (next.has(c.slug)) next.delete(c.slug);
                      else if (companies.length - next.size > 1) next.add(c.slug);
                      return next;
                    })
                  }
                >
                  <i aria-hidden="true" />
                  {shortCompanyName(c.name)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <p className="co-card__issue">No se pudieron leer los resúmenes ({error}).</p>}

      <Overview
        buckets={buckets}
        grain={grain}
        scoped={scoped}
        scopedPrev={scopedPrev}
        series={series}
        metric={metric}
        metricLabel={metricMeta.label}
        onMetric={setMetric}
        onPick={(sel) => pick({ ...sel, grain })}
        today={today}
        rangeTo={range.to}
      />

      <section className="viz-card">
        <header className="viz-card__head">
          <div>
            <h2>
              Comparar empresas: {metricMeta.label.toLowerCase()} por {GRAINS.find((g) => g.key === grain).label.toLowerCase()}
            </h2>
            <p>{isRate ? 'Citas nuevas entre mensajes más citas, por empresa.' : 'Suma de lo reportado en el Resumen del día. Toca una barra o un punto para auditar sus registros.'}</p>
          </div>
          <Seg label="Tipo de gráfica" options={EVO_TYPES} value={effectiveEvo} onChange={setEvoType} disabledKeys={isRate ? ['columns'] : []} />
        </header>
        <div className="viz-legend">
          {series.map((s) => (
            <span key={s.slug}>
              <i style={{ background: s.color }} aria-hidden="true" />
              {s.short}
            </span>
          ))}
        </div>
        <div className="viz-card__body" key={`${effectiveEvo}-${metric}-${grain}-${range.from}-${range.to}-${series.length}`}>
          {effectiveEvo === 'columns' && <StackedColumns buckets={buckets} series={series} value={value} metric={metric} onPick={(s) => pick({ ...s, grain })} />}
          {effectiveEvo === 'lines' && <Lines buckets={buckets} series={series} value={value} metric={metric} onPick={(s) => pick({ ...s, grain })} />}
          {effectiveEvo === 'multiples' && (
            <SmallMultiples
              buckets={buckets}
              series={series}
              value={value}
              metric={metric}
              onPick={(s) => pick({ ...s, grain })}
              totalFor={(slug) => (companyTotals.has(slug) ? metricValue(companyTotals.get(slug), metric) : null)}
            />
          )}
        </div>
      </section>

      <div className="viz-grid">
        <section className="viz-card">
          <header className="viz-card__head">
            <div>
              <h2>{isRate ? '% de agendamiento por empresa' : `Reparto de ${metricMeta.label.toLowerCase()}`}</h2>
              <p>{isRate ? 'Comparación del periodo completo.' : 'Qué parte del total aporta cada empresa.'}</p>
            </div>
            <Seg label="Forma" options={SHARE_TYPES} value={isRate ? 'bars' : shareType} onChange={setShareType} disabledKeys={isRate ? ['donut'] : []} />
          </header>
          <div className="viz-card__body" key={`${shareType}-${metric}-${range.from}-${range.to}-${series.length}`}>
            {!isRate && shareType === 'donut' ? (
              <DonutChart items={shareItems.filter((i) => i.value > 0)} metric={metric} onPick={pick} />
            ) : (
              <HBars items={shareItems} metric={metric} onPick={pick} />
            )}
          </div>
        </section>

        <section className="viz-card">
          <header className="viz-card__head">
            <div>
              <h2>% de agendamiento por {GRAINS.find((g) => g.key === heatGrain).label.toLowerCase()}</h2>
              <p>Más claro es mejor. Cada celda se calcula con los resúmenes de esa empresa en ese periodo.</p>
            </div>
          </header>
          <div className="viz-card__body" key={`h-${heatGrain}-${range.from}-${range.to}-${series.length}`}>
            <Heatmap buckets={heatBuckets} series={series} value={heatValue} onPick={(s) => pick({ ...s, grain: heatGrain })} />
          </div>
        </section>
      </div>

      <section className="viz-card audit" ref={tableRef}>
        <header className="viz-card__head">
          <div>
            <h2>Registros auditables</h2>
            <p>
              Cada número de esta pantalla sale de estas filas. {auditRows.length} de {possible} registros posibles ({series.length} empresas por {span} días).
            </p>
          </div>
          <div className="audit__actions">
            {selection && (
              <button type="button" className="audit__chip" onClick={() => setSelection(null)}>
                Mostrando: {selectionLabel}
                <span aria-hidden="true">×</span>
              </button>
            )}
            <button type="button" className="sf-ghost" onClick={exportCsv} disabled={!auditRows.length}>
              Descargar CSV
            </button>
          </div>
        </header>
        <div className="audit__scroll">
          <table className="audit__table">
            <thead>
              <tr>
                {header('date_key', 'Fecha')}
                {header('company', 'Empresa')}
                {header('author', 'Autor')}
                {header('calls', 'Llamadas')}
                {header('messages', 'Mensajes')}
                {header('appointments', 'Citas nuevas')}
                {header('completed', 'Realizadas')}
                {header('bookingPct', '% agend.')}
                <th scope="col">
                  <span className="th-static">Edición</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {auditRows.map(({ e, m }, i) => {
                const co = companies.find((c) => c.slug === e.company_slug);
                return (
                  <tr key={e.id} style={{ '--i': Math.min(i, 20), '--co': co?.color_primary }}>
                    <td>{parseKey(e.date_key).toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td>
                      <span className="audit__co">
                        <i aria-hidden="true" />
                        {co ? shortCompanyName(co.name) : e.company_name}
                      </span>
                    </td>
                    <td>{e.author_name || '—'}</td>
                    <td className="num">{m.calls}</td>
                    <td className="num">{m.messages}</td>
                    <td className="num">{m.appointments}</td>
                    <td className="num">{m.hasGroomers ? m.completed : '—'}</td>
                    <td className="num">{m.messages + m.appointments ? `${m.bookingPct}%` : '—'}</td>
                    <td className="audit__edit">{e.edited_by ? `${e.edited_by}, ${new Date(e.edited_at).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Original'}</td>
                  </tr>
                );
              })}
              {!auditRows.length && (
                <tr>
                  <td colSpan={9} className="audit__empty">
                    {loading ? 'Cargando…' : 'No hay resúmenes guardados para este filtro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="stats__foot">Los días sin resumen guardado no cuentan como cero: se muestran vacíos para no falsear los promedios.</p>
    </div>
  );
}
