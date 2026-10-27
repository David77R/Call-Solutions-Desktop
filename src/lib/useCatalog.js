import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import seedData from '../data/seedData.json';
import { flattenCatalog } from './search';

const OFFLINE_FALLBACK_MS = 6000;
const byName = (a, b) => a.name.localeCompare(b.name);

export function useCatalog() {
  const [state, setState] = useState({ companies: [], status: 'loading' });

  useEffect(() => {
    let settled = false;
    const useSeed = () => {
      settled = true;
      setState((s) => (s.companies.length ? { ...s, status: 'offline' } : { companies: [...seedData.companies].sort(byName), status: 'offline' }));
    };

    const timer = setTimeout(() => {
      if (!settled) useSeed();
    }, OFFLINE_FALLBACK_MS);

    const unsubscribe = onSnapshot(
      collection(db, 'priceCatalog'),
      { includeMetadataChanges: true },
      (snap) => {
        const fromCache = snap.metadata.fromCache;
        if (snap.empty) {
          if (!fromCache) useSeed();
          return;
        }
        settled = true;
        setState({ companies: snap.docs.map((d) => d.data()).sort(byName), status: fromCache ? 'offline' : 'live' });
      },
      useSeed
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const rows = useMemo(() => flattenCatalog(state.companies), [state.companies]);
  return { companies: state.companies, rows, status: state.status };
}
