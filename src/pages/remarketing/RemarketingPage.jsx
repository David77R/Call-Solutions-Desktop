import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CompanyTabs from '../../components/CompanyTabs';
import { useCatalog } from '../../lib/useCatalog';
import { useAuth } from '../../lib/AuthContext';
import { accentTokens } from '../../lib/color';
import { REMARKETING_MAPS, mapForCompany } from '../../data/remarketingZones';
import ZoneMap from './ZoneMap';
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
  const mapId = mapForCompany(company?.slug);
  const ZONES = REMARKETING_MAPS[mapId].zones;
  const [zips, setZips] = useZoneProgress(company?.slug, dateKey);
  const [focus, setFocus] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef(null);
  const zipsRef = useRef(zips);

  useEffect(() => {
    zipsRef.current = zips;
  }, [zips]);

  const color = company?.color_primary || '#7f97e8';
  const isToday = dateKey === todayKey();

  const doneCount = ZONES.filter((z) => zips[z.zip]?.done).length;
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ZONES.filter((z) => {
      const done = !!zips[z.zip]?.done;
      if (filter === 'done' && !done) return false;
      if (filter === 'pending' && done) return false;
      if (region !== 'all' && z.region !== region) return false;
      return !q || z.zip.startsWith(q) || z.name.toLowerCase().includes(q);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [zips, filter, region, search, ZONES]);

  const toggle = useCallback(
    (z) => {
      if (!company) return;
      const entry = toggleZone(company.slug, dateKey, z.zip, !!zipsRef.current[z.zip]?.done, user?.displayName);
      zipsRef.current = { ...zipsRef.current, [z.zip]: entry };
      setZips((prev) => ({ ...prev, [z.zip]: entry }));
    },
    [company, dateKey, user?.displayName, setZips],
  );

  useEffect(() => {
    const sync = () => setExpanded(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleExpanded = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else wrapRef.current?.requestFullscreen().catch(() => {});
  };

  const markedZips = Object.keys(zips).filter((z) => zips[z]?.done);

  return (
    <div className="rmk" style={accentTokens(color)}>
      <div className="rmk__head">
        <div>
          <h1 className="rmk__title">Remarketing</h1>
          <p className="rmk__sub">
            {REMARKETING_MAPS[mapId].label}: {doneCount} de {ZONES.length} zonas trabajadas. Haz clic en una zona para marcarla y usa la rueda del mouse para acercarte.
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

      <CompanyTabs
        companies={options}
        activeSlug={company?.slug ?? null}
        onChange={(s) => {
          if (!s) return;
          if (mapForCompany(s) !== mapId) {
            setRegion('all');
            setHover(null);
            setFocus(null);
          }
          setSlug(s);
        }}
        showAll={false}
      />

      <div className="rmk__progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${doneCount / ZONES.length})` }} />
      </div>

      <div className="rmk__layout">
        <div className="rmk__map-wrap" ref={wrapRef}>
          <div className="rmk__toolbar">
            <div className="rmk__regions" role="group" aria-label="Región del mapa">
              {REGIONS.map((r) => (
                <button key={r.key} type="button" aria-pressed={region === r.key} onClick={() => setRegion(r.key)}>
                  {r.label}
                </button>
              ))}
            </div>
            <button type="button" className="rmk__expand" onClick={toggleExpanded} aria-pressed={expanded}>
              {expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}
            </button>
          </div>
          <ZoneMap key={mapId} mapId={mapId} zips={zips} region={region} focus={focus} hoverZip={hover?.zip ?? null} onToggle={toggle} onHover={setHover} />
          {hover && (
            <div className="rmk__tip" key={hover.zip}>
              <strong>{hover.name}</strong>
              <span>{hover.zip}</span>
              {zips[hover.zip]?.done ? <span className="rmk__tip-by">Marcada por {zips[hover.zip].doneBy}</span> : <span className="rmk__tip-by">Sin marcar</span>}
            </div>
          )}
          {expanded && (
            <div className="rmk__float-count" style={{ '--p': doneCount / ZONES.length }}>
              <span className="rmk__float-dot" aria-hidden="true" />
              {company?.name} · {doneCount} de {ZONES.length}
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
                <li key={z.zip} className={done ? 'rmk__row is-done' : 'rmk__row'} onMouseEnter={() => setHover(z)} onMouseLeave={() => setHover(null)}>
                  <button type="button" className="rmk__item" aria-pressed={done} onClick={() => toggle(z)}>
                    <span className="rmk__check" aria-hidden="true" />
                    <span className="rmk__item-name">{z.name}</span>
                    <span className="rmk__item-zip">{z.zip}</span>
                  </button>
                  <button
                    type="button"
                    className="rmk__locate"
                    aria-label={`Ver ${z.name} ${z.zip} en el mapa`}
                    title="Ver en el mapa"
                    onClick={() => setFocus({ zip: z.zip, at: Date.now() })}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
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
