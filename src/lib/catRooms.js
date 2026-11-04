import { useEffect, useState } from 'react';
import { arrayUnion, collection, doc, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'catRooms';
const STALE_MS = 30 * 60 * 1000;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

function makeCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
}

export async function createRoom(player, seed, arena) {
  const code = makeCode();
  const now = new Date().toISOString();
  const write = setDoc(doc(db, COLLECTION, code), {
    code,
    seed,
    arena,
    status: 'waiting',
    host: player,
    guest: null,
    shots: [],
    state: null,
    created_at: now,
    updated_at: now,
  });
  await withTimeout(write, 8000);
  return code;
}

export async function joinRoom(code, player) {
  const ref = doc(db, COLLECTION, code.trim().toUpperCase());
  const tx = runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('not-found');
    const room = snap.data();
    if (room.host?.uid === player.uid) throw new Error('own-room');
    if (room.status !== 'waiting' || room.guest) throw new Error('taken');
    tx.update(ref, { guest: player, status: 'playing', updated_at: new Date().toISOString() });
    return room.code;
  });
  return withTimeout(tx, 10000);
}

export function useRoom(code) {
  const [room, setRoom] = useState(null);
  useEffect(() => {
    if (!code) {
      setRoom(null);
      return undefined;
    }
    return onSnapshot(
      doc(db, COLLECTION, code),
      (snap) => setRoom(snap.exists() ? snap.data() : { missing: true }),
      () => setRoom({ error: true }),
    );
  }, [code]);
  return room;
}

export function useOpenRooms(enabled) {
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
            .filter((r) => !r.game && now - Date.parse(r.updated_at || r.created_at || 0) < STALE_MS)
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
        );
      },
      () => setRooms([]),
    );
  }, [enabled]);
  return rooms;
}

export function pushShot(code, shot) {
  return updateDoc(doc(db, COLLECTION, code), { shots: arrayUnion(shot), updated_at: new Date().toISOString() }).catch(() => {});
}

export function pushState(code, state) {
  return updateDoc(doc(db, COLLECTION, code), { state, updated_at: new Date().toISOString() }).catch(() => {});
}

export function finishRoom(code, winner) {
  return updateDoc(doc(db, COLLECTION, code), { status: 'over', winner, updated_at: new Date().toISOString() }).catch(() => {});
}

export function leaveRoom(code, uid) {
  return updateDoc(doc(db, COLLECTION, code), { status: 'left', left_by: uid, updated_at: new Date().toISOString() }).catch(() => {});
}
