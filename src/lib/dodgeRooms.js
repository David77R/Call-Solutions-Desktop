import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'catRooms';
const STALE_MS = 30 * 60 * 1000;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const DODGE_MAX = 10;
export const DODGE_TEAM_MAX = 5;
const roomId = (code) => `dodge-${code}`;
const sigId = (code, uid) => `dodge-${code}-sig-${uid}`;
const stamp = () => new Date().toISOString();

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

function makeCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
}

export async function createDodgeRoom(player, seed, options) {
  const code = makeCode();
  await withTimeout(
    setDoc(doc(db, COLLECTION, roomId(code)), {
      game: 'dodge',
      code,
      seed,
      status: 'waiting',
      host: player.uid,
      players: [{ ...player, team: 0 }],
      level: options.level,
      dynamic: options.dynamic,
      created_at: stamp(),
      updated_at: stamp(),
    }),
    8000,
  );
  return code;
}

export function joinDodgeRoom(code, player) {
  const ref = doc(db, COLLECTION, roomId(code.trim().toUpperCase()));
  const tx = runTransaction(db, async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists()) throw new Error('not-found');
    const room = snap.data();
    const players = room.players || [];
    if (players.some((p) => p.uid === player.uid)) return room.code;
    if (room.status !== 'waiting') throw new Error('taken');
    if (players.length >= DODGE_MAX) throw new Error('full');
    const count = [0, 1].map((team) => players.filter((p) => p.team === team).length);
    t.update(ref, { players: [...players, { ...player, team: count[0] <= count[1] ? 0 : 1 }], updated_at: stamp() });
    return room.code;
  });
  return withTimeout(tx, 10000);
}

export function switchDodgeTeam(code, uid) {
  const ref = doc(db, COLLECTION, roomId(code));
  return runTransaction(db, async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists()) return;
    const players = snap.data().players || [];
    const me = players.find((p) => p.uid === uid);
    if (!me) return;
    const target = 1 - me.team;
    if (players.filter((p) => p.team === target).length >= DODGE_TEAM_MAX) return;
    t.update(ref, { players: players.map((p) => (p.uid === uid ? { ...p, team: target } : p)), updated_at: stamp() });
  }).catch(() => {});
}

export function leaveDodgeRoom(code, uid) {
  const ref = doc(db, COLLECTION, roomId(code));
  return runTransaction(db, async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    if (room.host === uid) t.update(ref, { status: 'left', updated_at: stamp() });
    else t.update(ref, { players: (room.players || []).filter((p) => p.uid !== uid), updated_at: stamp() });
  }).catch(() => {});
}

export function setDodgeStatus(code, status) {
  return updateDoc(doc(db, COLLECTION, roomId(code)), { status, updated_at: stamp() }).catch(() => {});
}

export function writeDodgeSignal(code, uid, data) {
  return setDoc(doc(db, COLLECTION, sigId(code, uid)), { ...data, game: 'dodge-signal', updated_at: stamp() }, { merge: true }).catch(() => {});
}

export function watchDodgeSignal(code, uid, onData) {
  return onSnapshot(
    doc(db, COLLECTION, sigId(code, uid)),
    (snap) => snap.exists() && onData(snap.data()),
    () => {},
  );
}

export function useDodgeRoom(code) {
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

export function useOpenDodgeRooms(enabled) {
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
            .filter((r) => r.game === 'dodge' && now - Date.parse(r.updated_at || r.created_at || 0) < STALE_MS)
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
        );
      },
      () => setRooms([]),
    );
  }, [enabled]);
  return rooms;
}
