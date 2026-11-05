import { useState } from 'react';
import { minutesOf, useProtocol } from '../../lib/protocol';
import { CheckIcon } from '../../components/Icons';
import SyncNotice from '../../components/SyncNotice';
import { useAuth } from '../../lib/AuthContext';
import { useAgentProfile } from '../../lib/useAgentProfile';
import { isAdminRole } from '../../lib/roles';
import TeamTimeline from './TeamTimeline';
import './ProtocolPage.css';

const ALERTS_KEY = 'ccs_protocol_alerts';

function readAlerts() {
  try {
    return localStorage.getItem(ALERTS_KEY) === 'on';
  } catch {
    return false;
  }
}

export default function ProtocolPage() {
  const { items, completions, toggle, nowMinutes, overdue, sync, dayKey, afterReset } = useProtocol();
  const { user } = useAuth();
  const profile = useAgentProfile(user);
  const admin = isAdminRole(profile?.role);
  const [view, setView] = useState('team');
  const showTeam = admin && view === 'team';
  const [y, m, d] = dayKey.split('-').map(Number);
  const dayLabel = new Date(y, m - 1, d).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
  const [alerts, setAlerts] = useState(readAlerts);
  const [alertError, setAlertError] = useState('');
  const doneCount = items.filter((i) => completions[i.id]).length;
  const nextItem = items.find((i) => !completions[i.id] && minutesOf(i.time) > nowMinutes);

  const enableAlerts = async () => {
    if (typeof Notification === 'undefined') {
      setAlertError('Este navegador no permite avisos.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setAlertError('El navegador bloqueó los avisos. Actívalos en el candado de la barra de direcciones.');
      return;
    }
    try {
      localStorage.setItem(ALERTS_KEY, 'on');
    } catch {
      setAlertError('');
    }
    setAlerts(true);
    setAlertError('');
    window.dispatchEvent(new Event('ccs-protocol-alerts'));
  };

  const disableAlerts = () => {
    try {
      localStorage.setItem(ALERTS_KEY, 'off');
    } catch {
      setAlertError('');
    }
    setAlerts(false);
    window.dispatchEvent(new Event('ccs-protocol-alerts'));
  };

  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className="protocol">
      <div className="protocol__head">
        <div>
          <h1 className="protocol__title">Protocolo del día</h1>
          <p className="protocol__day">{afterReset ? `Ya cerró el de hoy. Mostrando el de mañana, ${dayLabel}.` : `Protocolo de hoy, ${dayLabel}.`}</p>
          <p className="protocol__sub">
            {doneCount} de {items.length} tareas hechas
            {overdue > 0 ? `, ${overdue} ${overdue === 1 ? 'atrasada' : 'atrasadas'}` : ''}. Es tu protocolo: cada agente marca el suyo y se reinicia a las 8:00 p.m.
          </p>
        </div>
        <div className="protocol__ring" style={{ '--pct': pct }} role="img" aria-label={`${pct}% completado`}>
          <span>{pct}%</span>
        </div>
      </div>

      <SyncNotice fromCache={sync.fromCache} error={sync.error} what="tus tareas marcadas" />

      <div className="protocol__alerts">
        {alerts ? (
          <>
            <span>Avisos activados en esta computadora mientras la app esté abierta.</span>
            <button type="button" className="sf-chip" onClick={disableAlerts}>
              Desactivar
            </button>
          </>
        ) : (
          <>
            <span>Recibe un aviso del navegador a la hora de cada tarea.</span>
            <button type="button" className="sf-chip" onClick={enableAlerts}>
              Activar avisos
            </button>
          </>
        )}
        {alertError && <p className="protocol__error">{alertError}</p>}
      </div>

      {admin && (
        <div className="protocol__views" role="tablist" aria-label="Vista del protocolo">
          <button type="button" role="tab" aria-selected={view === 'team'} onClick={() => setView('team')}>
            Equipo
          </button>
          <button type="button" role="tab" aria-selected={view === 'mine'} onClick={() => setView('mine')}>
            Mi protocolo
          </button>
          <span className="protocol__views-note">Vista de administración: ves qué agente marcó cada tarea y a qué hora.</span>
        </div>
      )}

      {showTeam && <TeamTimeline dayKey={dayKey} nowMinutes={nowMinutes} />}

      {!showTeam && (
        <ol className="timeline">
          {items.map((item, i) => {
            const done = !!completions[item.id];
            const late = !done && minutesOf(item.time) <= nowMinutes;
            const isNext = item === nextItem;
            const state = done ? 'is-done' : late ? 'is-late' : isNext ? 'is-next' : '';
            return (
              <li key={item.id} className={`timeline__item ${state}`} style={{ '--i': i }}>
                <span className="timeline__time">{item.time}</span>
                <button type="button" className="timeline__check" aria-pressed={done} onClick={() => toggle(item.id)}>
                  <span className="timeline__box" aria-hidden="true">
                    {done && <CheckIcon size={16} />}
                  </span>
                  <span className="timeline__label">{item.label}</span>
                  {late && <span className="timeline__tag">Atrasada</span>}
                  {isNext && <span className="timeline__tag timeline__tag--next">Siguiente</span>}
                  {done && completions[item.id]?.at && (
                    <span className="timeline__by">{new Date(completions[item.id].at).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' })}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
