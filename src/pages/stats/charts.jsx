import { useLayoutEffect, useRef, useState } from 'react';
import { mix, PANEL } from '../../lib/color';
import { formatMetric } from '../../lib/analytics';

const PAD = { top: 16, right: 96, bottom: 34, left: 48 };

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(800);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const measure = () => setWidth(ref.current.clientWidth || 800);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function niceStep(raw) {
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return Math.max(1, nice * exp);
}

function niceMax(v) {
  if (v <= 0) return 4;
  const step = niceStep(v / 5);
  return Math.ceil(v / step) * step;
}

function ticks(max) {
  const step = niceStep(max / 5);
  const out = [];
  for (let t = 0; t <= max + 1e-9; t += step) out.push(t);
  return out;
}

function topRounded(x, y, w, h, r) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

function labelStep(count, width) {
  const fit = Math.max(1, Math.floor(width / 70));
  return Math.max(1, Math.ceil(count / fit));
}

function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div className="viz-tip" style={{ left: tip.x, top: tip.y }} role="status">
      <span className="viz-tip__title">{tip.title}</span>
      {tip.rows.map((r) => (
        <span key={r.name} className="viz-tip__row">
          <i style={{ background: r.color }} aria-hidden="true" />
          <strong>{r.value}</strong>
          <span>{r.name}</span>
        </span>
      ))}
      {tip.hint && <span className="viz-tip__hint">{tip.hint}</span>}
    </div>
  );
}

function YAxis({ max, innerH, innerW, isRate }) {
  return (
    <g className="viz-axis">
      {ticks(max).map((t) => {
        const y = PAD.top + innerH - (t / max) * innerH;
        return (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y} y2={y} className={t === 0 ? 'viz-axis__base' : 'viz-axis__grid'} />
            <text x={PAD.left - 8} y={y} className="viz-axis__y">
              {isRate ? `${Math.round(t)}%` : Math.round(t).toLocaleString('es-VE')}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function StackedColumns({ buckets, series, value, metric, onPick }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const height = 320;
  const innerW = width - PAD.left - PAD.right + 72;
  const innerH = height - PAD.top - PAD.bottom;
  const totals = buckets.map((b) => series.reduce((s, se) => s + (value(b.key, se.slug) || 0), 0));
  const max = niceMax(Math.max(...totals, 0));
  const slot = innerW / Math.max(1, buckets.length);
  const barW = Math.max(4, Math.min(44, slot * 0.62));
  const step = labelStep(buckets.length, innerW);

  return (
    <div className="viz" ref={ref} onPointerLeave={() => setTip(null)}>
      <svg width={width} height={height} role="img" aria-label="Columnas apiladas por empresa">
        <YAxis max={max} innerH={innerH} innerW={innerW} />
        {buckets.map((b, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          let acc = 0;
          const segs = series.map((se) => ({ se, v: value(b.key, se.slug) || 0 })).filter((s) => s.v > 0);
          return (
            <g key={b.key} className="viz-col" style={{ '--i': i }}>
              {segs.map((s, si) => {
                const h = (s.v / max) * innerH;
                const y = PAD.top + innerH - ((acc + s.v) / max) * innerH;
                acc += s.v;
                const gap = si < segs.length - 1 ? 2 : 0;
                const d = si === segs.length - 1 ? topRounded(x, y, barW, h, 4) : `M${x},${y + gap} h${barW} v${Math.max(0, h - gap)} h${-barW} Z`;
                return (
                  <path
                    key={s.se.slug}
                    d={d}
                    fill={s.se.color}
                    className="viz-seg"
                    tabIndex={0}
                    onPointerMove={(e) =>
                      setTip({
                        x: e.nativeEvent.offsetX,
                        y: e.nativeEvent.offsetY,
                        title: b.label,
                        rows: [{ name: s.se.name, color: s.se.color, value: formatMetric(s.v, metric) }, { name: 'Total del periodo', color: 'transparent', value: formatMetric(totals[i], metric) }],
                        hint: 'Clic para ver los registros',
                      })
                    }
                    onFocus={() => setTip({ x: x + barW, y, title: b.label, rows: [{ name: s.se.name, color: s.se.color, value: formatMetric(s.v, metric) }] })}
                    onClick={() => onPick({ bucket: b.key, slug: s.se.slug })}
                    onKeyDown={(e) => e.key === 'Enter' && onPick({ bucket: b.key, slug: s.se.slug })}
                  />
                );
              })}
              {totals[i] > 0 && buckets.length <= 16 && (
                <text x={x + barW / 2} y={PAD.top + innerH - (totals[i] / max) * innerH - 6} className="viz-total">
                  {formatMetric(totals[i], metric)}
                </text>
              )}
              {i % step === 0 && (
                <text x={x + barW / 2} y={height - 12} className="viz-axis__x">
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

export function Lines({ buckets, series, value, metric, onPick }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const height = 320;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const isRate = metric === 'booking';
  const all = series.flatMap((se) => buckets.map((b) => value(b.key, se.slug)).filter((v) => v != null));
  const max = isRate ? 100 : niceMax(Math.max(...all, 0));
  const xAt = (i) => PAD.left + (buckets.length <= 1 ? innerW / 2 : (i / (buckets.length - 1)) * innerW);
  const yAt = (v) => PAD.top + innerH - (v / max) * innerH;
  const step = labelStep(buckets.length, innerW);

  const paths = series.map((se) => {
    let d = '';
    let pen = false;
    buckets.forEach((b, i) => {
      const v = value(b.key, se.slug);
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)} `;
      pen = true;
    });
    const lastIndex = [...buckets.keys()].reverse().find((i) => value(buckets[i].key, se.slug) != null);
    return { se, d, end: lastIndex != null ? { x: xAt(lastIndex), y: yAt(value(buckets[lastIndex].key, se.slug)) } : null };
  });

  const ends = paths.filter((p) => p.end).sort((a, b) => a.end.y - b.end.y);
  let lastY = -Infinity;
  ends.forEach((p) => {
    p.labelY = Math.max(p.end.y, lastY + 15);
    lastY = p.labelY;
  });

  const onMove = (e) => {
    const x = e.nativeEvent.offsetX;
    const i = buckets.length <= 1 ? 0 : Math.round(((x - PAD.left) / innerW) * (buckets.length - 1));
    setHover(Math.max(0, Math.min(buckets.length - 1, i)));
  };

  const hb = hover != null ? buckets[hover] : null;

  return (
    <div className="viz" ref={ref} onPointerLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label="Líneas por empresa" onPointerMove={onMove} onClick={() => hb && onPick({ bucket: hb.key })}>
        <YAxis max={max} innerH={innerH} innerW={innerW} isRate={isRate} />
        {buckets.map((b, i) =>
          i % step === 0 ? (
            <text key={b.key} x={xAt(i)} y={height - 12} className="viz-axis__x">
              {b.label}
            </text>
          ) : null
        )}
        {hb && <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={PAD.top + innerH} className="viz-cross" />}
        {paths.map((p) => (
          <path key={p.se.slug} d={p.d} stroke={p.se.color} pathLength="1" className="viz-line" />
        ))}
        {hb &&
          series.map((se) => {
            const v = value(hb.key, se.slug);
            return v == null ? null : <circle key={se.slug} cx={xAt(hover)} cy={yAt(v)} r="5" fill={se.color} className="viz-dot" />;
          })}
        {ends.map((p) => (
          <g key={`l-${p.se.slug}`} className="viz-endlabel">
            <circle cx={p.end.x} cy={p.end.y} r="3.5" fill={p.se.color} />
            <text x={PAD.left + innerW + 10} y={p.labelY}>
              {p.se.short}
            </text>
          </g>
        ))}
      </svg>
      {hb && (
        <Tooltip
          tip={{
            x: xAt(hover),
            y: PAD.top + 8,
            title: hb.label,
            rows: series
              .map((se) => ({ name: se.name, color: se.color, raw: value(hb.key, se.slug) }))
              .filter((r) => r.raw != null)
              .sort((a, b) => b.raw - a.raw)
              .map((r) => ({ ...r, value: formatMetric(r.raw, metric) })),
            hint: 'Clic para ver los registros',
          }}
        />
      )}
    </div>
  );
}

export function SmallMultiples({ buckets, series, value, metric, onPick, totalFor }) {
  return (
    <div className="multiples">
      {series.map((se, si) => {
        const vals = buckets.map((b) => value(b.key, se.slug));
        const nums = vals.filter((v) => v != null);
        const max = metric === 'booking' ? 100 : niceMax(Math.max(...nums, 0));
        const w = 240;
        const h = 70;
        const pts = vals.map((v, i) => (v == null ? null : [buckets.length <= 1 ? w / 2 : (i / (buckets.length - 1)) * w, h - (v / max) * h]));
        let d = '';
        let pen = false;
        pts.forEach((p) => {
          if (!p) {
            pen = false;
            return;
          }
          d += `${pen ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)} `;
          pen = true;
        });
        const valid = pts.filter(Boolean);
        const area = valid.length > 1 ? `M${valid[0][0]},${h} ${valid.map((p) => `L${p[0]},${p[1]}`).join(' ')} L${valid[valid.length - 1][0]},${h} Z` : '';
        return (
          <button key={se.slug} type="button" className="multiple" style={{ '--co': se.color, '--i': si }} onClick={() => onPick({ slug: se.slug })}>
            <span className="multiple__head">
              <span className="multiple__name">{se.name}</span>
              <strong className="multiple__total">{formatMetric(totalFor(se.slug), metric)}</strong>
            </span>
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="multiple__svg" aria-hidden="true">
              {area && <path d={area} fill={se.color} opacity="0.18" />}
              <path d={d} stroke={se.color} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" pathLength="1" className="viz-line" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export function DonutChart({ items, metric, onPick }) {
  const [tip, setTip] = useState(null);
  const total = items.reduce((s, i) => s + i.value, 0);
  const size = 300;
  const r = 104;
  const stroke = 38;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (!total) return <p className="viz-empty">No hay datos en este periodo.</p>;

  return (
    <div className="donut-wrap" onPointerLeave={() => setTip(null)}>
      <div className="viz donut-viz">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Reparto por empresa">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {items.map((it, i) => {
              const len = (it.value / total) * c;
              const seg = (
                <circle
                  key={it.slug}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={it.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${Math.max(0, len - 3)} ${c}`}
                  strokeDashoffset={-offset}
                  className="donut-seg"
                  style={{ '--i': i }}
                  tabIndex={0}
                  onPointerMove={(e) =>
                    setTip({
                      x: e.nativeEvent.offsetX,
                      y: e.nativeEvent.offsetY,
                      title: it.name,
                      rows: [{ name: `${((it.value / total) * 100).toFixed(1)}% del total`, color: it.color, value: formatMetric(it.value, metric) }],
                      hint: 'Clic para ver los registros',
                    })
                  }
                  onClick={() => onPick({ slug: it.slug })}
                  onKeyDown={(e) => e.key === 'Enter' && onPick({ slug: it.slug })}
                />
              );
              offset += len;
              return seg;
            })}
          </g>
          <text x={size / 2} y={size / 2 - 6} className="donut-total">
            {formatMetric(total, metric)}
          </text>
          <text x={size / 2} y={size / 2 + 18} className="donut-sub">
            en total
          </text>
        </svg>
        <Tooltip tip={tip} />
      </div>
      <ul className="donut-legend">
        {items.map((it, i) => (
          <li key={it.slug} style={{ '--i': i }}>
            <button type="button" onClick={() => onPick({ slug: it.slug })}>
              <i style={{ background: it.color }} aria-hidden="true" />
              <span className="donut-legend__name">{it.name}</span>
              <strong>{((it.value / total) * 100).toFixed(1)}%</strong>
              <span className="donut-legend__val">{formatMetric(it.value, metric)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({ items, metric, onPick }) {
  const max = Math.max(...items.map((i) => i.value ?? 0), 0) || 1;
  const total = items.reduce((s, i) => s + (i.value || 0), 0);
  const isRate = metric === 'booking';
  return (
    <ul className="hbars">
      {items.map((it, i) => (
        <li key={it.slug} style={{ '--i': i }}>
          <button type="button" onClick={() => onPick({ slug: it.slug })}>
            <span className="hbars__name">{it.name}</span>
            <span className="hbars__track">
              <span className="hbars__fill" style={{ width: `${((it.value || 0) / (isRate ? 100 : max)) * 100}%`, background: it.color }} />
            </span>
            <strong className="hbars__val">{formatMetric(it.value, metric)}</strong>
            {!isRate && <span className="hbars__pct">{total ? `${(((it.value || 0) / total) * 100).toFixed(1)}%` : ''}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Heatmap({ buckets, series, value, onPick }) {
  const [tip, setTip] = useState(null);
  const shade = (v) => (v == null ? 'transparent' : mix(PANEL, '#7f97e8', 0.15 + (Math.min(v, 100) / 100) * 0.85));
  const ink = (v) => (v != null && v >= 55 ? '#050320' : '#eef0ff');
  return (
    <div className="heat-wrap" onPointerLeave={() => setTip(null)}>
      <table className="heat">
        <thead>
          <tr>
            <th scope="col">Empresa</th>
            {buckets.map((b) => (
              <th key={b.key} scope="col">
                {b.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((se, si) => (
            <tr key={se.slug}>
              <th scope="row">
                <i style={{ background: se.color }} aria-hidden="true" />
                {se.short}
              </th>
              {buckets.map((b, bi) => {
                const v = value(b.key, se.slug);
                return (
                  <td key={b.key}>
                    <button
                      type="button"
                      className="heat__cell"
                      style={{ background: shade(v), color: ink(v), '--i': si * 2 + bi }}
                      disabled={v == null}
                      onPointerMove={(e) => {
                        const rect = e.currentTarget.closest('.heat-wrap').getBoundingClientRect();
                        setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, title: `${se.name}, ${b.label}`, rows: [{ name: 'de agendamiento', color: se.color, value: v == null ? 'Sin datos' : `${v.toFixed(1)}%` }], hint: v == null ? null : 'Clic para ver los registros' });
                      }}
                      onClick={() => onPick({ bucket: b.key, slug: se.slug })}
                    >
                      {v == null ? '—' : `${Math.round(v)}%`}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <Tooltip tip={tip} />
      <div className="heat-scale" aria-hidden="true">
        <span>0%</span>
        <span className="heat-scale__bar" style={{ background: `linear-gradient(90deg, ${shade(0)}, ${shade(50)}, ${shade(100)})` }} />
        <span>100%</span>
      </div>
    </div>
  );
}
