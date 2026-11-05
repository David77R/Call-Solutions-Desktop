import { useMemo, useState } from 'react';
import { REMARKETING_MAPS, mapForCompany } from '../../data/remarketingZones';
import { useRemarketingHistory } from '../../lib/remarketing';
import { shiftDateKey, shortLabel, todayKey } from '../../lib/summaries';

const RANGES = [
  { key: 7, label: '7 días' },
  { key: 30, label: '30 días' },
  { key: 0, label: 'Todo' },
];

function zoneIndex(slug) {
  const zones = REMARKETING_MAPS[mapForCompany(slug)]?.zones || [];
  return { total: zones.length, names: new Map(zones.map((z) => [z.zip, z.name])) };
}

function weekday(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-VE', { weekday: 'short' });
}

function DayRow({ day, company, showCompany, onOpen }) {
  const [open, setOpen] = useState(false);
  const { total, names } = zoneIndex(day.slug);
  const byAgent = {};
  day.zips.forEach((z) => (byAgent[z.by] = (byAgent[z.by] || 0) + 1));
  const zones = day.zips.map((z) => ({ ...z, name: names.get(z.zip) || z.zip })).sort((a, b) => a.name.localeCompare(b.name));
  const shown = open ? zones : zones.slice(0, 6);
  return (
    <tr>
      <th scope="row">
        <span className="rmh__date">
          {weekday(day.dateKey)} {shortLabel(day.dateKey)}
        </span>
      </th>
      {showCompany && (
        <td>
          <span className="rmh__company" style={{ '--c': company?.color_primary || '#7f97e8' }}>
            {company?.name || day.slug}
          </span>
        </td>
      )}
      <td className="rmh__count">
        <b>{day.zips.length}</b>
        <small>de {total}</small>
      </td>
      <td>
        <ul className="rmh__agents">
          {Object.entries(byAgent)
            .sort((a, b) => b[1] - a[1])
            .map(([name, n]) => (
              <li key={name}>
                {name} <b>{n}</b>
              </li>
            ))}
        </ul>
      </td>
      <td>
        <div className="rmh__zones">
          {shown.map((z) => (
            <span key={z.zip} title={`${z.zip} · ${z.by}`}>
              {z.name}
            </span>
          ))}
          {zones.length > 6 && (
            <button type="button" className="rmh__more" onClick={() => setOpen((v) => !v)}>
              {open ? 'Ver menos' : `+${zones.length - 6} más`}
            </button>
          )}
        </div>
      </td>
      <td>
        <button type="button" className="sf-chip" onClick={() => onOpen(day.slug, day.dateKey)}>
          Ver en el mapa
        </button>
      </td>
    </tr>
  );
}

export default function RemarketingHistory({ companies, currentSlug, onOpen }) {
  const [scope, setScope] = useState('company');
  const [range, setRange] = useState(30);
  const { days, loading, error } = useRemarketingHistory(scope === 'all' ? 'all' : currentSlug);
  const today = todayKey();
  const since = range ? shiftDateKey(today, -(range - 1)) : null;
  const visible = useMemo(() => days.filter((d) => !since || d.dateKey >= since), [days, since]);
  const bySlug = new Map(companies.map((c) => [c.slug, c]));
  const current = bySlug.get(currentSlug);

  const totals = useMemo(() => {
    const agents = {};
    visible.forEach((d) =>
      d.zips.forEach((z) => {
        const a = agents[z.by] || (agents[z.by] = { zones: 0, days: new Set() });
        a.zones += 1;
        a.days.add(`${d.slug}_${d.dateKey}`);
      }),
    );
    return Object.entries(agents)
      .map(([name, a]) => ({ name, zones: a.zones, days: a.days.size }))
      .sort((a, b) => b.zones - a.zones);
  }, [visible]);

  const calendarDays = range || 30;
  const perDay = new Map();
  visible.forEach((d) => perDay.set(d.dateKey, (perDay.get(d.dateKey) || 0) + d.zips.length));
  const strip = Array.from({ length: calendarDays }, (_, i) => shiftDateKey(today, -(calendarDays - 1 - i)));
  const peak = Math.max(1, ...strip.map((k) => perDay.get(k) || 0));
  const workedDays = strip.filter((k) => perDay.get(k)).length;
  const zonesSum = visible.reduce((a, d) => a + d.zips.length, 0);

  return (
    <section className="rmh">
      <div className="rmh__head">
        <div>
          <h2 className="rmh__title">Historial de remarketing</h2>
          <p className="admin-hint">
            {scope === 'all' ? 'Todas las empresas' : current?.name}: {visible.length} {visible.length === 1 ? 'día trabajado' : 'días trabajados'} y {zonesSum} zonas
            {range ? ` en los últimos ${range} días` : ''}.
          </p>
        </div>
        <div className="rmh__controls">
          <div className="rmk__regions" role="group" aria-label="Empresas">
            <button type="button" aria-pressed={scope === 'company'} onClick={() => setScope('company')}>
              {current?.name || 'Esta empresa'}
            </button>
            <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
              Todas
            </button>
          </div>
          <div className="rmk__regions" role="group" aria-label="Rango">
            {RANGES.map((r) => (
              <button key={r.key} type="button" aria-pressed={range === r.key} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rmh__strip" role="list" aria-label={`${workedDays} de ${calendarDays} días con remarketing`}>
        {strip.map((k) => {
          const n = perDay.get(k) || 0;
          return (
            <button
              key={k}
              type="button"
              role="listitem"
              className={n ? 'rmh__cell is-on' : 'rmh__cell'}
              style={{ '--k': n / peak }}
              title={`${weekday(k)} ${shortLabel(k)}: ${n ? `${n} zonas` : 'sin remarketing'}`}
              onClick={() => n && onOpen(scope === 'all' ? visible.find((d) => d.dateKey === k)?.slug || currentSlug : currentSlug, k)}
            >
              <span>{Number(k.slice(8))}</span>
            </button>
          );
        })}
      </div>

      {totals.length > 0 && (
        <ul className="rmh__totals">
          {totals.map((t) => (
            <li key={t.name}>
              <strong>{t.name}</strong>
              <span>
                {t.zones} zonas · {t.days} {t.days === 1 ? 'día' : 'días'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="co-card__issue">No se pudo cargar el historial ({error}).</p>}
      {loading && <p className="admin-hint">Cargando historial…</p>}
      {!loading && !visible.length && <p className="admin-hint">No hay remarketing marcado en este rango.</p>}
      {visible.length > 0 && (
        <div className="rmh__table-wrap">
          <table className="rmh__table">
            <thead>
              <tr>
                <th scope="col">Día</th>
                {scope === 'all' && <th scope="col">Empresa</th>}
                <th scope="col">Zonas</th>
                <th scope="col">Quién</th>
                <th scope="col">Zonas trabajadas</th>
                <th scope="col">
                  <span className="sf-sr">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <DayRow key={`${d.slug}_${d.dateKey}`} day={d} company={bySlug.get(d.slug)} showCompany={scope === 'all'} onOpen={onOpen} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
