import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon } from './Icons';
import { shortCompanyName } from './CompanyTabs';
import { useReminders, updateReminder } from '../lib/reminders';
import { useCatalog } from '../lib/useCatalog';
import { useAuth } from '../lib/AuthContext';
import { accentTokens } from '../lib/color';
import { chime, dueReminders, formatClock, markSeen, snoozeReminder } from '../lib/reminderAlarm';
import './ReminderAlerts.css';

const TICK_MS = 15000;
const LEAVE_MS = 320;
const MAX_VISIBLE = 3;

function AlertCard({ entry, company, onDone, onProgress, onSnooze, onDismiss, onOpen, leaving, index }) {
  const { reminder } = entry;
  return (
    <div
      className={leaving ? 'ralert is-leaving' : 'ralert'}
      role="alertdialog"
      aria-labelledby={`ralert-${reminder.id}`}
      style={{ ...accentTokens(company?.color_primary), '--co': 'var(--accent)', '--i': index }}
    >
      <span className="ralert__sheen" aria-hidden="true" />
      <div className="ralert__bell" aria-hidden="true">
        <span className="ralert__ring" />
        <span className="ralert__ring ralert__ring--late" />
        <BellIcon size={26} />
      </div>
      <div className="ralert__body">
        <span className="ralert__kicker">
          Recordatorio de las {formatClock(reminder.alarm.time)}
          {company ? ` · ${shortCompanyName(company.name)}` : ''}
        </span>
        <p id={`ralert-${reminder.id}`} className="ralert__text">
          {reminder.text}
        </p>
        <span className="ralert__meta">Creado por {reminder.created_by}</span>
        <div className="ralert__actions">
          <button type="button" className="ralert__btn ralert__btn--main" onClick={onDone}>
            Marcar listo
          </button>
          {reminder.status === 'pending' && (
            <button type="button" className="ralert__btn" onClick={onProgress}>
              En proceso
            </button>
          )}
          <button type="button" className="ralert__btn" onClick={onSnooze}>
            Posponer 10 min
          </button>
          <button type="button" className="ralert__btn ralert__btn--ghost" onClick={onOpen}>
            Ver tablero
          </button>
        </div>
      </div>
      <button type="button" className="ralert__close" onClick={onDismiss} aria-label="Cerrar aviso">
        ×
      </button>
    </div>
  );
}

export default function ReminderAlerts() {
  const navigate = useNavigate();
  const { items } = useReminders();
  const { companies } = useCatalog();
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [version, setVersion] = useState(0);
  const [leaving, setLeaving] = useState({});
  const announced = useRef(new Set());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const due = useMemo(() => dueReminders(items, new Date(now)), [items, now, version]);

  useEffect(() => {
    const fresh = due.filter((e) => !announced.current.has(`${e.reminder.id}|${e.key}`));
    if (!fresh.length) return;
    fresh.forEach((e) => announced.current.add(`${e.reminder.id}|${e.key}`));
    chime();
    window.dispatchEvent(new Event('ccs-reminder-ring'));
    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      fresh.forEach(({ reminder }) => {
        const n = new Notification(`Recordatorio de las ${formatClock(reminder.alarm.time)}`, { body: reminder.text, tag: `reminder-${reminder.id}` });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      });
    }
  }, [due]);

  const close = (entry, after) => {
    const id = entry.reminder.id;
    setLeaving((l) => ({ ...l, [id]: true }));
    setTimeout(() => {
      after();
      setLeaving((l) => {
        const next = { ...l };
        delete next[id];
        return next;
      });
      setVersion((v) => v + 1);
    }, LEAVE_MS);
  };

  const agent = user?.displayName || 'Agente';
  const visible = due.slice(0, MAX_VISIBLE);
  if (!visible.length) return null;

  return (
    <div className="ralerts" aria-live="assertive">
      {due.length > MAX_VISIBLE && <span className="ralerts__more">+{due.length - MAX_VISIBLE} avisos más</span>}
      {visible.map((entry, index) => (
        <AlertCard
          key={`${entry.reminder.id}-${entry.key}`}
          entry={entry}
          index={index}
          leaving={!!leaving[entry.reminder.id]}
          company={companies.find((c) => c.slug === entry.reminder.company_slug)}
          onDone={() =>
            close(entry, () => {
              markSeen(entry.reminder.id, entry.key);
              updateReminder(entry.reminder.id, { status: 'listo' }, agent);
            })
          }
          onProgress={() =>
            close(entry, () => {
              markSeen(entry.reminder.id, entry.key);
              updateReminder(entry.reminder.id, { status: 'en_proceso' }, agent);
            })
          }
          onSnooze={() =>
            close(entry, () => {
              snoozeReminder(entry.reminder.id, 10);
              announced.current.delete(`${entry.reminder.id}|${entry.key}`);
            })
          }
          onDismiss={() => close(entry, () => markSeen(entry.reminder.id, entry.key))}
          onOpen={() =>
            close(entry, () => {
              markSeen(entry.reminder.id, entry.key);
              navigate('/recordatorios');
            })
          }
        />
      ))}
    </div>
  );
}
