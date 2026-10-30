import { countsOf, teamCounts, totalOf } from '../../lib/counters';

const n = (v, one, many) => `${v} ${v === 1 ? one : many}`;

function line(c, combined) {
  const msgs = combined ? n(c.messagesMeta, 'mensaje', 'mensajes') : `${c.messagesMeta} Meta, ${c.messagesWhatsapp} WhatsApp`;
  return `${n(c.calls, 'llamada', 'llamadas')} · ${msgs} · ${n(c.appointments, 'cita', 'citas')}`;
}

export default function SummaryCounter({ agents, uid, combined, source, onUse }) {
  const mine = countsOf(agents?.[uid]);
  const team = teamCounts(agents);
  const others = Object.entries(agents || {}).filter(([id, a]) => id !== uid && totalOf(countsOf(a)) > 0);
  if (!totalOf(mine) && !others.length) return null;
  const myName = agents?.[uid]?.name?.split(' ')[0] || 'ti';

  return (
    <section className="sf-counter">
      <div className="sf-counter__row">
        <div>
          <span className="sf-counter__label">Tu contador de este día</span>
          <strong>{totalOf(mine) ? line(mine, combined) : 'Sin registros tuyos'}</strong>
        </div>
        {totalOf(mine) > 0 && (
          <button type="button" className={source?.scope === 'mine' ? 'sf-counter__use is-on' : 'sf-counter__use'} onClick={() => onUse('mine', mine)}>
            {source?.scope === 'mine' ? 'Usando tus números' : 'Usar mis números'}
          </button>
        )}
      </div>
      {others.length > 0 && (
        <div className="sf-counter__row sf-counter__row--team">
          <div>
            <span className="sf-counter__label">Todo el equipo en esta empresa</span>
            <strong>{line(team, combined)}</strong>
            <small>También contaron: {others.map(([, a]) => `${(a.name || 'Agente').split(' ')[0]} (${totalOf(countsOf(a))})`).join(', ')}</small>
          </div>
          <button type="button" className={source?.scope === 'team' ? 'sf-counter__use is-on' : 'sf-counter__use'} onClick={() => onUse('team', team)}>
            {source?.scope === 'team' ? 'Usando el total' : 'Usar total del equipo'}
          </button>
        </div>
      )}
      {source && (
        <p className="sf-counter__note">
          Los números de arriba vienen del contador {source.scope === 'mine' ? `de ${source.by_name?.split(' ')[0] || myName}` : 'de todo el equipo'} y quedan marcados así en el resumen.
        </p>
      )}
    </section>
  );
}
