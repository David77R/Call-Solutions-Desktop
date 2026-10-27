import { useEffect, useMemo, useRef, useState } from 'react';
import CompanyTabs from '../../components/CompanyTabs';
import { useCatalog } from '../../lib/useCatalog';
import { useAuth } from '../../lib/AuthContext';
import { accentTokens } from '../../lib/color';
import { REGION_VIEWBOXES, REMARKETING_VIEWBOX, REMARKETING_ZONES } from '../../data/remarketingZones';
import { REMARKETING_SLUGS, resetZones, toggleZone, useZoneProgress } from '../../lib/remarketing';
import { labelFromDateKey, shiftDateKey, todayKey } from '../../lib/summaries';
import '../summary/Summary.css';
import './RemarketingPage.css';

const REGIONS = [
  { key: 'all', label: 'Todo el mapa' },
  { key: 'norte', label: 'Norte' },
  { key: 'centro', label: 'Centro' },
  { key: 'sur', label: 'Sur' },
];

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'done', label: 'Marcadas' },
  { key: 'pending', label: 'Sin marcar' },
];

const parseBox = (s) => s.split(' ').map(Number);

function useAnimatedViewBox(target) {
  const [box, setBox] = useState(() => parseBox(target));
  const current = useRef(box);

  useEffect(() => {
    const from = current.current;
    const to = parseBox(target);
    const start = performance.now();
    const duration = 700;
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 4);
      const next = from.map((v, i) => v + (to[i] - v) * e);
      current.current = next;
      setBox(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return box.join(' ');
}

export default function RemarketingPage() {
  const { companies } = useCatalog();
  const { user } = useAuth();
  const options = companies.filter((c) => REMARKETING_SLUGS.includes(c.slug));
  const [slug, setSlug] = useState(null);
  const [dateKey, setDateKey] = useState(todayKey());
  const [region, setRegion] = useState('all');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [hover, setHover] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const company = options.find((c) => c.slug === slug) || options[0] || null;
  const [zips, setZips] = useZoneProgress(company?.slug, dateKey);
  const viewBox = useAnimatedViewBox(region === 'all' ? REMARKETING_VIEWBOX : REGION_VIEWBOXES[region]);
  const color = company?.color_primary || '#7f97e8';
  const isToday = dateKey === todayKey();

  const doneCount = REMARKETING_ZONES.filter((z) => zips[z.zip]?.done).length;
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return REMARKETING_ZONES.filter((z) => {
      const done = !!zips[z.zip]?.done;
      if (filter === 'done' && !done) return false;
      if (filter === 'pending' && done) return false;
      if (region !== 'all' && z.region !== region) return false;
      return !q || z.zip.startsWith(q) || z.name.toLowerCase().includes(q);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [zips, filter, region, search]);

  const toggle = (z) => {
    const done = !!zips[z.zip]?.done;
    const entry = toggleZone(company.slug, dateKey, z.zip, done, user?.displayName);
    setZips((prev) => ({ ...prev, [z.zip]: entry }));
  };

  const markedZips = Object.keys(zips).filter((z) => zips[z]?.done);

  return (
    <div className="rmk" style={accentTokens(color)}>
      <div className="rmk__head">
        <div>
          <h1 className="rmk__title">Remarketing</h1>
          <p className="rmk__sub">
            {doneCount} de {REMARKETING_ZONES.length} zonas trabajadas hoy. Toca una zona del mapa para marcarla.
          </p>
        </div>
        <div className="date-nav">
          <button type="button" className="date-nav__btn" aria-label="Día anterior" onClick={() => setDateKey((k) => shiftDateKey(k, -1))}>
            ‹
          </button>
          <span className="qc__date">{labelFromDateKey(dateKey)}</span>
          <button type="button" className="date-nav__btn" aria-label="Día siguiente" disabled={isToday} onClick={() => setDateKey((k) => shiftDateKey(k, 1))}>
            ›
          </button>
        </div>
      </div>

      <CompanyTabs companies={options} activeSlug={company?.slug ?? null} onChange={(s) => s && setSlug(s)} showAll={false} />

      <div className="rmk__progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${doneCount / REMARKETING_ZONES.length})` }} />
      </div>

      <div className="rmk__layout">
        <div className="rmk__map-wrap">
          <div className="rmk__regions" role="group" aria-label="Región del mapa">
            {REGIONS.map((r) => (
              <button key={r.key} type="button" aria-pressed={region === r.key} onClick={() => setRegion(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
          <svg className="rmk__map" viewBox={viewBox} role="group" aria-label="Mapa de zonas de remarketing">
            {REMARKETING_ZONES.map((z) => {
              const done = !!zips[z.zip]?.done;
              const dim = region !== 'all' && z.region !== region;
              return (
                <path
                  key={z.zip}
                  d={z.path}
                  className={`rmk__zone${done ? ' is-done' : ''}${dim ? ' is-dim' : ''}${hover?.zip === z.zip ? ' is-hover' : ''}`}
                  style={done ? { fill: color } : undefined}
                  tabIndex={dim ? -1 : 0}
                  role="button"
                  aria-pressed={done}
                  aria-label={`${z.name} ${z.zip}`}
                  onClick={() => toggle(z)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle(z);
                    }
                  }}
                  onMouseEnter={() => setHover(z)}
                  onMouseLeave={() => setHover((h) => (h?.zip === z.zip ? null : h))}
                />
              );
            })}
            {region !== 'all' &&
              REMARKETING_ZONES.filter((z) => z.region === region).map((z) => (
                <text key={`t-${z.zip}`} x={z.cx} y={z.cy} className="rmk__label">
                  {z.zip}
                </text>
              ))}
          </svg>
          {hover && (
            <div className="rmk__tip" key={hover.zip}>
              <strong>{hover.name}</strong>
              <span>{hover.zip}</span>
              {zips[hover.zip]?.done && <span className="rmk__tip-by">Marcada por {zips[hover.zip].doneBy}</span>}
            </div>
          )}
        </div>

        <aside className="rmk__side">
          <label htmlFor="rmk-search" className="sf-sr">
            Buscar zona
          </label>
          <input id="rmk-search" className="sf-input" placeholder="Buscar ciudad o ZIP" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="rmk__filters" role="group" aria-label="Filtro">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" className="sf-chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <ul className="rmk__list">
            {list.map((z) => {
              const done = !!zips[z.zip]?.done;
              return (
                <li key={z.zip}>
                  <button
                    type="button"
                    className={done ? 'rmk__item is-done' : 'rmk__item'}
                    onClick={() => toggle(z)}
                    onMouseEnter={() => setHover(z)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <span className="rmk__check" aria-hidden="true" />
                    <span className="rmk__item-name">{z.name}</span>
                    <span className="rmk__item-zip">{z.zip}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {markedZips.length > 0 &&
            (confirmReset ? (
              <div className="rmk__reset">
                <span>¿Desmarcar las {markedZips.length} zonas de este día?</span>
                <button
                  type="button"
                  className="sf-chip sf-chip--danger"
                  onClick={() => {
                    resetZones(company.slug, dateKey, markedZips);
                    setConfirmReset(false);
                  }}
                >
                  Sí, desmarcar
                </button>
                <button type="button" className="sf-chip" onClick={() => setConfirmReset(false)}>
                  No
                </button>
              </div>
            ) : (
              <button type="button" className="sf-ghost" onClick={() => setConfirmReset(true)}>
                Desmarcar todo
              </button>
            ))}
        </aside>
      </div>
    </div>
  );
}
