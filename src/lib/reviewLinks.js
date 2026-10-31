import { useSyncExternalStore } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const REF = () => doc(db, 'messageTemplates', 'reviewLinks');

let snapshot = { links: {}, loaded: false };
let started = false;
const listeners = new Set();

function subscribe(listener) {
  if (!started) {
    started = true;
    onSnapshot(
      REF(),
      (snap) => {
        snapshot = { links: snap.exists() ? snap.data().links || {} : {}, loaded: true };
        listeners.forEach((l) => l());
      },
      () => {
        snapshot = { ...snapshot, loaded: true };
        listeners.forEach((l) => l());
      }
    );
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReviewLinks() {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export function saveReviewLinks(links) {
  const clean = Object.fromEntries(Object.entries(links).map(([k, v]) => [k, (v || '').trim()]).filter(([, v]) => v));
  const write = setDoc(REF(), { links: clean, updated_at: new Date().toISOString() });
  return Promise.race([write, new Promise((resolve) => setTimeout(resolve, 4000))]);
}
