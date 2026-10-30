import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'qualityControl';

export const SATISFACTION = {
  good: { label: 'Bien', color: '#5fd39a' },
  neutral: { label: 'Regular', color: '#f2c94c' },
  bad: { label: 'Mal', color: '#ff8a7a' },
};

export function useQualityEntries(dateKey) {
  const [items, setItems] = useState([]);
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, COLLECTION), where('date_key', '==', dateKey)),
        (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))),
        () => {}
      ),
    [dateKey]
  );
  return items;
}

export function createQualityEntry(data, dateKey) {
  const id = `qc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return setDoc(doc(db, COLLECTION, id), {
    company_slug: data.company_slug,
    groomer_name: data.groomer_name || null,
    client_ordinal: Number(data.client_ordinal) || 1,
    contact_method: data.contact_method || 'llamada',
    satisfaction: data.satisfaction || null,
    feedback_text: data.feedback_text || '',
    review_requested: !!data.review_requested,
    rescheduled: !!data.rescheduled,
    reschedule_date: data.reschedule_date || null,
    created_by: data.created_by || 'Agente',
    created_at: new Date().toISOString(),
    date_key: dateKey,
  });
}

export function deleteQualityEntry(id) {
  return deleteDoc(doc(db, COLLECTION, id));
}

export function updateQualityEntry(id, data, agentName) {
  return setDoc(
    doc(db, COLLECTION, id),
    {
      groomer_name: data.groomer_name || null,
      client_ordinal: Number(data.client_ordinal) || 1,
      contact_method: data.contact_method || 'llamada',
      satisfaction: data.satisfaction || null,
      feedback_text: data.feedback_text || '',
      review_requested: !!data.review_requested,
      rescheduled: !!data.rescheduled,
      reschedule_date: data.reschedule_date || null,
      updated_by: agentName || 'Agente',
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
}
