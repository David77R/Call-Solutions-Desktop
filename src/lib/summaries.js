import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'dailySummaries';

export function dateKeyFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayKey() {
  return dateKeyFromDate(new Date());
}

function dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function labelFromDateKey(key) {
  return dateFromKey(key).toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function shortLabel(key) {
  return dateFromKey(key).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
}

export function shiftDateKey(key, days) {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + days);
  return dateKeyFromDate(d);
}

export function sumGroomerField(groomers, field, absentFlag) {
  if (!groomers || !groomers.length) return 0;
  return groomers.reduce((sum, g) => (absentFlag && g[absentFlag] ? sum : sum + (Number(g[field]) || 0)), 0);
}

export function summaryMetrics(entry) {
  if (!entry) return { calls: 0, messages: 0, appointments: 0, completed: 0, confirmed: 0, bookingPct: 0, hasGroomers: false };
  const hasGroomers = !!entry.groomers?.length;
  const messages = entry.messagesCombined ? Number(entry.messagesMeta || 0) : Number(entry.messagesMeta || 0) + Number(entry.messagesWhatsapp || 0);
  const appointments = Number(entry.newAppointments || 0);
  const total = messages + appointments;
  return {
    calls: Number(entry.calls || 0),
    messages,
    appointments,
    completed: hasGroomers ? sumGroomerField(entry.groomers, 'completedCount', 'absentToday') : 0,
    confirmed: hasGroomers ? sumGroomerField(entry.groomers, 'confirmedCount', 'absentTomorrow') : Number(entry.confirmedTomorrow || 0),
    bookingPct: total > 0 ? Math.round((appointments / total) * 100) : 0,
    hasGroomers,
  };
}

export async function saveSummary(company, authorName, data, dateKey = todayKey()) {
  const entry = {
    company_slug: company.slug,
    company_name: company.name,
    author_name: authorName,
    date_key: dateKey,
    date_label: labelFromDateKey(dateKey),
    saved_at: new Date().toISOString(),
    ...data,
  };
  await setDoc(doc(db, COLLECTION, `${company.slug}_${dateKey}`), entry);
  return entry;
}

export function deleteSummary(entry) {
  return deleteDoc(doc(db, COLLECTION, `${entry.company_slug}_${entry.date_key}`));
}

function useSummaryQuery(field, value) {
  const [state, setState] = useState({ items: [], loading: true });

  useEffect(() => {
    if (!value) return undefined;
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      query(collection(db, COLLECTION), where(field, '==', value)),
      (snap) => {
        const items = snap.docs.map((d) => d.data()).sort((a, b) => (a.date_key < b.date_key ? 1 : -1));
        setState({ items, loading: false });
      },
      () => setState((s) => ({ ...s, loading: false }))
    );
  }, [field, value]);

  return state;
}

export function useCompanySummaries(slug) {
  return useSummaryQuery('company_slug', slug);
}

export function useDateSummaries(dateKey) {
  return useSummaryQuery('date_key', dateKey);
}

export function printHtml(html) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const docRef = frame.contentWindow.document;
  docRef.open();
  docRef.write(html);
  docRef.close();
  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1500);
  }, 250);
}

export function whatsappLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
