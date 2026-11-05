import { useMemo, useState } from 'react';
import { minutesOf, protocolDayKey, useNow, useProtocolDay } from '../../lib/protocol';
import { useAgents } from '../../lib/admin';
import { agentInitials } from '../../lib/agents';
import { DAILY_PROTOCOL_ITEMS } from '../../data/dailyProtocol';
import { CheckIcon } from '../../components/Icons';
import './TeamProtocol.css';

const timeLabel = (iso) => new Date(iso).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' });

function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function Avatar({ agent }) {
  return agent.photo ? <img src={agent.photo} alt="" className="tp__avatar" /> : <span className="tp__avatar">{agentInitials({ displayName: agent.name })}</span>;
}

export default function TeamProtocol() {
  const now = useNow();
  const today = protocolDayKey(now);
  const [offset, setOffset] = useState(0);
  const dayKey = shiftDay(today, offset);
  const isToday = offset === 0;
  const { agents: marks, completions: team, sync } = useProtocolDay(dayKey);
  const { agents: registered, error } = useAgents();
  const nowMinutes = isToday && now.getHours() < 20 ? now.getHours() * 60 + now.getMinutes() : isToday ? -1 : 24 * 60;
  const dueItems = DAILY_PROTOCOL_ITEMS.filter((i) => minutesOf(i.time) <= nowMinutes);

  const rows = useMemo(() => {
    const byId = new Map();
    registered.forEach((a) => byId.set(a.id, { id: a.id, name: a.displayName || a.email || 'Agente', role: a.role || 'Agente', photo: a.photo || null }));
    Object.entries(marks).forEach(([id, m]) => {
      if (!byId.has(id)) byId.set(id, { id, name: m?.name || 'Agente', role: 'Agente', photo: null });
    });
    return [...byId.values()]
      .map((a) => {
        const items = marks[a.id]?.items || {};
        const done = DAILY_PROTOCOL_ITEMS.filter((i) => items[i.id]).length;
        const late = dueItems.filter((i) => !items[i.id]).length;
        const times = Object.values(items).filter(Boolean).sort();
        return { ...a, items, done, late, last: times[times.length - 1] || null };
      })
      .sort((x, y) => y.done - x.done || x.name.localeCompare(y.name));
  }, [registered, marks, dueItems]);

  const marked = rows.filter((r) => r.done > 0);
  const missing = rows.filter((r) => r.done === 0);
  const upToDate = marked.filter((r) => r.late === 0);
  const mobileOnly = DAILY_PROTOCOL_ITEMS.filter((i) => team[i.id] && !team[i.id].byUid);
  const [y, m, d] = dayKey.split('-').map(Number);
  const dayLabel = new Date(y, m - 1, d).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="tp">
      <div className="tp__head">
        <div>
          <h2 className="tp__title">Protocolo del equipo</h2>
          <p className="admin-hint">
            {isToday ? 'Hoy' : 'Día'}, {dayLabel}. {isToday ? 'Se actualiza en vivo a medida que cada agente marca.' : ''}
          </p>
        </div>
        <div className="tp__nav" role="group" aria-label="Cambiar de día">
          <button type="button" className="sf-chip" onClick={() => setOffset((o) => o - 1)} aria-label="Día anterior">
            ‹
          </button>
          <button type="button" className="sf-chip" onClick={() => setOffset(0)} disabled={isToday}>
            Hoy
          </button>
          <button type="button" className="sf-chip" onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={isToday} aria-label="Día siguiente">
            ›
          </button>
        </div>
      </div>

      {error === 'permission-denied' && (
        <p className="co-card__issue">Las reglas de Firestore no dejan leer la colección "agents", así que solo aparecen los agentes que ya marcaron.</p>
      )}
      {sync.error && <p className="co-card__issue">No se pudo leer el protocolo de ese día ({sync.error}).</p>}

      <div className="tp__stats">
        <div className="tp__stat tp__stat--ok">
          <b>{marked.length}</b>
          <span>marcaron</span>
        </div>
        <div className="tp__stat tp__stat--miss">
          <b>{missing.length}</b>
          <span>aún no marcan</span>
        </div>
        <div className="tp__stat">
          <b>{upToDate.length}</b>
          <span>{isToday ? 'van al día' : 'completaron todo a tiempo'}</span>
        </div>
        <div className="tp__stat">
          <b>{dueItems.length}</b>
          <span>de {DAILY_PROTOCOL_ITEMS.length} tareas ya tocaban</span>
        </div>
      </div>

      <div className="tp__groups">
        <section>
          <h3>Ya marcaron</h3>
          {marked.length ? (
            <ul className="tp__list">
              {marked.map((r) => (
                <li key={r.id}>
                  <Avatar agent={r} />
                  <span className="tp__who">
                    <strong>{r.name}</strong>
                    <small>
                      {r.done} de {DAILY_PROTOCOL_ITEMS.length}
                      {r.last ? ` · última a las ${timeLabel(r.last)}` : ''}
                    </small>
                  </span>
                  <span className="tp__bar" aria-hidden="true">
                    <i style={{ '--p': `${(r.done / DAILY_PROTOCOL_ITEMS.length) * 100}%` }} />
                  </span>
                  {r.late > 0 ? <span className="tp__tag tp__tag--late">{r.late} atrasadas</span> : <span className="tp__tag tp__tag--ok">Al día</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-hint">Nadie ha marcado todavía.</p>
          )}
        </section>
        <section>
          <h3>Aún no marcan</h3>
          {missing.length ? (
            <ul className="tp__list">
              {missing.map((r) => (
                <li key={r.id}>
                  <Avatar agent={r} />
                  <span className="tp__who">
                    <strong>{r.name}</strong>
                    <small>{r.role}</small>
                  </span>
                  {r.late > 0 && <span className="tp__tag tp__tag--late">{r.late} atrasadas</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-hint">Todos marcaron al menos una tarea.</p>
          )}
        </section>
      </div>

      <div className="tp__grid-wrap">
        <table className="tp__grid">
          <thead>
            <tr>
              <th scope="col">Agente</th>
              {DAILY_PROTOCOL_ITEMS.map((i) => (
                <th key={i.id} scope="col" title={i.label}>
                  {i.time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.name}</th>
                {DAILY_PROTOCOL_ITEMS.map((i) => {
                  const at = r.items[i.id];
                  const late = !at && minutesOf(i.time) <= nowMinutes;
                  return (
                    <td
                      key={i.id}
                      className={at ? 'is-done' : late ? 'is-late' : ''}
                      title={`${i.label}: ${at ? `marcada a las ${timeLabel(at)}` : late ? 'atrasada' : 'pendiente'}`}
                    >
                      {at ? <CheckIcon size={14} /> : late ? '!' : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mobileOnly.length > 0 && <p className="admin-hint">{mobileOnly.length} tareas se marcaron desde la app móvil, que todavía no dice quién las marcó.</p>}
    </div>
  );
}
