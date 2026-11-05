import { useMemo, useState } from 'react';
import { REMARKETING_MAPS, mapForCompany } from '../../data/remarketingZones';
import { useRemarketingHistory } from '../../lib/remarketing';
import { shiftDateKey, shortLabel, todayKey } from '../../lib/summaries';

const RANGES = [
  { key: 7, label: '7 días' },
  { key: 30, label: '30 días' },
  { key: 90, label: '3 meses' },
  { key: 0, label: 'Todo' },
];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MAX_MONTHS = 12;

const pad = (n) => String(n).padStart(2, '0');
const monthKey = (key) => key.slice(0, 7);

function monthsBetween(fromKey, toKey) {
  const out = [];
  let [y, m] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${pad(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out.slice(-MAX_MONTHS);
}

function MiniMonth({ month, info, since, today, colors, onPick }) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(y, m, 0).getDate();
  const monthName = first.toLocaleDateString('es-VE', { month: 'long' });
  const title = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${y}`;
  const worked = Array.from({ length: count }, (_, i) => info.get(`${month}-${pad(i + 1)}`)).filter(Boolean).length;
  const peak = Math.max(1, ...Array.from({ length: count }, (_, i) => info.get(`${month}-${pad(i + 1)}`)?.zones || 0));
  return (
    <div className="rmh__month">
      <div className="rmh__month-head">
        <strong>{title}</strong>
        <small>{worked ? `${worked} ${worked === 1 ? 'día' : 'días'}` : 'Sin remarketing'}</small>
      </div>
      <div className="rmh__weekdays" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="rmh__days">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`l${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const key = `${month}-${pad(i + 1)}`;
          const day = info.get(key);
          const outside = (since && key < since) || key > today;
          const cls = ['rmh__day', day ? 'is-on' : '', outside ? 'is-out' : '', key === today ? 'is-today' : ''].filter(Boolean).join(' ');
          const label = day ? `${shortLabel(key)}: ${day.zones} zonas · ${day.items.map((d) => `${d.name} (${d.zones})`).join(', ')}` : `${shortLabel(key)}: sin remarketing`;
          return (
            <button
              key={key}
              type="button"
              className={cls}
              style={day ? { '--k': day.zones / peak, '--c': day.items.length === 1 ? colors.get(day.items[0].slug) : '#7f97e8' } : undefined}
              title={label}
              aria-label={label}
              disabled={!day}
              onClick={() => day && onPick(day.items[0].slug, key)}
            >
              <span>{i + 1}</span>
              {day && day.items.length > 1 && (
                <i className="rmh__dots" aria-hidden="true">
                  {day.items.map((d) => (
                    <b key={d.slug} style={{ background: colors.get(d.slug) }} />
                  ))}
                </i>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  const [scope, setScope] = useState(currentSlug || 'all');
  const [range, setRange] = useState(30);
  const { days, loading, error } = useRemarketingHistory(scope);
  const today = todayKey();
  const since = range ? shiftDateKey(today, -(range - 1)) : null;
  const visible = useMemo(() => days.filter((d) => !since || d.dateKey >= since), [days, since]);
  const bySlug = new Map(companies.map((c) => [c.slug, c]));
  const current = bySlug.get(scope);
  const colors = new Map(companies.map((c) => [c.slug, c.color_primary || '#7f97e8']));

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

  const info = new Map();
  visible.forEach((d) => {
    const entry = info.get(d.dateKey) || { zones: 0, items: [] };
    entry.zones += d.zips.length;
    entry.items.push({ slug: d.slug, name: bySlug.get(d.slug)?.name || d.slug, zones: d.zips.length });
    info.set(d.dateKey, entry);
  });
  const earliest = visible.length ? visible[visible.length - 1].dateKey : today;
  const months = monthsBetween(monthKey(since || earliest), monthKey(today));
  const zonesSum = visible.reduce((a, d) => a + d.zips.length, 0);

  return (
    <section className="rmh">
      <div className="rmh__head">
        <div>
          <h2 className="rmh__title">Historial de remarketing</h2>
          <p className="admin-hint">
            {scope === 'all' ? 'Todas las empresas' : current?.name || 'Empresa'}: {visible.length} {visible.length === 1 ? 'día trabajado' : 'días trabajados'} y {zonesSum} zonas
            {range ? ` en los últimos ${range} días` : ''}.
          </p>
        </div>
        <div className="rmh__controls">
          <div className="rmk__regions" role="group" aria-label="Rango">
            {RANGES.map((r) => (
              <button key={r.key} type="button" aria-pressed={range === r.key} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rmh__pills" role="radiogroup" aria-label="Empresa">
        <button type="button" role="radio" aria-checked={scope === 'all'} className="rmh__pill" onClick={() => setScope('all')}>
          Todas
        </button>
        {companies.map((c) => (
          <button
            key={c.slug}
            type="button"
            role="radio"
            aria-checked={scope === c.slug}
            className="rmh__pill"
            style={{ '--c': c.color_primary || '#7f97e8' }}
            onClick={() => setScope(c.slug)}
          >
            <i aria-hidden="true" />
            {c.name}
          </button>
        ))}
      </div>

      <div className="rmh__months">
        {months.map((month) => (
          <MiniMonth key={month} month={month} info={info} since={since} today={today} colors={colors} onPick={onOpen} />
        ))}
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
