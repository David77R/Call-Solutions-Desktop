import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'catRooms';
const STALE_MS = 30 * 60 * 1000;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const roomId = (code) => `hockey-${code}`;

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

function makeCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
}

const stamp = () => new Date().toISOString();

export async function createHockeyRoom(player, seed) {
  const code = makeCode();
  await withTimeout(
    setDoc(doc(db, COLLECTION, roomId(code)), {
      game: 'hockey',
      code,
      seed,
      status: 'waiting',
      host: player,
      guest: null,
      offer: null,
      answer: null,
      created_at: stamp(),
      updated_at: stamp(),
    }),
    8000,
  );
  return code;
}

export function joinHockeyRoom(code, player) {
  const ref = doc(db, COLLECTION, roomId(code.trim().toUpperCase()));
  const tx = runTransaction(db, async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists()) throw new Error('not-found');
    const room = snap.data();
    if (room.host?.uid === player.uid) throw new Error('own-room');
    if (room.status !== 'waiting' || room.guest) throw new Error('taken');
    t.update(ref, { guest: player, status: 'connecting', updated_at: stamp() });
    return room.code;
  });
  return withTimeout(tx, 10000);
}

export function setHockeyOffer(code, offer) {
  return updateDoc(doc(db, COLLECTION, roomId(code)), { offer, updated_at: stamp() }).catch(() => {});
}

export function setHockeyAnswer(code, answer) {
  return updateDoc(doc(db, COLLECTION, roomId(code)), { answer, updated_at: stamp() }).catch(() => {});
}

export function setHockeyStatus(code, status) {
  return updateDoc(doc(db, COLLECTION, roomId(code)), { status, updated_at: stamp() }).catch(() => {});
}

export function useHockeyRoom(code) {
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

export function useOpenHockeyRooms(enabled) {
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
            .filter((r) => r.game === 'hockey' && now - Date.parse(r.updated_at || r.created_at || 0) < STALE_MS)
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
        );
      },
      () => setRooms([]),
    );
  }, [enabled]);
  return rooms;
}
