import { useId, useState } from 'react';
import CompanyTabs, { shortCompanyName } from '../../components/CompanyTabs';
import { useCatalog } from '../../lib/useCatalog';
import { useAuth } from '../../lib/AuthContext';
import { STATUS, STATUS_ORDER, createReminder, formatDateTime, removeReminder, updateReminder, useReminders } from '../../lib/reminders';
import { REPEAT, askNotificationPermission, buildAlarm, describeAlarm, localDayKey } from '../../lib/reminderAlarm';
import { ClockIcon } from '../../components/Icons';
import './RemindersPage.css';

function defaultTime() {
  const d = new Date(Date.now() + 60 * 60000);
  d.setMinutes(0);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function AlarmFields({ value, onChange, idPrefix }) {
  return (
    <div className="alarm-fields">
      <label htmlFor={`${idPrefix}-time`} className="alarm-fields__item">
        <span>Hora</span>
        <input id={`${idPrefix}-time`} type="time" className="composer__select" value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value })} />
      </label>
      <label htmlFor={`${idPrefix}-repeat`} className="alarm-fields__item">
        <span>Repetir</span>
        <select id={`${idPrefix}-repeat`} className="composer__select" value={value.repeat} onChange={(e) => onChange({ ...value, repeat: e.target.value })}>
          {Object.entries(REPEAT).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {value.repeat === 'once' && (
        <label htmlFor={`${idPrefix}-date`} className="alarm-fields__item">
          <span>Día</span>
          <input id={`${idPrefix}-date`} type="date" className="composer__select" min={localDayKey()} value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} />
        </label>
      )}
    </div>
  );
}

function alarmDraft(alarm) {
  return { time: alarm?.time || defaultTime(), repeat: alarm?.repeat || 'once', date: alarm?.date || localDayKey() };
}

function ReminderCard({ reminder, company, agentName, onDragStart, index }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reminder.text);
  const [confirming, setConfirming] = useState(false);
  const [alarmOpen, setAlarmOpen] = useState(false);
  const [alarm, setAlarm] = useState(() => alarmDraft(reminder.alarm));
  const fieldId = useId();
  const currentIndex = STATUS_ORDER.indexOf(reminder.status);

  const saveText = async () => {
    const text = draft.trim();
    if (text && text !== reminder.text) await updateReminder(reminder.id, { text }, agentName);
    setEditing(false);
  };

  const saveAlarm = (next) => {
    updateReminder(reminder.id, { alarm: next }, agentName);
    if (next) askNotificationPermission();
    setAlarmOpen(false);
  };

  const move = (dir) => {
    const next = STATUS_ORDER[currentIndex + dir];
    if (next) updateReminder(reminder.id, { status: next }, agentName);
  };

  return (
    <li
      className="rem-card"
      draggable={!editing}
      onDragStart={(e) => onDragStart(e, reminder.id)}
      style={{ '--co': company?.color_primary || 'var(--moon)', '--i': Math.min(index, 12) }}
    >
      <div className="rem-card__top">
        <span className="rem-card__company">{company ? shortCompanyName(company.name) : 'General'}</span>
        <span className="rem-card__time">{formatDateTime(reminder.created_at)}</span>
      </div>

      {editing ? (
        <textarea
          className="rem-card__edit"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveText}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              saveText();
            }
            if (e.key === 'Escape') {
              setDraft(reminder.text);
              setEditing(false);
            }
          }}
        />
      ) : (
        <p className="rem-card__text" onDoubleClick={() => setEditing(true)}>
          {reminder.text}
        </p>
      )}

      {reminder.alarm?.time && !alarmOpen && (
        <button type="button" className="rem-card__alarm" onClick={() => setAlarmOpen(true)} title="Cambiar el aviso">
          <ClockIcon size={15} />
          {describeAlarm(reminder.alarm)}
        </button>
      )}

      {alarmOpen && (
        <div className="rem-card__alarm-edit">
          <AlarmFields value={alarm} onChange={setAlarm} idPrefix={fieldId} />
          <div className="rem-card__alarm-actions">
            <button type="button" className="sf-chip rem-card__next" disabled={!alarm.time} onClick={() => saveAlarm(buildAlarm(alarm))}>
              Guardar aviso
            </button>
            {reminder.alarm?.time && (
              <button type="button" className="sf-chip" onClick={() => saveAlarm(null)}>
                Quitar aviso
              </button>
            )}
            <button type="button" className="sf-chip" onClick={() => setAlarmOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <p className="rem-card__meta">
        Creado por {reminder.created_by}
        {reminder.updated_by && reminder.updated_at ? `. ${STATUS[reminder.status]?.label} por ${reminder.updated_by}, ${formatDateTime(reminder.updated_at)}` : ''}
      </p>

      <div className="rem-card__actions">
        {confirming ? (
          <>
            <button type="button" className="sf-chip sf-chip--danger" onClick={() => removeReminder(reminder.id)}>
              Sí, borrar
            </button>
            <button type="button" className="sf-chip" onClick={() => setConfirming(false)}>
              No
            </button>
          </>
        ) : (
          <>
            {currentIndex > 0 && (
              <button type="button" className="sf-chip" onClick={() => move(-1)} aria-label={`Mover a ${STATUS[STATUS_ORDER[currentIndex - 1]].label}`}>
                ←
              </button>
            )}
            {currentIndex < STATUS_ORDER.length - 1 && (
              <button type="button" className="sf-chip rem-card__next" onClick={() => move(1)}>
                {STATUS[STATUS_ORDER[currentIndex + 1]].label} →
              </button>
            )}
            <button type="button" className="sf-chip" onClick={() => setEditing(true)}>
              Editar
            </button>
            {!reminder.alarm?.time && !alarmOpen && (
              <button
                type="button"
                className="sf-chip"
                onClick={() => {
                  setAlarm(alarmDraft(null));
                  setAlarmOpen(true);
                }}
              >
                Programar aviso
              </button>
            )}
            <button type="button" className="sf-chip" onClick={() => setConfirming(true)}>
              Borrar
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export default function RemindersPage() {
  const { companies } = useCatalog();
  const { user } = useAuth();
  const { items } = useReminders();
  const [filter, setFilter] = useState(null);
  const [text, setText] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [over, setOver] = useState(null);
  const [withAlarm, setWithAlarm] = useState(false);
  const [alarm, setAlarm] = useState(() => alarmDraft(null));
  const id = useId();
  const agentName = user?.displayName || 'Agente';

  const visible = filter ? items.filter((r) => r.company_slug === filter) : items;
  const companyOf = (slug) => companies.find((c) => c.slug === slug);

  const add = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const nextAlarm = withAlarm ? buildAlarm(alarm) : null;
    setText('');
    setWithAlarm(false);
    setAlarm(alarmDraft(null));
    if (nextAlarm) askNotificationPermission();
    await createReminder(t, newCompany || filter, agentName, nextAlarm);
  };

  const onDragStart = (e, reminderId) => {
    e.dataTransfer.setData('text/plain', reminderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (e, status) => {
    e.preventDefault();
    setOver(null);
    const reminderId = e.dataTransfer.getData('text/plain');
    const reminder = items.find((r) => r.id === reminderId);
    if (reminder && reminder.status !== status) updateReminder(reminderId, { status }, agentName);
  };

  return (
    <div className="reminders">
      <div className="reminders__head">
        <h1 className="reminders__title">Recordatorios</h1>
        <p className="reminders__sub">Compartidos con todo el equipo. Arrastra una tarjeta a otra columna para cambiar su estado.</p>
      </div>

      <CompanyTabs companies={companies} activeSlug={filter} onChange={setFilter} />

      <form className="composer" onSubmit={add}>
        <label htmlFor={`${id}-text`} className="sf-sr">
          Nuevo recordatorio
        </label>
        <textarea
          id={`${id}-text`}
          className="composer__text"
          placeholder="Escribe un recordatorio para el equipo…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) add(e);
          }}
        />
        <div className="composer__row">
          <label htmlFor={`${id}-company`} className="composer__label">
            Empresa
          </label>
          <select id={`${id}-company`} className="composer__select" value={newCompany || filter || ''} onChange={(e) => setNewCompany(e.target.value)}>
            <option value="">General</option>
            {companies.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" className="composer__alarm-toggle" aria-pressed={withAlarm} onClick={() => setWithAlarm((v) => !v)}>
            <ClockIcon size={16} />
            {withAlarm ? 'Con aviso' : 'Programar aviso'}
          </button>
          <button type="submit" className="composer__add" disabled={!text.trim() || (withAlarm && !alarm.time)}>
            Agregar
          </button>
        </div>
        {withAlarm && (
          <div className="composer__alarm">
            <AlarmFields value={alarm} onChange={setAlarm} idPrefix={`${id}-alarm`} />
            <p className="composer__alarm-hint">A esa hora le sale un aviso animado a todo el equipo que tenga la app abierta, con sonido.</p>
          </div>
        )}
      </form>

      <div className="board">
        {STATUS_ORDER.map((status) => {
          const column = visible.filter((r) => r.status === status);
          return (
            <section
              key={status}
              className={over === status ? 'column is-over' : 'column'}
              style={{ '--st': STATUS[status].color }}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={(e) => onDrop(e, status)}
            >
              <header className="column__bar">
                <span className="column__dot" aria-hidden="true" />
                <h2>{STATUS[status].label}</h2>
                <span className="column__count">{column.length}</span>
              </header>
              <ul className="column__list">
                {column.map((r, i) => (
                  <ReminderCard key={r.id} reminder={r} company={companyOf(r.company_slug)} agentName={agentName} onDragStart={onDragStart} index={i} />
                ))}
                {!column.length && <li className="column__empty">Nada por aquí.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
