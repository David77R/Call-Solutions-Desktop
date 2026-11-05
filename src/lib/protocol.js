import { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
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

export function useProtocolDay(dayKey) {
  const [data, setData] = useState({ completions: {}, agents: {} });
  const [sync, setSync] = useState({ fromCache: true, error: null });
  useEffect(
    () =>
      onSnapshot(
        doc(db, 'dailyProtocol', dayKey),
        { includeMetadataChanges: true },
        (snap) => {
          const raw = snap.exists() ? snap.data() : {};
          setData({ completions: raw.completions || {}, agents: raw.agents || {} });
          setSync({ fromCache: snap.metadata.fromCache, error: null });
        },
        (err) => setSync({ fromCache: true, error: err.code || 'error' }),
      ),
    [dayKey],
  );
  return { ...data, sync };
}

export function useProtocol() {
  const { user } = useAuth();
  const uid = user?.uid || null;
  const now = useNow();
  const dayKey = protocolDayKey(now);
  const { completions: team, agents, sync } = useProtocolDay(dayKey);
  const [optimistic, setOptimistic] = useState({});

  useEffect(() => setOptimistic({}), [agents, dayKey]);

  const myName = user?.displayName || user?.email || 'Agente';
  const mine = { ...(agents[uid]?.items || {}), ...optimistic };
  const completions = {};
  Object.entries(mine).forEach(([id, at]) => {
    if (at) completions[id] = { at, by: myName };
  });

  const afterReset = now.getHours() >= RESET_HOUR;
  const nowMinutes = afterReset ? -1 : now.getHours() * 60 + now.getMinutes();
  const overdue = DAILY_PROTOCOL_ITEMS.filter((i) => !completions[i.id] && minutesOf(i.time) <= nowMinutes).length;

  const toggle = (itemId) => {
    if (!uid) return Promise.resolve();
    const done = !!completions[itemId];
    const at = new Date().toISOString();
    setOptimistic((current) => ({ ...current, [itemId]: done ? null : at }));
    const othersHaveIt = Object.entries(agents).some(([id, a]) => id !== uid && a?.items?.[itemId]);
    const teamUpdate = {};
    if (!done && !team[itemId]) teamUpdate[itemId] = { at, by: myName, byUid: uid };
    if (done && team[itemId]?.byUid === uid && !othersHaveIt) teamUpdate[itemId] = deleteField();
    return setDoc(
      doc(db, 'dailyProtocol', dayKey),
      {
        agents: { [uid]: { name: myName, updated_at: at, items: { [itemId]: done ? deleteField() : at } } },
        ...(Object.keys(teamUpdate).length ? { completions: teamUpdate } : {}),
      },
      { merge: true },
    ).catch(() => {});
  };

  return { items: DAILY_PROTOCOL_ITEMS, completions, team, toggle, now, nowMinutes, overdue, sync, dayKey, afterReset };
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
