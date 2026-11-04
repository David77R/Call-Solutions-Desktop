import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'catRooms';
const STALE_MS = 30 * 60 * 1000;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const MAX_PLAYERS = 4;

const roomId = (code) => `bomb-${code}`;
const playerId = (code, slot) => `bomb-${code}-${slot}`;

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

function makeCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
}

export async function createBombRoom(player, seed) {
  const code = makeCode();
  const now = new Date().toISOString();
  const write = setDoc(doc(db, COLLECTION, roomId(code)), {
    game: 'bomb',
    code,
    seed,
    status: 'waiting',
    host: player.uid,
    players: [{ ...player, slot: 0 }],
    created_at: now,
    updated_at: now,
  });
  await withTimeout(write, 8000);
  return code;
}

export function joinBombRoom(code, player) {
  const ref = doc(db, COLLECTION, roomId(code.trim().toUpperCase()));
  const tx = runTransaction(db, async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists()) throw new Error('not-found');
    const room = snap.data();
    const players = room.players || [];
    if (players.some((p) => p.uid === player.uid)) return room.code;
    if (room.status !== 'waiting') throw new Error('taken');
    if (players.length >= MAX_PLAYERS) throw new Error('full');
    const used = new Set(players.map((p) => p.slot));
    const slot = [0, 1, 2, 3].find((s) => !used.has(s));
    t.update(ref, { players: [...players, { ...player, slot }], updated_at: new Date().toISOString() });
    return room.code;
  });
  return withTimeout(tx, 10000);
}

export function leaveBombRoom(code, uid) {
  const ref = doc(db, COLLECTION, roomId(code));
  return runTransaction(db, async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    if (room.status !== 'waiting') return;
    if (room.host === uid) t.update(ref, { status: 'left', updated_at: new Date().toISOString() });
    else t.update(ref, { players: (room.players || []).filter((p) => p.uid !== uid), updated_at: new Date().toISOString() });
  }).catch(() => {});
}

export function startBombRoom(code) {
  return updateDoc(doc(db, COLLECTION, roomId(code)), { status: 'playing', started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).catch(() => {});
}

export function finishBombRoom(code, winner) {
  return updateDoc(doc(db, COLLECTION, roomId(code)), { status: 'over', winner, updated_at: new Date().toISOString() }).catch(() => {});
}

export function useBombRoom(code) {
  const [room, setRoom] = useState(null);
  useEffect(() => {
    if (!code) {
      setRoom(null);
      return undefined;
    }
    return onSnapshot(
      doc(db, COLLECTION, roomId(code)),
      (snap) => setRoom(snap.exists() ? snap.data() : { missing: true }),
      () => setRoom({ error: true }),
    );
  }, [code]);
  return room;
}

export function useOpenBombRooms(enabled) {
  const [rooms, setRooms] = useState([]);
  useEffect(() => {
    if (!enabled) return undefined;
    return onSnapshot(
      query(collection(db, COLLECTION), where('status', '==', 'waiting')),
      (snap) => {
        const now = Date.now();
        setRooms(
          snap.docs
            .map((d) => d.data())
            .filter((r) => r.game === 'bomb' && now - Date.parse(r.updated_at || r.created_at || 0) < STALE_MS)
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
        );
      },
      () => setRooms([]),
    );
  }, [enabled]);
  return rooms;
}

export function pushBombPlayer(code, slot, data) {
  return setDoc(doc(db, COLLECTION, playerId(code, slot)), { ...data, game: 'bomb-player', updated_at: new Date().toISOString() }, { merge: true }).catch(() => {});
}

export function watchBombPlayer(code, slot, onData) {
  return onSnapshot(
    doc(db, COLLECTION, playerId(code, slot)),
    (snap) => snap.exists() && onData(snap.data()),
    () => {},
  );
}
