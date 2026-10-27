import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { dateKeyFromDate, summaryMetrics } from './summaries';

export const METRICS = [
  { key: 'appointments', label: 'Citas nuevas', short: 'citas' },
  { key: 'calls', label: 'Llamadas recibidas', short: 'llamadas' },
  { key: 'messages', label: 'Mensajes', short: 'mensajes' },
  { key: 'completed', label: 'Citas realizadas', short: 'realizadas' },
  { key: 'booking', label: '% de agendamiento', short: '%', isRate: true },
];

export const GRAINS = [
  { key: 'day', label: 'Día' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKeyFromDate(d);
}

export function daysBetween(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / 86400000);
}

export function presetRange(preset, today) {
  const t = parseKey(today);
  if (preset === '7d') return { from: addDays(today, -6), to: today };
  if (preset === '30d') return { from: addDays(today, -29), to: today };
  if (preset === '90d') return { from: addDays(today, -89), to: today };
  if (preset === 'month') return { from: dateKeyFromDate(new Date(t.getFullYear(), t.getMonth(), 1)), to: today };
  if (preset === 'lastMonth') {
    return { from: dateKeyFromDate(new Date(t.getFullYear(), t.getMonth() - 1, 1)), to: dateKeyFromDate(new Date(t.getFullYear(), t.getMonth(), 0)) };
  }
  if (preset === 'year') return { from: `${t.getFullYear()}-01-01`, to: today };
  return null;
}

export function bucketKey(dateKey, grain) {
  if (grain === 'day') return dateKey;
  if (grain === 'month') return dateKey.slice(0, 7);
  const d = parseKey(dateKey);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateKeyFromDate(d);
}

export function bucketLabel(key, grain) {
  if (grain === 'month') {
    const [y, m] = key.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  }
  const d = parseKey(key);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return grain === 'week' ? `Sem. ${base}` : base;
}

export function bucketRange(key, grain) {
  if (grain === 'day') return [key, key];
  if (grain === 'week') return [key, addDays(key, 6)];
  const [y, m] = key.split('-').map(Number);
  return [`${key}-01`, dateKeyFromDate(new Date(y, m, 0))];
}

export function listBuckets(from, to, grain) {
  const keys = [];
  let cursor = bucketKey(from, grain);
  const last = bucketKey(to, grain);
  let guard = 0;
  while (cursor <= last && guard < 800) {
    keys.push(cursor);
    if (grain === 'day') cursor = addDays(cursor, 1);
    else if (grain === 'week') cursor = addDays(cursor, 7);
    else {
      const [y, m] = cursor.split('-').map(Number);
      cursor = dateKeyFromDate(new Date(y, m, 1)).slice(0, 7);
    }
    guard += 1;
  }
  return keys;
}

export function emptyTotals() {
  return { calls: 0, messages: 0, appointments: 0, completed: 0, entries: 0 };
}

export function addEntry(totals, entry) {
  const m = summaryMetrics(entry);
  totals.calls += m.calls;
  totals.messages += m.messages;
  totals.appointments += m.appointments;
  totals.completed += m.completed;
  totals.entries += 1;
  return totals;
}

export function metricValue(totals, metric) {
  if (metric === 'booking') {
    const base = totals.messages + totals.appointments;
    return base > 0 ? (totals.appointments / base) * 100 : null;
  }
  return totals[metric];
}

export function formatMetric(value, metric) {
  if (value == null) return '—';
  if (metric === 'booking') return `${value.toFixed(1)}%`;
  return Math.round(value).toLocaleString('es-VE');
}

export function useSummariesRange(from, to) {
  const [state, setState] = useState({ entries: [], loading: true, error: null });

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      query(collection(db, 'dailySummaries'), where('date_key', '>=', from), where('date_key', '<=', to)),
      (snap) => setState({ entries: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      (err) => setState((s) => ({ ...s, loading: false, error: err.code || 'error' }))
    );
  }, [from, to]);

  return state;
}

export function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function downloadFile(name, content, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
