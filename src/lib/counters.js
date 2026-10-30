import { useEffect, useState } from 'react';
import { collection, doc, increment, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'dailyCounters';

export const OPEN_COUNTER_EVENT = 'ccs-open-counter';

export const COUNTER_FIELDS = [
  { key: 'calls', label: 'Llamadas', one: 'llamada' },
  { key: 'messagesMeta', label: 'Mensajes Meta', short: 'Meta', one: 'mensaje' },
  { key: 'messagesWhatsapp', label: 'WhatsApp', one: 'WhatsApp' },
  { key: 'appointments', label: 'Citas nuevas', short: 'Citas', one: 'cita' },
];

export function openCounter() {
  window.dispatchEvent(new CustomEvent(OPEN_COUNTER_EVENT));
}

export function fieldsFor(combined) {
  return COUNTER_FIELDS.filter((f) => !(combined && f.key === 'messagesWhatsapp')).map((f) =>
    combined && f.key === 'messagesMeta' ? { ...f, label: 'Mensajes', short: 'Mensajes' } : f
  );
}

export function useDayCounters(dateKey) {
  const [state, setState] = useState({ bySlug: {}, error: null });
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, COLLECTION), where('date_key', '==', dateKey)),
        (snap) => {
          const bySlug = {};
          snap.docs.forEach((d) => {
            const data = d.data();
            bySlug[data.company_slug] = data.agents || {};
          });
          setState({ bySlug, error: null });
        },
        (err) => setState((s) => ({ ...s, error: err.code || 'error' }))
      ),
    [dateKey]
  );
  return state;
}

export function bump(companySlug, dateKey, user, field, amount) {
  if (!user?.uid) return Promise.resolve();
  return setDoc(
    doc(db, COLLECTION, `${companySlug}_${dateKey}`),
    {
      company_slug: companySlug,
      date_key: dateKey,
      agents: {
        [user.uid]: {
          name: user.displayName || 'Agente',
          [field]: increment(amount),
          updated_at: new Date().toISOString(),
        },
      },
    },
    { merge: true }
  );
}

export function countsOf(agent) {
  return {
    calls: Math.max(0, agent?.calls || 0),
    messagesMeta: Math.max(0, agent?.messagesMeta || 0),
    messagesWhatsapp: Math.max(0, agent?.messagesWhatsapp || 0),
    appointments: Math.max(0, agent?.appointments || 0),
  };
}

export function teamCounts(agents) {
  return Object.values(agents || {}).reduce(
    (sum, a) => {
      const c = countsOf(a);
      return {
        calls: sum.calls + c.calls,
        messagesMeta: sum.messagesMeta + c.messagesMeta,
        messagesWhatsapp: sum.messagesWhatsapp + c.messagesWhatsapp,
        appointments: sum.appointments + c.appointments,
      };
    },
    { calls: 0, messagesMeta: 0, messagesWhatsapp: 0, appointments: 0 }
  );
}

export function totalOf(counts) {
  return counts.calls + counts.messagesMeta + counts.messagesWhatsapp + counts.appointments;
}
