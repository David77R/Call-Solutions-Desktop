import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { DAILY_PROTOCOL_ITEMS } from '../data/dailyProtocol';

const RESET_HOUR = 20;

export function protocolDayKey(now = new Date()) {
  const d = new Date(now);
  if (now.getHours() >= RESET_HOUR) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function minutesOf(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useProtocol() {
  const now = useNow();
  const dayKey = protocolDayKey(now);
  const [completions, setCompletions] = useState({});

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'dailyProtocol', dayKey),
        (snap) => setCompletions(snap.exists() ? snap.data().completions || {} : {}),
        () => {}
      ),
    [dayKey]
  );

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const overdue = DAILY_PROTOCOL_ITEMS.filter((i) => !completions[i.id] && minutesOf(i.time) <= nowMinutes).length;

  const toggle = (itemId, agentName) => {
    const next = { ...completions };
    if (next[itemId]) delete next[itemId];
    else next[itemId] = { at: new Date().toISOString(), by: agentName || null };
    setCompletions(next);
    return setDoc(doc(db, 'dailyProtocol', dayKey), { completions: next });
  };

  return { items: DAILY_PROTOCOL_ITEMS, completions, toggle, now, nowMinutes, overdue };
}

export function useProtocolAlerts(enabled) {
  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return undefined;
    const now = new Date();
    const timers = DAILY_PROTOCOL_ITEMS.map((item) => {
      const [h, m] = item.time.split(':').map(Number);
      const at = new Date(now);
      at.setHours(h, m, 0, 0);
      const wait = at - now;
      if (wait <= 0) return null;
      return setTimeout(() => {
        new Notification(`Protocolo ${item.time}`, { body: item.label, tag: `protocol-${item.id}` });
      }, wait);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [enabled]);
}
