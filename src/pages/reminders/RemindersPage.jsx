import { useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CompanyTabs, { shortCompanyName } from '../../components/CompanyTabs';
import { useCatalog } from '../../lib/useCatalog';
import { useAuth } from '../../lib/AuthContext';
import { STATUS, STATUS_ORDER, createReminder, formatDateTime, moveReminder, reminderOrder, removeReminder, updateReminder, useReminders } from '../../lib/reminders';
import { REPEAT, askNotificationPermission, buildAlarm, describeAlarm, localDayKey } from '../../lib/reminderAlarm';
import { ClockIcon } from '../../components/Icons';
import SyncNotice from '../../components/SyncNotice';
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

function ReminderCard({ reminder, company, agentName, expanded, onToggle, overlay }) {
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
    <div className={`rem-card${expanded ? ' is-open' : ''}${overlay ? ' is-overlay' : ''}`} style={{ '--co': company?.color_primary || 'var(--moon)' }}>
      <button type="button" className="rem-card__summary" onClick={onToggle} onKeyDown={(e) => e.stopPropagation()} aria-expanded={expanded}>
        <span className="rem-card__top">
          <span className="rem-card__company">{company ? shortCompanyName(company.name) : 'General'}</span>
          <span className="rem-card__time">{formatDateTime(reminder.created_at)}</span>
        </span>
        <span className="rem-card__preview">{reminder.text}</span>
        <span className="rem-card__badges">
          {reminder.alarm?.time && (
            <span className="rem-card__pill">
              <ClockIcon size={13} />
              {describeAlarm(reminder.alarm)}
            </span>
          )}
          <span className="rem-card__chev" aria-hidden="true" />
        </span>
      </button>

      <div className="rem-card__fold" aria-hidden={!expanded}>
        <div className="rem-card__inner" inert={!expanded} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
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
        </div>
      </div>
    </div>
  );
}

function SortableCard({ reminder, index, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: reminder.id });
  return (
    <li
      ref={setNodeRef}
      className={isDragging ? 'rem-slot is-dragging' : 'rem-slot'}
      style={{ transform: CSS.Transform.toString(transform), transition, '--i': Math.min(index, 12) }}
      {...attributes}
      {...listeners}
    >
      <ReminderCard reminder={reminder} {...props} />
    </li>
  );
}

function Column({ status, reminders, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={isOver ? 'column is-over' : 'column'} style={{ '--st': STATUS[status].color }}>
      <header className="column__bar">
        <span className="column__dot" aria-hidden="true" />
        <h2>{STATUS[status].label}</h2>
        <span key={reminders.length} className="column__count">
          {reminders.length}
        </span>
      </header>
      <SortableContext items={reminders.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <ul className="column__list">
          {children}
          {!reminders.length && <li className="column__empty">Suelta aquí una tarjeta.</li>}
        </ul>
      </SortableContext>
    </section>
  );
}

const ORDER_GAP = 1000;

function groupByStatus(list, overrides) {
  const columns = Object.fromEntries(STATUS_ORDER.map((st) => [st, []]));
  for (const r of list) {
    const o = overrides[r.id];
    const item = o ? { ...r, status: o.status, order: o.order } : r;
    (columns[item.status] || columns.pending).push(item);
  }
  for (const st of STATUS_ORDER) columns[st].sort((a, b) => reminderOrder(a) - reminderOrder(b));
  return columns;
}

function orderBetween(prev, next) {
  if (prev && next) return (reminderOrder(prev) + reminderOrder(next)) / 2;
  if (next) return reminderOrder(next) - ORDER_GAP;
  if (prev) return reminderOrder(prev) + ORDER_GAP;
  return -Date.now();
}

export default function RemindersPage() {
  const { companies } = useCatalog();
  const { user } = useAuth();
  const { items, fromCache, error: syncError } = useReminders();
  const [filter, setFilter] = useState(null);
  const [text, setText] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [overrides, setOverrides] = useState({});
  const [dragCols, setDragCols] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const grouped = useMemo(() => groupByStatus(visible, overrides), [visible, overrides]);
  const byId = useMemo(() => Object.fromEntries(visible.map((r) => [r.id, r])), [visible]);
  const columns = dragCols
    ? Object.fromEntries(STATUS_ORDER.map((st) => [st, dragCols[st].map((rid) => byId[rid]).filter(Boolean)]))
    : grouped;

  const containerOf = (cols, itemId) => (cols[itemId] ? itemId : STATUS_ORDER.find((st) => cols[st].includes(itemId)));

  const onDragStart = ({ active }) => {
    setActiveId(active.id);
    setDragCols(Object.fromEntries(STATUS_ORDER.map((st) => [st, grouped[st].map((r) => r.id)])));
  };

  const onDragOver = ({ active, over }) => {
    if (!over || !dragCols) return;
    const from = containerOf(dragCols, active.id);
    const to = containerOf(dragCols, over.id);
    if (!from || !to || from === to) return;
    setDragCols((cols) => {
      const target = cols[to].filter((x) => x !== active.id);
      const overIndex = target.indexOf(over.id);
      target.splice(overIndex < 0 ? target.length : overIndex, 0, active.id);
      return { ...cols, [from]: cols[from].filter((x) => x !== active.id), [to]: target };
    });
  };

  const onDragEnd = ({ active, over }) => {
    const cols = dragCols;
    setActiveId(null);
    setDragCols(null);
    if (!over || !cols) return;
    const to = containerOf(cols, active.id);
    if (!to) return;
    let list = cols[to];
    const oldIndex = list.indexOf(active.id);
    const newIndex = over.id === to ? list.length - 1 : list.indexOf(over.id);
    if (newIndex >= 0 && oldIndex !== newIndex) list = arrayMove(list, oldIndex, newIndex);
    const reminder = byId[active.id];
    if (!reminder) return;
    if (reminder.status === to && grouped[to].map((r) => r.id).join() === list.join()) return;
    const pos = list.indexOf(active.id);
    const order = orderBetween(byId[list[pos - 1]], byId[list[pos + 1]]);
    setOverrides((prev) => ({ ...prev, [active.id]: { status: to, order } }));
    moveReminder(active.id, to, order, reminder.status !== to, agentName).finally(() =>
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[active.id];
        return next;
      })
    );
  };

  const toggle = (rid) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      return next;
    });

  const activeReminder = activeId ? byId[activeId] : null;

  return (
    <div className="reminders">
      <div className="reminders__head">
        <h1 className="reminders__title">Recordatorios</h1>
        <p className="reminders__sub">Compartidos con todo el equipo. Arrastra las tarjetas para ordenarlas o cambiarlas de columna, y tócalas para ver el detalle.</p>
      </div>

      <SyncNotice fromCache={fromCache} error={syncError} what="los recordatorios del equipo" />

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setDragCols(null);
        }}
      >
        <div className="board">
          {STATUS_ORDER.map((status) => (
            <Column key={status} status={status} reminders={columns[status]}>
              {columns[status].map((r, i) => (
                <SortableCard
                  key={r.id}
                  reminder={r}
                  index={i}
                  company={companyOf(r.company_slug)}
                  agentName={agentName}
                  expanded={expanded.has(r.id)}
                  onToggle={() => toggle(r.id)}
                />
              ))}
            </Column>
          ))}
        </div>
        {createPortal(
          <DragOverlay dropAnimation={{ duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
            {activeReminder ? <ReminderCard reminder={activeReminder} company={companyOf(activeReminder.company_slug)} agentName={agentName} expanded={false} overlay /> : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
}
