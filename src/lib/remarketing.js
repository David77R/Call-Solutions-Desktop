import { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'remarketingProgress';
export const REMARKETING_SLUGS = ['famous', 'mayami', 'abbie', 'tinis'];

export function useZoneProgress(slug, dateKey) {
  const [zips, setZips] = useState({});
  useEffect(() => {
    if (!slug) return undefined;
    return onSnapshot(
      doc(db, COLLECTION, `${slug}_${dateKey}`),
      (snap) => setZips(snap.exists() ? snap.data().zips || {} : {}),
      () => {}
    );
  }, [slug, dateKey]);
  return [zips, setZips];
}

export function toggleZone(slug, dateKey, zip, currentlyDone, agentName) {
  const entry = { done: !currentlyDone, doneBy: agentName || 'Agente', doneAt: new Date().toISOString() };
  setDoc(doc(db, COLLECTION, `${slug}_${dateKey}`), { company_slug: slug, date_key: dateKey, zips: { [zip]: entry } }, { merge: true }).catch(() => {});
  return entry;
}

export function resetZones(slug, dateKey, zipList) {
  if (!zipList.length) return Promise.resolve();
  const updates = {};
  zipList.forEach((z) => {
    updates[`zips.${z}`] = deleteField();
  });
  return updateDoc(doc(db, COLLECTION, `${slug}_${dateKey}`), updates).catch(() => {});
}
