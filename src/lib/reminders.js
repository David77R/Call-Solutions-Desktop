import { useSyncExternalStore } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'reminders';

export const STATUS = {
  pending: { label: 'Pendiente', color: '#ff8a7a' },
  en_proceso: { label: 'En proceso', color: '#f2c94c' },
  listo: { label: 'Listo', color: '#5fd39a' },
};

export const STATUS_ORDER = ['pending', 'en_proceso', 'listo'];

let remindersSnapshot = { items: [], loading: true, fromCache: true, error: null };
let remindersStarted = false;
const remindersListeners = new Set();

function emitReminders(next) {
  remindersSnapshot = next;
  remindersListeners.forEach((listener) => listener());
}

function subscribeReminders(listener) {
  if (!remindersStarted) {
    remindersStarted = true;
    onSnapshot(
      collection(db, COLLECTION),
      { includeMetadataChanges: true },
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        emitReminders({ items, loading: false, fromCache: snap.metadata.fromCache, error: null });
      },
      (err) => emitReminders({ ...remindersSnapshot, loading: false, error: err.code || 'error' })
    );
  }
  remindersListeners.add(listener);
  return () => remindersListeners.delete(listener);
}

const getRemindersSnapshot = () => remindersSnapshot;

export function useReminders() {
  return useSyncExternalStore(subscribeReminders, getRemindersSnapshot);
}

export function useOpenRemindersCount() {
  const { items } = useReminders();
  return items.filter((r) => r.status === 'pending' || r.status === 'en_proceso').length;
}

export function createReminder(text, companySlug, agentName, alarm = null) {
  const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return setDoc(doc(db, COLLECTION, id), {
    text,
    alarm,
    company_slug: companySlug || null,
    created_by: agentName || 'Agente',
    created_at: new Date().toISOString(),
    order: -Date.now(),
    status: 'pending',
    updated_by: null,
    updated_at: null,
  });
}

export function updateReminder(id, fields, agentName) {
  return setDoc(doc(db, COLLECTION, id), { ...fields, updated_by: agentName || 'Agente', updated_at: new Date().toISOString() }, { merge: true });
}

export function reminderOrder(reminder) {
  if (typeof reminder.order === 'number') return reminder.order;
  const created = Date.parse(reminder.created_at || '');
  return Number.isNaN(created) ? 0 : -created;
}

export function moveReminder(id, status, order, statusChanged, agentName) {
  const fields = statusChanged ? { status, order, updated_by: agentName || 'Agente', updated_at: new Date().toISOString() } : { order };
  return setDoc(doc(db, COLLECTION, id), fields, { merge: true });
}

export function removeReminder(id) {
  return deleteDoc(doc(db, COLLECTION, id));
}

export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
