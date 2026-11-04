import { useSyncExternalStore } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { flattenCatalog } from './search';

const OFFLINE_FALLBACK_MS = 6000;
let seedCompanies = null;

function loadSeed() {
  if (!seedCompanies) seedCompanies = import('../data/seedData.json').then(({ default: seed }) => seed.companies);
  return seedCompanies;
}

function withNewSeedCompanies(companies, seed) {
  const known = new Set(companies.map((c) => c.slug));
  const extra = (seed || []).filter((c) => !known.has(c.slug)).map((c) => ({ ...c, seed_only: true }));
  return [...companies, ...extra].sort(byName);
}
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
      const live = snap.docs.map((d) => d.data());
      setCompanies(live.sort(byName), status);
      loadSeed()
        .then((seed) => {
          const merged = withNewSeedCompanies(live, seed);
          if (merged.length !== live.length) setCompanies(merged, status);
        })
        .catch(() => {});
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
