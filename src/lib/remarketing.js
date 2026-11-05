import { useEffect, useState } from 'react';
import { collection, deleteField, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
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
      () => {},
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

export function useRemarketingHistory(slug) {
  const [state, setState] = useState({ days: [], loading: true, error: null });
  useEffect(() => {
    const ref = slug === 'all' ? collection(db, COLLECTION) : query(collection(db, COLLECTION), where('company_slug', '==', slug));
    return onSnapshot(
      ref,
      (snap) => {
        const days = snap.docs
          .map((d) => {
            const data = d.data();
            const [docSlug, ...rest] = d.id.split('_');
            const zips = Object.entries(data.zips || {})
              .filter(([, z]) => z?.done)
              .map(([zip, z]) => ({ zip, by: z.doneBy || 'Agente', at: z.doneAt || null }));
            return { slug: data.company_slug || docSlug, dateKey: data.date_key || rest.join('_'), zips };
          })
          .filter((d) => d.zips.length && REMARKETING_SLUGS.includes(d.slug))
          .sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : a.slug.localeCompare(b.slug)));
        setState({ days, loading: false, error: null });
      },
      (err) => setState({ days: [], loading: false, error: err.code || 'error' }),
    );
  }, [slug]);
  return state;
}
