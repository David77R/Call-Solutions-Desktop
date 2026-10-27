import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'reminders';

export const STATUS = {
  pending: { label: 'Pendiente', color: '#ff8a7a' },
  en_proceso: { label: 'En proceso', color: '#f2c94c' },
  listo: { label: 'Listo', color: '#5fd39a' },
};

export const STATUS_ORDER = ['pending', 'en_proceso', 'listo'];

export function useReminders() {
  const [state, setState] = useState({ items: [], loading: true });

  useEffect(
    () =>
      onSnapshot(
        collection(db, COLLECTION),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
          setState({ items, loading: false });
        },
        () => setState((s) => ({ ...s, loading: false }))
      ),
    []
  );

  return state;
}

export function useOpenRemindersCount() {
  const { items } = useReminders();
  return items.filter((r) => r.status === 'pending' || r.status === 'en_proceso').length;
}

export function createReminder(text, companySlug, agentName) {
  const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return setDoc(doc(db, COLLECTION, id), {
    text,
    company_slug: companySlug || null,
    created_by: agentName || 'Agente',
    created_at: new Date().toISOString(),
    status: 'pending',
    updated_by: null,
    updated_at: null,
  });
}

export function updateReminder(id, fields, agentName) {
  return setDoc(doc(db, COLLECTION, id), { ...fields, updated_by: agentName || 'Agente', updated_at: new Date().toISOString() }, { merge: true });
}

export function removeReminder(id) {
  return deleteDoc(doc(db, COLLECTION, id));
}

export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
