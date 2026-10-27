import { useSyncExternalStore } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { flattenCatalog } from './search';

const OFFLINE_FALLBACK_MS = 6000;
const byName = (a, b) => a.name.localeCompare(b.name);

let snapshot = { companies: [], rows: [], status: 'loading' };
let started = false;
const listeners = new Set();

function emit(next) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function setCompanies(companies, status) {
  emit({ companies, rows: flattenCatalog(companies), status });
}

function setStatus(status) {
  if (snapshot.status !== status) emit({ ...snapshot, status });
}

function start() {
  if (started) return;
  started = true;
  let settled = false;

  const useSeed = () => {
    settled = true;
    if (snapshot.companies.length) {
      setStatus('offline');
      return;
    }
    import('../data/seedData.json')
      .then(({ default: seed }) => {
        if (snapshot.companies.length) setStatus('offline');
        else setCompanies([...seed.companies].sort(byName), 'offline');
      })
      .catch(() => setStatus('offline'));
  };

  setTimeout(() => {
    if (!settled) useSeed();
  }, OFFLINE_FALLBACK_MS);

  onSnapshot(
    collection(db, 'priceCatalog'),
    { includeMetadataChanges: true },
    (snap) => {
      const fromCache = snap.metadata.fromCache;
      if (snap.empty) {
        if (!fromCache) useSeed();
        return;
      }
      settled = true;
      const status = fromCache ? 'offline' : 'live';
      if (snapshot.companies.length && !snap.docChanges().length) {
        setStatus(status);
        return;
      }
      setCompanies(snap.docs.map((d) => d.data()).sort(byName), status);
    },
    useSeed
  );
}

function subscribe(listener) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;

export function useCatalog() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
