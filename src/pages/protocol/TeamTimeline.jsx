import { useMemo } from 'react';
import { minutesOf, useProtocolDay } from '../../lib/protocol';
import { useAgents } from '../../lib/admin';
import { isAdminRole } from '../../lib/roles';
import { DAILY_PROTOCOL_ITEMS } from '../../data/dailyProtocol';
import { CheckIcon } from '../../components/Icons';

const LATE_GRACE = 30;
const timeLabel = (iso) => new Date(iso).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' });
const minutesFromIso = (iso) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
const firstName = (name) => (name || 'Agente').split(' ')[0];

export default function TeamTimeline({ dayKey, nowMinutes }) {
  const { agents: marks } = useProtocolDay(dayKey);
  const { agents: registered, error } = useAgents();

  const team = useMemo(() => {
    const byId = new Map();
    registered.forEach((a) => {
      if (isAdminRole(a.role) && !marks[a.id]) return;
      byId.set(a.id, { id: a.id, name: a.displayName || a.email || 'Agente' });
    });
    Object.entries(marks).forEach(([id, m]) => {
      if (!byId.has(id)) byId.set(id, { id, name: m?.name || 'Agente' });
    });
    return [...byId.values()].sort((x, y) => x.name.localeCompare(y.name));
  }, [registered, marks]);

  const started = team.filter((a) => Object.values(marks[a.id]?.items || {}).some(Boolean));
  const dueItems = DAILY_PROTOCOL_ITEMS.filter((i) => minutesOf(i.time) <= nowMinutes);
  const upToDate = team.filter((a) => dueItems.every((i) => marks[a.id]?.items?.[i.id]));

  return (
    <div className="team-tl">
      <div className="team-tl__summary">
        <span>
          <b>{started.length}</b> de {team.length} agentes ya marcaron hoy
        </span>
        <span>
          <b>{upToDate.length}</b> van al día
        </span>
        <span>
          <b>{team.length - started.length}</b> no han marcado nada
        </span>
      </div>
      {error === 'permission-denied' && <p className="protocol__error">Las reglas de Firestore no dejan leer "agents", así que solo aparecen los agentes que ya marcaron.</p>}

      <ol className="team-tl__list">
        {DAILY_PROTOCOL_ITEMS.map((item, i) => {
          const due = minutesOf(item.time) <= nowMinutes;
          const done = team.filter((a) => marks[a.id]?.items?.[item.id]).map((a) => ({ ...a, at: marks[a.id].items[item.id] }));
          const pending = team.filter((a) => !marks[a.id]?.items?.[item.id]);
          done.sort((a, b) => (a.at < b.at ? -1 : 1));
          const state = !team.length ? '' : pending.length === 0 ? 'is-done' : due ? 'is-late' : '';
          return (
            <li key={item.id} className={`team-tl__item ${state}`} style={{ '--i': i }}>
              <span className="timeline__time">{item.time}</span>
              <div className="team-tl__body">
                <div className="team-tl__top">
                  <strong>{item.label}</strong>
                  <span className="team-tl__count">
                    {done.length}/{team.length}
                  </span>
                </div>
                <div className="team-tl__chips">
                  {done.map((a) => {
                    const late = minutesFromIso(a.at) > minutesOf(item.time) + LATE_GRACE;
                    return (
                      <span
                        key={a.id}
                        className={late ? 'team-tl__chip is-done is-slow' : 'team-tl__chip is-done'}
                        title={`${a.name} la marcó a las ${timeLabel(a.at)}${late ? ' (más de 30 min tarde)' : ''}`}
                      >
                        <CheckIcon size={12} />
                        {firstName(a.name)} · {timeLabel(a.at)}
                      </span>
                    );
                  })}
                  {pending.map((a) => (
                    <span
                      key={a.id}
                      className={due ? 'team-tl__chip is-late' : 'team-tl__chip'}
                      title={due ? `${a.name} no la ha marcado y ya pasó la hora` : `${a.name} todavía no la marca`}
                    >
                      {firstName(a.name)} · {due ? 'sin marcar' : 'pendiente'}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
